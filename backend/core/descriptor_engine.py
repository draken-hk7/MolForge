"""Extended molecular descriptor utilities."""

from __future__ import annotations

from typing import Any

from .molecule_parser import MoleculeParser


class DescriptorEngine:
    """Calculate compact descriptor vectors for classical ML fallbacks."""

    def __init__(self, parser: MoleculeParser | None = None) -> None:
        """Initialize the descriptor engine.

        Args:
            parser: Optional MoleculeParser instance to reuse.

        Returns:
            None.
        """
        self.parser = parser or MoleculeParser()

    def featurize(self, smiles: str) -> dict[str, Any]:
        """Return descriptor and fingerprint features for a molecule.

        Args:
            smiles: The SMILES representation to featurize.

        Returns:
            A dictionary containing descriptors, fingerprint bits, and derived ratios.
        """
        descriptors = self.parser.get_descriptors(smiles)
        fingerprint = self.parser.get_fingerprint(smiles)
        atom_count = max(float(descriptors["NumAtoms"]), 1.0)
        return {
            "descriptors": descriptors,
            "fingerprint": fingerprint,
            "derived": {
                "polarity_per_atom": round(float(descriptors["TPSA"]) / atom_count, 5),
                "mass_per_atom": round(float(descriptors["MolWt"]) / atom_count, 5),
                "hetero_acceptor_ratio": round(float(descriptors["HBA"]) / atom_count, 5),
                "aromatic_fraction": round(float(descriptors["AromaticRings"]) / atom_count, 5),
            },
        }
