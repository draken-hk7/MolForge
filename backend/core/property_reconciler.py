"""Reconcile local ML predictions with Materials Project records."""

from __future__ import annotations

from typing import Any


ML_TO_MP_KEYS = {
    "bandgap_ev": "band_gap",
    "hardness_gpa": "bulk_modulus",
    "refractive_index": "n",
}

MP_ONLY_KEYS = [
    "density",
    "formation_energy_per_atom",
    "energy_above_hull",
    "volume",
    "nsites",
    "bulk_modulus",
    "shear_modulus",
    "e_total",
    "total_magnetization",
]


class PropertyReconciler:
    """Combine local ML predictions with Materials Project material data."""

    def reconcile(self, ml_predictions: dict[str, Any], mp_data: list[dict[str, Any]], formula: str | None = None) -> dict[str, Any]:
        """Reconcile ML predictions and Materials Project material summaries.

        Args:
            ml_predictions: Local ML prediction dictionary.
            mp_data: Materials Project material summaries.
            formula: Optional formula used to choose the best exact match.

        Returns:
            Enriched prediction structure with ML, MP, best match, and deltas.
        """
        best_match = self._find_best_match(formula or "", mp_data)
        reconciled: dict[str, dict[str, Any]] = {}
        for ml_key, payload in ml_predictions.items():
            ml_value = self._extract_ml_value(payload)
            mp_key = ML_TO_MP_KEYS.get(ml_key)
            mp_value = best_match.get(mp_key) if best_match and mp_key else None
            output_key = mp_key or ml_key
            reconciled[output_key] = {
                "ml": ml_value,
                "mp": mp_value,
                "delta": self._compute_delta(ml_value, mp_value),
                "source": "mp" if mp_value is not None else "ml",
                "ml_key": ml_key,
                "mp_key": mp_key,
            }
        if best_match:
            for mp_key in MP_ONLY_KEYS:
                if mp_key not in reconciled and best_match.get(mp_key) is not None:
                    reconciled[mp_key] = {
                        "ml": None,
                        "mp": best_match.get(mp_key),
                        "delta": None,
                        "source": "mp",
                        "ml_key": None,
                        "mp_key": mp_key,
                    }
        if best_match:
            data_quality = "mp_verified"
        elif ml_predictions:
            data_quality = "ml_only"
        else:
            data_quality = "no_data"
        return {
            "ml_predictions": ml_predictions,
            "mp_materials": mp_data,
            "best_match": best_match,
            "reconciled": reconciled,
            "data_quality": data_quality,
            "mp_material_id": best_match.get("material_id") if best_match else None,
        }

    def _find_best_match(self, formula: str, mp_materials: list[dict[str, Any]]) -> dict[str, Any] | None:
        """Find the most stable matching Materials Project material.

        Args:
            formula: Formula string used for exact matching when provided.
            mp_materials: Candidate material summaries.

        Returns:
            Best matching material or None.
        """
        if not mp_materials:
            return None
        formula = str(formula or "").strip()
        candidates = [
            material
            for material in mp_materials
            if not formula or str(material.get("formula_pretty") or "").replace(" ", "") == formula.replace(" ", "")
        ]
        if not candidates:
            candidates = mp_materials
        return sorted(candidates, key=lambda material: self._sort_value(material.get("energy_above_hull")))[0]

    def _compute_delta(self, ml_value: Any, mp_value: Any) -> float | None:
        """Compute percentage difference between ML and MP values.

        Args:
            ml_value: Local ML scalar value.
            mp_value: Materials Project scalar value.

        Returns:
            Percentage difference or None.
        """
        try:
            ml_numeric = float(ml_value)
            mp_numeric = float(mp_value)
        except (TypeError, ValueError):
            return None
        denominator = abs(mp_numeric) if abs(mp_numeric) > 1.0e-12 else 1.0
        return round(((ml_numeric - mp_numeric) / denominator) * 100.0, 4)

    def _extract_ml_value(self, payload: Any) -> float | None:
        """Extract a scalar value from a prediction payload.

        Args:
            payload: Prediction payload or scalar.

        Returns:
            Scalar value when available.
        """
        if isinstance(payload, dict):
            payload = payload.get("value")
        try:
            return float(payload)
        except (TypeError, ValueError):
            return None

    def _sort_value(self, value: Any) -> float:
        """Convert values for stability sorting.

        Args:
            value: Raw numeric value.

        Returns:
            Sortable float.
        """
        try:
            return float(value)
        except (TypeError, ValueError):
            return 1.0e9
