"""Inverse material design through deterministic mutation search."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .molecule_parser import MoleculeParser
from .property_predictor import PROPERTY_RANGES, PropertyPredictor

try:
    from skopt import gp_minimize
    from skopt.space import Integer
except Exception:
    gp_minimize = None
    Integer = None


DRUG_LIKE_SEED_SMILES = [
    "CCO",
    "CCCO",
    "CCCCO",
    "CC(=O)O",
    "CCN",
    "CCCN",
    "CCOC",
    "CC(C)O",
    "c1ccccc1",
    "Cc1ccccc1",
    "Oc1ccccc1",
    "Nc1ccccc1",
    "FC1=CC=CC=C1",
    "Clc1ccccc1",
    "Brc1ccccc1",
    "O=C(O)c1ccccc1",
    "CC(=O)Nc1ccccc1",
    "COc1ccccc1",
    "CCOC(=O)c1ccccc1",
    "CC(C)Cc1ccccc1",
    "CCN(CC)CC",
    "CC(C)N",
    "CC(C)(C)O",
    "C1CCCCC1",
    "C1CCNCC1",
    "C1COCCN1",
    "CC1=CC=CC=C1O",
    "CCOC(=O)N",
    "NC(=O)C",
    "O=C(N)N",
    "CCS",
    "CC(C)S",
    "CNC",
    "CN(C)C",
    "CC(C)(C)C",
    "O=C1NC=CC=C1",
    "N#Cc1ccccc1",
    "CC#N",
    "C=CCO",
    "CC(C)=O",
    "CC(C)C(=O)O",
    "CC(C)C(N)=O",
    "COC(=O)C",
    "CCOC(=O)C",
    "CC(C)CO",
    "NCCO",
    "OCCO",
    "CNC(=O)C",
    "CC(C)Cl",
    "CC(C)Br",
]


class InverseDesignEngine:
    """Search for candidate molecules that match a requested target property."""

    SUPPORTED_PROPERTIES = {"bandgap_ev", "melting_point_k", "hardness_gpa", "solubility_logS"}

    def __init__(
        self,
        predictor: PropertyPredictor | None = None,
        parser: MoleculeParser | None = None,
        sample_data_path: str | Path | None = None,
    ) -> None:
        """Initialize the inverse design engine.

        Args:
            predictor: Property predictor to use for scoring candidates.
            parser: Molecule parser to use for mutations and descriptors.
            sample_data_path: Optional path to JSON sample molecule records.

        Returns:
            None.
        """
        self.parser = parser or MoleculeParser()
        self.predictor = predictor or PropertyPredictor(parser=self.parser)
        self.sample_data_path = Path(sample_data_path) if sample_data_path else Path(__file__).resolve().parents[1] / "data" / "sample_molecules.json"

    def optimize(self, target_property: str, target_value: float, n_candidates: int = 5) -> list[dict[str, Any]]:
        """Find candidate molecules whose predicted property approaches a target.

        Args:
            target_property: Supported property key to optimize.
            target_value: Desired scalar value for the target property.
            n_candidates: Number of candidate molecules to return.

        Returns:
            Ranked candidates containing SMILES, predicted value, score, and descriptors.

        Raises:
            ValueError: If the target property or candidate count is invalid.
        """
        if target_property not in self.SUPPORTED_PROPERTIES:
            supported = ", ".join(sorted(self.SUPPORTED_PROPERTIES))
            raise ValueError(f"Unsupported target property '{target_property}'. Supported values: {supported}.")
        if n_candidates < 1:
            raise ValueError("n_candidates must be at least 1.")

        n_candidates = min(int(n_candidates), 10)
        pool = self._candidate_pool()
        if gp_minimize is not None and Integer is not None and len(pool) > 1:
            self._run_gp_probe(pool, target_property, target_value, n_candidates)

        scored = [self._score_candidate(smiles, target_property, target_value) for smiles in pool]
        scored.sort(key=lambda row: (row["score"], row["predicted_value"]))
        return scored[:n_candidates]

    def _candidate_pool(self) -> list[str]:
        """Build a deduplicated mutation space from samples and seed molecules.

        Args:
            None.

        Returns:
            A list of candidate SMILES strings.
        """
        seed_smiles = list(DRUG_LIKE_SEED_SMILES)
        if self.sample_data_path.exists():
            try:
                sample_rows = json.loads(self.sample_data_path.read_text(encoding="utf-8"))
                seed_smiles.extend(row["smiles"] for row in sample_rows if isinstance(row.get("smiles"), str))
            except Exception:
                pass

        candidates: list[str] = []
        for smiles in seed_smiles:
            self._append_valid(candidates, smiles)
            for group in ("OH", "NH2", "COOH", "F", "Cl"):
                try:
                    self._append_valid(candidates, self.parser.add_functional_group(smiles, group))
                except Exception:
                    continue
        return candidates[:240]

    def _append_valid(self, candidates: list[str], smiles: str) -> None:
        """Append a candidate if it parses and has not already appeared.

        Args:
            candidates: Candidate list to mutate in place.
            smiles: Candidate SMILES to validate.

        Returns:
            None.
        """
        try:
            canonical = self.parser.parse_smiles(smiles)["smiles"]
        except Exception:
            return
        if canonical not in candidates:
            candidates.append(canonical)

    def _score_candidate(self, smiles: str, target_property: str, target_value: float) -> dict[str, Any]:
        """Score a molecule against the target value.

        Args:
            smiles: Candidate SMILES string.
            target_property: Property key to compare.
            target_value: Desired scalar target.

        Returns:
            A candidate score dictionary.
        """
        prediction = self.predictor.predict(smiles)
        predicted_value = float(prediction[target_property]["value"])
        denominator = max(abs(float(target_value)), 1.0)
        score = abs(predicted_value - float(target_value)) / denominator
        descriptors = self.parser.get_descriptors(smiles)
        low, high, _unit = PROPERTY_RANGES[target_property]
        return {
            "smiles": smiles,
            "predicted_value": predicted_value,
            "target_property": target_property,
            "target_value": float(target_value),
            "score": round(float(score), 6),
            "within_range": low <= predicted_value <= high,
            "descriptors": descriptors,
        }

    def _run_gp_probe(self, pool: list[str], target_property: str, target_value: float, n_candidates: int) -> None:
        """Run a small Gaussian-process probe over candidate indices.

        Args:
            pool: Candidate SMILES list.
            target_property: Property key being optimized.
            target_value: Desired scalar target.
            n_candidates: Requested number of final candidates.

        Returns:
            None.
        """
        calls = min(max(10, n_candidates * 4), len(pool))

        def objective(point: list[int]) -> float:
            """Score one integer-indexed candidate for skopt.

            Args:
                point: A single-value list containing the candidate index.

            Returns:
                The candidate score as a float.
            """
            idx = int(point[0])
            return float(self._score_candidate(pool[idx], target_property, target_value)["score"])

        try:
            gp_minimize(
                objective,
                [Integer(0, len(pool) - 1, name="candidate_index")],
                n_calls=calls,
                random_state=1337,
                n_initial_points=min(8, calls),
            )
        except Exception:
            return
