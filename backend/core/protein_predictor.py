"""Protein sequence analysis and ESMFold structure prediction."""

from __future__ import annotations

import os
from typing import Any

from .uniprot_client import UniProtClient

try:
    import requests
except Exception:
    requests = None

try:
    from Bio.SeqUtils.ProtParam import ProteinAnalysis
except Exception:
    ProteinAnalysis = None


VALID_AMINO_ACIDS = frozenset("ACDEFGHIKLMNPQRSTVWY")
class ProteinPredictor:
    """Analyze protein sequences and call the hosted ESMFold model when configured."""

    HF_API_URL = "https://api-inference.huggingface.co/models/facebook/esmfold_v1"

    def __init__(self, api_key: str | None = None, uniprot_client: UniProtClient | None = None) -> None:
        """Initialize the predictor.

        Args:
            api_key: Optional Hugging Face token. Defaults to ``HF_API_KEY``.

        Returns:
            None.
        """
        self.api_key = (api_key if api_key is not None else os.getenv("HF_API_KEY", "")).strip()
        self.available = bool(self.api_key) and requests is not None
        self.uniprot_client = uniprot_client or UniProtClient()

    def validate_sequence(self, sequence: str) -> dict[str, Any]:
        """Validate and normalize an amino-acid sequence.

        Args:
            sequence: Raw sequence or FASTA text.

        Returns:
            Validation metadata including the normalized sequence.
        """
        normalized = self.normalize_sequence(sequence)
        invalid = sorted(set(normalized) - VALID_AMINO_ACIDS)
        errors: list[str] = []
        if not normalized:
            errors.append("Protein sequence is empty.")
        if invalid:
            errors.append(f"Invalid amino acid characters: {', '.join(invalid)}")
        if len(normalized) > 1000:
            errors.append("Protein sequence exceeds the 1000 amino acid limit.")
        return {"valid": not errors, "length": len(normalized), "errors": errors, "sequence": normalized}

    def normalize_sequence(self, sequence: str) -> str:
        """Strip FASTA headers and whitespace from a sequence.

        Args:
            sequence: Raw sequence or FASTA text.

        Returns:
            Uppercase amino-acid sequence.
        """
        lines = [line.strip() for line in str(sequence or "").splitlines() if line.strip() and not line.startswith(">")]
        return "".join(lines).replace(" ", "").upper()

    def get_sequence_properties(self, sequence: str) -> dict[str, Any]:
        """Calculate protein sequence properties with BioPython ProtParam.

        Args:
            sequence: Protein sequence.

        Returns:
            Calculated sequence properties.

        Raises:
            ValueError: If the sequence is invalid or BioPython is unavailable.
        """
        validation = self.validate_sequence(sequence)
        if not validation["valid"]:
            raise ValueError(" ".join(validation["errors"]))
        if ProteinAnalysis is None:
            raise RuntimeError("BioPython is required for protein sequence analysis.")
        normalized = validation["sequence"]
        analysis = ProteinAnalysis(normalized)
        helix, turn, sheet = analysis.secondary_structure_fraction()
        composition = {key: round(value * 100, 3) for key, value in analysis.get_amino_acids_percent().items()}
        return {
            "sequence_length": len(normalized),
            "molecular_weight": round(float(analysis.molecular_weight()), 3),
            "isoelectric_point": round(float(analysis.isoelectric_point()), 3),
            "instability_index": round(float(analysis.instability_index()), 3),
            "gravy": round(float(analysis.gravy()), 3),
            "aromaticity": round(float(analysis.aromaticity()), 4),
            "secondary_structure_fraction": {
                "helix": round(float(helix) * 100, 2),
                "turn": round(float(turn) * 100, 2),
                "sheet": round(float(sheet) * 100, 2),
                "loop": round(max(0.0, 100.0 - (helix + sheet) * 100), 2),
            },
            "amino_acid_composition": composition,
        }

    def predict_structure(self, sequence: str, uniprot_id: str | None = None) -> dict[str, Any]:
        """Return an RCSB structure, ESMFold prediction, or unavailable result.

        Args:
            sequence: Protein sequence.

        Returns:
            Structure metadata and PDB content.

        Raises:
            ValueError: If the sequence is invalid.
        """
        validation = self.validate_sequence(sequence)
        if not validation["valid"]:
            raise ValueError(" ".join(validation["errors"]))
        normalized = validation["sequence"]
        if uniprot_id:
            for pdb_id in self.uniprot_client.find_pdb_ids(uniprot_id):
                try:
                    return self._structure_result(self.uniprot_client.get_rcsb_structure(pdb_id), "rcsb_experimental") | {
                        "source_id": pdb_id
                    }
                except Exception:
                    continue
        if self.available:
            try:
                pdb_string = self._call_esmfold(normalized)
                return self._structure_result(pdb_string, "esmfold")
            except Exception:
                pass
        message = "Structure prediction temporarily unavailable. Sequence analysis shown."
        return {
            "pdb_string": None,
            "residue_count": 0,
            "atom_count": 0,
            "chain_count": 0,
            "method": "unavailable",
            "confidence_scores": [],
            "message": message,
            "warning": message,
        }

    def _call_esmfold(self, sequence: str) -> str:
        """Call the hosted Hugging Face ESMFold endpoint."""
        if requests is None:
            raise RuntimeError("requests is not available.")
        response = requests.post(
            self.HF_API_URL,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json={"inputs": sequence},
            timeout=30,
        )
        response.raise_for_status()
        pdb_string = response.text.strip()
        if not pdb_string.startswith(("ATOM", "HEADER", "MODEL", "REMARK")):
            raise RuntimeError("Hugging Face did not return PDB content.")
        return pdb_string

    def _structure_result(self, pdb_string: str, method: str) -> dict[str, Any]:
        """Extract compact metadata from PDB content."""
        atoms = [line for line in pdb_string.splitlines() if line.startswith(("ATOM  ", "HETATM"))]
        residues = {(line[21:22].strip() or "A", line[22:26].strip()) for line in atoms}
        chains = {chain for chain, _ in residues}
        confidence_scores = [
            round(float(line[60:66]), 2)
            for line in atoms
            if line.startswith("ATOM") and line[12:16].strip() == "CA" and self._is_float(line[60:66])
        ]
        return {
            "pdb_string": pdb_string,
            "residue_count": len(residues),
            "atom_count": len(atoms),
            "chain_count": len(chains),
            "method": method,
            "confidence_scores": confidence_scores,
        }

    def _is_float(self, value: str) -> bool:
        """Return whether a string can be parsed as a float."""
        try:
            float(value)
            return True
        except (TypeError, ValueError):
            return False
