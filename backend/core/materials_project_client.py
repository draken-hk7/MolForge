"""Materials Project API client with graceful local fallback behavior."""

from __future__ import annotations

import logging
import os
import time
from collections import Counter
from typing import Any

from .molecule_parser import Chem, MoleculeParser, rdMolDescriptors

try:
    import requests
except Exception:
    requests = None


LOGGER = logging.getLogger(__name__)

SUMMARY_FIELDS = [
    "material_id",
    "formula_pretty",
    "band_gap",
    "formation_energy_per_atom",
    "energy_above_hull",
    "density",
    "volume",
    "nsites",
    "symmetry",
    "is_stable",
    "theoretical",
    "total_magnetization",
    "ordering",
]


class MaterialsProjectClient:
    """Small REST client for Materials Project summary, elasticity, and dielectric data."""

    def __init__(self, api_key: str | None = None, ttl_seconds: int = 3600) -> None:
        """Initialize a Materials Project client.

        Args:
            api_key: Optional Materials Project API key. If omitted, MP_API_KEY is used.
            ttl_seconds: Cache time-to-live in seconds.

        Returns:
            None.
        """
        env_key = os.getenv("MP_API_KEY", "").strip()
        self.api_key = (api_key or env_key).strip() if (api_key or env_key) else ""
        self.base_url = "https://api.materialsproject.org"
        self.ttl_seconds = ttl_seconds
        self.cache: dict[str, tuple[float, Any]] = {}
        self.parser = MoleculeParser()
        self.available = bool(self.api_key) and requests is not None
        self.session = requests.Session() if requests is not None else None
        if self.session is not None and self.api_key:
            self.session.headers.update({"X-API-KEY": self.api_key})
            self.session.headers.update({"User-Agent": "MolForge/1.0"})

    def search_by_formula(self, formula: str) -> list[dict[str, Any]]:
        """Search Materials Project materials by exact formula.

        Args:
            formula: Formula string such as SiO2 or C2H6O.

        Returns:
            Material summaries sorted by energy above hull.
        """
        formula = str(formula or "").strip()
        if not formula or not self.available:
            return []
        cache_key = f"formula:{formula}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        rows = self._summary_search({"formula": formula, "_fields": ",".join(SUMMARY_FIELDS)})
        rows.sort(key=lambda item: self._sort_value(item.get("energy_above_hull")))
        self._set_cached(cache_key, rows)
        return rows

    def search_by_elements(self, elements: list[str]) -> list[dict[str, Any]]:
        """Search materials containing all specified elements.

        Args:
            elements: Element symbols to include in the chemical system.

        Returns:
            Top 20 material summaries sorted by thermodynamic stability.
        """
        clean_elements = sorted({str(element).strip().capitalize() for element in elements if str(element).strip()})
        if not clean_elements or not self.available:
            return []
        cache_key = f"elements:{'-'.join(clean_elements)}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        rows = self._summary_search({"chemsys": "-".join(clean_elements), "_fields": ",".join(SUMMARY_FIELDS), "_limit": 20})
        rows.sort(key=lambda item: self._sort_value(item.get("energy_above_hull")))
        result = rows[:20]
        self._set_cached(cache_key, result)
        return result

    def get_material_by_id(self, material_id: str) -> dict[str, Any] | None:
        """Fetch one material summary by Materials Project id.

        Args:
            material_id: Materials Project material id, such as mp-149.

        Returns:
            Material summary dictionary or None.
        """
        material_id = str(material_id or "").strip()
        if not material_id or not self.available:
            return None
        cache_key = f"material:{material_id}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        payload = self._request_json("/materials/summary/", {"material_ids": material_id, "_fields": ",".join(SUMMARY_FIELDS)})
        data = self._extract_data(payload)
        item = data[0] if isinstance(data, list) and data else data if isinstance(data, dict) else None
        normalized = self._normalize_material(item) if item else None
        self._set_cached(cache_key, normalized)
        return normalized

    def get_elasticity(self, material_id: str) -> dict[str, Any] | None:
        """Fetch elasticity data for one material.

        Args:
            material_id: Materials Project material id.

        Returns:
            Elasticity fields or None when unavailable.
        """
        if not material_id or not self.available:
            return None
        cache_key = f"elasticity:{material_id}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        payload = self._request_json("/materials/elasticity/", {"material_id": material_id})
        rows = self._extract_data(payload)
        item = rows[0] if isinstance(rows, list) and rows else rows if isinstance(rows, dict) else None
        result = None
        if item:
            result = {
                "bulk_modulus": self._first_present(item, ["bulk_modulus", "k_vrh", "k_voigt", "k_reuss"]),
                "shear_modulus": self._first_present(item, ["shear_modulus", "g_vrh", "g_voigt", "g_reuss"]),
                "universal_anisotropy": self._first_present(item, ["universal_anisotropy", "elastic_anisotropy"]),
                "poisson_ratio": self._first_present(item, ["poisson_ratio", "homogeneous_poisson"]),
            }
        self._set_cached(cache_key, result)
        return result

    def get_dielectric(self, material_id: str) -> dict[str, Any] | None:
        """Fetch dielectric data for one material.

        Args:
            material_id: Materials Project material id.

        Returns:
            Dielectric fields or None when unavailable.
        """
        if not material_id or not self.available:
            return None
        cache_key = f"dielectric:{material_id}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        payload = self._request_json("/materials/dielectric/", {"material_id": material_id})
        rows = self._extract_data(payload)
        item = rows[0] if isinstance(rows, list) and rows else rows if isinstance(rows, dict) else None
        result = None
        if item:
            result = {
                "e_total": self._first_present(item, ["e_total"]),
                "e_ionic": self._first_present(item, ["e_ionic"]),
                "e_electronic": self._first_present(item, ["e_electronic"]),
                "n": self._first_present(item, ["n"]),
            }
        self._set_cached(cache_key, result)
        return result

    def smiles_to_formula(self, smiles: str) -> str:
        """Convert SMILES to a Hill-notation formula.

        Args:
            smiles: SMILES string to convert.

        Returns:
            Molecular formula such as C2H6O.

        Raises:
            ValueError: If the SMILES string cannot be parsed.
        """
        smiles = str(smiles or "").strip()
        if Chem is not None and rdMolDescriptors is not None:
            mol = self.parser._rdkit_mol(smiles)
            return rdMolDescriptors.CalcMolFormula(Chem.AddHs(mol))
        atoms = self.parser._fallback_atoms(smiles)
        counts = Counter(atom.symbol for atom in atoms)
        hydrogens = self._estimate_hydrogens(atoms)
        if hydrogens:
            counts["H"] += hydrogens
        return self._hill_formula(counts)

    def get_status(self) -> dict[str, Any]:
        """Return client availability and cache state.

        Args:
            None.

        Returns:
            Status payload without exposing the API key.
        """
        return {
            "available": bool(self.available),
            "key_set": bool(self.api_key),
            "cache_size": len(self.cache),
        }

    def clear_cache(self) -> None:
        """Clear the in-memory Materials Project cache.

        Args:
            None.

        Returns:
            None.
        """
        self.cache.clear()

    def validate_connection(self) -> tuple[bool, str]:
        """Validate the configured API key with a small summary query.

        Args:
            None.

        Returns:
            A tuple of validation result and message.
        """
        if not self.api_key:
            return False, "Materials Project API key is not set."
        if requests is None or self.session is None:
            return False, "requests is not installed in this Python environment."
        try:
            payload = self._request_json("/materials/summary/", {"formula": "Si", "_fields": "material_id,formula_pretty", "_limit": 1})
            if payload is None:
                return False, "Materials Project did not return a validation response."
            return True, "Materials Project API key validated for this session."
        except Exception as exc:
            LOGGER.warning("Materials Project key validation failed: %s", exc)
            return False, "Materials Project API key validation failed."

    def _summary_search(self, params: dict[str, Any]) -> list[dict[str, Any]]:
        """Execute a summary search request.

        Args:
            params: Query string parameters.

        Returns:
            Normalized material summaries.
        """
        payload = self._request_json("/materials/summary/", params)
        rows = self._extract_data(payload)
        if not isinstance(rows, list):
            return []
        return [self._normalize_material(row) for row in rows if isinstance(row, dict)]

    def _request_json(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any] | list[Any] | None:
        """Perform a GET request against the Materials Project API.

        Args:
            path: API path starting with a slash.
            params: Optional query parameters.

        Returns:
            Decoded JSON payload or None on failure.
        """
        if not self.available or self.session is None:
            return None
        url = f"{self.base_url}{path}"
        try:
            response = self.session.get(url, params=params or {}, timeout=5)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            safe_path = path.split("?")[0]
            LOGGER.warning("Materials Project request failed for %s: %s", safe_path, exc)
            return None

    def _extract_data(self, payload: dict[str, Any] | list[Any] | None) -> Any:
        """Extract data from a Materials Project REST payload.

        Args:
            payload: Decoded JSON payload.

        Returns:
            The data member when present, otherwise the original payload.
        """
        if isinstance(payload, dict) and "data" in payload:
            return payload.get("data")
        return payload

    def _normalize_material(self, item: dict[str, Any]) -> dict[str, Any]:
        """Normalize MP API field variants into stable MolForge keys.

        Args:
            item: Raw Materials Project material dictionary.

        Returns:
            Normalized material summary.
        """
        symmetry = item.get("symmetry") if isinstance(item.get("symmetry"), dict) else {}
        spacegroup = item.get("spacegroup") or {
            "symbol": symmetry.get("symbol"),
            "number": symmetry.get("number"),
        }
        if not isinstance(spacegroup, dict):
            spacegroup = {"symbol": str(spacegroup), "number": None}
        normalized = {
            "material_id": str(item.get("material_id") or ""),
            "formula_pretty": item.get("formula_pretty"),
            "band_gap": item.get("band_gap"),
            "formation_energy_per_atom": self._first_present(item, ["formation_energy_per_atom", "formation_energy"]),
            "energy_above_hull": item.get("energy_above_hull"),
            "density": item.get("density"),
            "volume": item.get("volume"),
            "nsites": self._first_present(item, ["nsites", "num_sites"]),
            "crystal_system": item.get("crystal_system") or symmetry.get("crystal_system"),
            "spacegroup": spacegroup,
            "is_stable": item.get("is_stable"),
            "theoretical": item.get("theoretical"),
            "bulk_modulus": self._first_present(item, ["bulk_modulus", "k_vrh"]),
            "shear_modulus": self._first_present(item, ["shear_modulus", "g_vrh"]),
            "universal_anisotropy": self._first_present(item, ["universal_anisotropy", "elastic_anisotropy"]),
            "homogeneous_poisson": self._first_present(item, ["homogeneous_poisson", "poisson_ratio"]),
            "e_total": item.get("e_total"),
            "n": item.get("n"),
            "ordering": str(item.get("ordering")) if item.get("ordering") is not None else None,
            "total_magnetization": item.get("total_magnetization"),
        }
        return normalized

    def _get_cached(self, key: str) -> Any:
        """Read a non-expired cache value.

        Args:
            key: Cache key.

        Returns:
            Cached value or None.
        """
        cached = self.cache.get(key)
        if cached is None:
            return None
        timestamp, value = cached
        if time.time() - timestamp > self.ttl_seconds:
            self.cache.pop(key, None)
            return None
        return value

    def _set_cached(self, key: str, value: Any) -> None:
        """Store a cache value with the current timestamp.

        Args:
            key: Cache key.
            value: Value to cache.

        Returns:
            None.
        """
        self.cache[key] = (time.time(), value)

    def _first_present(self, item: dict[str, Any], keys: list[str]) -> Any:
        """Return the first non-null value for a set of keys.

        Args:
            item: Source dictionary.
            keys: Candidate keys in priority order.

        Returns:
            The first value that is not None.
        """
        for key in keys:
            value = item.get(key)
            if value is not None:
                return value
        return None

    def _sort_value(self, value: Any) -> float:
        """Convert sortable values while putting missing values last.

        Args:
            value: Raw value.

        Returns:
            Numeric sort value.
        """
        try:
            return float(value)
        except (TypeError, ValueError):
            return 1.0e9

    def _estimate_hydrogens(self, atoms: list[Any]) -> int:
        """Estimate implicit hydrogens for simple fallback formula generation.

        Args:
            atoms: Fallback atom tokens.

        Returns:
            Estimated hydrogen count.
        """
        valence = {"C": 4, "N": 3, "O": 2, "S": 2, "P": 3, "Si": 4, "B": 3, "F": 1, "Cl": 1, "Br": 1, "I": 1}
        if len(atoms) == 1:
            return max(0, valence.get(atoms[0].symbol, 0))
        hydrogens = 0
        for idx, atom in enumerate(atoms):
            bond_count = 0
            if idx > 0:
                bond_count += 1
            if idx < len(atoms) - 1:
                bond_count += 1
            hydrogens += max(0, valence.get(atom.symbol, 0) - bond_count)
        return hydrogens

    def _hill_formula(self, counts: Counter[str]) -> str:
        """Render element counts in Hill notation.

        Args:
            counts: Element count mapping.

        Returns:
            Formula string.
        """
        ordered: list[str] = []
        if counts.get("C"):
            ordered.append("C")
        if counts.get("H"):
            ordered.append("H")
        ordered.extend(sorted(element for element in counts if element not in {"C", "H"}))
        return "".join(f"{element}{'' if counts[element] == 1 else counts[element]}" for element in ordered if counts[element] > 0)
