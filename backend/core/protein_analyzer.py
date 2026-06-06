"""Utilities for analyzing PDB-format protein structures."""

from __future__ import annotations

from io import StringIO
from math import dist, pi
from typing import Any

try:
    from Bio.PDB import PDBParser
except Exception:
    PDBParser = None


class ProteinAnalyzer:
    """Analyze structure metadata and estimate simple putative pockets."""

    def analyze_pdb(self, pdb_string: str, predicted: bool = False) -> dict[str, Any]:
        """Analyze PDB content.

        Args:
            pdb_string: PDB-format structure text.
            predicted: Whether B-factors should be interpreted as pLDDT.

        Returns:
            Structure analysis dictionary.
        """
        if not pdb_string.strip():
            raise ValueError("PDB content is empty.")
        if PDBParser is None:
            raise RuntimeError("BioPython is required for PDB analysis.")
        structure = PDBParser(QUIET=True).get_structure("molforge", StringIO(pdb_string))
        atoms = list(structure.get_atoms())
        residues = [residue for residue in structure.get_residues() if residue.id[0] == " "]
        chains = [chain.id for chain in structure.get_chains()]
        bfactors = [float(atom.bfactor) for atom in atoms]
        secondary = self._secondary_structure_summary(pdb_string, len(residues))
        result = {
            "residue_count": len(residues),
            "atom_count": len(atoms),
            "chain_ids": chains,
            "chain_count": len(chains),
            "bfactor_mean": round(sum(bfactors) / len(bfactors), 2) if bfactors else None,
            "bfactor_min": round(min(bfactors), 2) if bfactors else None,
            "bfactor_max": round(max(bfactors), 2) if bfactors else None,
            "secondary_structure_summary": secondary,
            "binding_sites": self.calculate_binding_sites(pdb_string),
        }
        if predicted:
            ca_scores = [float(atom.bfactor) for atom in atoms if atom.name == "CA"]
            result["plddt_mean"] = round(sum(ca_scores) / len(ca_scores), 2) if ca_scores else None
        return result

    def calculate_binding_sites(self, pdb_string: str) -> list[dict[str, Any]]:
        """Estimate putative pockets from compact clusters of nearby residues.

        The result is a lightweight geometric heuristic for exploration, not a
        validated ligand-binding prediction.
        """
        if PDBParser is None or not pdb_string.strip():
            return []
        structure = PDBParser(QUIET=True).get_structure("molforge", StringIO(pdb_string))
        points: list[tuple[str, tuple[float, float, float]]] = []
        for residue in structure.get_residues():
            if residue.id[0] != " " or "CA" not in residue:
                continue
            atom = residue["CA"]
            points.append((f"{residue.resname} {residue.parent.id}{residue.id[1]}", tuple(float(v) for v in atom.coord)))
        if len(points) < 5:
            return []
        pockets: list[dict[str, Any]] = []
        for center_index in range(0, len(points), max(5, len(points) // 3)):
            center = points[center_index][1]
            neighbors = sorted(points, key=lambda item: dist(center, item[1]))[: min(8, len(points))]
            radius = max(dist(center, item[1]) for item in neighbors)
            compactness = len(neighbors) / max(radius, 1.0)
            pockets.append(
                {
                    "residues": [item[0] for item in neighbors],
                    "pocket_score": round(min(1.0, compactness / 2.0), 3),
                    "volume_estimate": round((4.0 / 3.0) * pi * radius**3, 2),
                }
            )
            if len(pockets) == 3:
                break
        return pockets

    def pdb_to_summary(self, pdb_string: str, predicted: bool = False) -> str:
        """Return a human-readable structure summary."""
        analysis = self.analyze_pdb(pdb_string, predicted=predicted)
        confidence = f", mean pLDDT {analysis['plddt_mean']}" if analysis.get("plddt_mean") is not None else ""
        return (
            f"{analysis['residue_count']} residues across {analysis['chain_count']} chain(s), "
            f"{analysis['atom_count']} atoms{confidence}."
        )

    def _secondary_structure_summary(self, pdb_string: str, residue_count: int) -> dict[str, Any]:
        """Estimate secondary structure counts from HELIX and SHEET records."""
        helix_residues = 0
        sheet_residues = 0
        for line in pdb_string.splitlines():
            if line.startswith("HELIX"):
                try:
                    helix_residues += max(0, int(line[71:76].strip()))
                except ValueError:
                    pass
            elif line.startswith("SHEET"):
                try:
                    start = int(line[22:26].strip())
                    end = int(line[33:37].strip())
                    sheet_residues += max(0, end - start + 1)
                except ValueError:
                    pass
        helix_residues = min(residue_count, helix_residues)
        sheet_residues = min(max(0, residue_count - helix_residues), sheet_residues)
        loop_residues = max(0, residue_count - helix_residues - sheet_residues)
        denominator = residue_count or 1
        return {
            "helix": helix_residues,
            "sheet": sheet_residues,
            "loop": loop_residues,
            "helix_pct": round(helix_residues / denominator * 100, 2),
            "sheet_pct": round(sheet_residues / denominator * 100, 2),
            "loop_pct": round(loop_residues / denominator * 100, 2),
        }
