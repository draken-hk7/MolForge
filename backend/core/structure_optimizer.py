"""Molecular geometry optimization utilities."""

from __future__ import annotations

import math
from typing import Any

from .molecule_parser import MoleculeParser

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
except Exception:
    Chem = None
    AllChem = None

try:
    from ase import Atoms
    from ase.calculators.emt import EMT
    from ase.optimize import BFGS
except Exception:
    Atoms = None
    EMT = None
    BFGS = None


class StructureOptimizer:
    """Optimize molecular geometry using RDKit and optional ASE."""

    def __init__(self, parser: MoleculeParser | None = None) -> None:
        """Initialize the structure optimizer.

        Args:
            parser: Optional MoleculeParser instance.

        Returns:
            None.
        """
        self.parser = parser or MoleculeParser()

    def optimize_geometry(self, smiles: str) -> dict[str, Any]:
        """Optimize a molecule's geometry and return energy and coordinates.

        Args:
            smiles: The SMILES representation to optimize.

        Returns:
            A dictionary containing optimized SMILES, energy, force norm, convergence
            status, XYZ string, and backend mode.

        Raises:
            ValueError: If the molecule cannot be parsed.
        """
        if Chem is None:
            parsed = self.parser.parse_smiles(smiles)
            atom_count = len(parsed["atoms"])
            return {
                "optimized_smiles": parsed["smiles"],
                "energy_ev": round(-0.03 * atom_count, 6),
                "forces_max": 0.0,
                "converged": True,
                "xyz_string": self._fallback_xyz(parsed["atoms"]),
                "method": "fallback-coordinates",
            }

        mol = self.parser._rdkit_mol(smiles)
        mol_3d = Chem.AddHs(mol)
        embed_status = AllChem.EmbedMolecule(mol_3d, randomSeed=0xF00D, useRandomCoords=True)
        if embed_status != 0:
            raise ValueError("RDKit could not embed a 3D conformer for this molecule.")

        forcefield = None
        try:
            properties = AllChem.MMFFGetMoleculeProperties(mol_3d, mmffVariant="MMFF94")
            if properties is not None:
                forcefield = AllChem.MMFFGetMoleculeForceField(mol_3d, properties)
        except Exception:
            forcefield = None
        if forcefield is None:
            forcefield = AllChem.UFFGetMoleculeForceField(mol_3d)

        converged = forcefield.Minimize(maxIts=300) == 0
        energy = float(forcefield.CalcEnergy())
        method = "rdkit-mmff94"
        forces_max = 0.0

        if Atoms is not None and EMT is not None and BFGS is not None:
            ase_result = self._run_ase_emt(mol_3d)
            if ase_result is not None:
                energy = ase_result["energy_ev"]
                forces_max = ase_result["forces_max"]
                converged = ase_result["converged"]
                method = "ase-emt"

        return {
            "optimized_smiles": Chem.MolToSmiles(Chem.RemoveHs(mol_3d)),
            "energy_ev": round(float(energy), 6),
            "forces_max": round(float(forces_max), 6),
            "converged": bool(converged),
            "xyz_string": self._rdkit_xyz(mol_3d),
            "method": method,
        }

    def _run_ase_emt(self, mol: Any) -> dict[str, float | bool] | None:
        """Run ASE EMT optimization when all elements are supported.

        Args:
            mol: RDKit molecule with a 3D conformer.

        Returns:
            ASE energy, force, and convergence status, or None on unsupported systems.
        """
        try:
            conformer = mol.GetConformer()
            symbols = [atom.GetSymbol() for atom in mol.GetAtoms()]
            positions = [
                (
                    conformer.GetAtomPosition(idx).x,
                    conformer.GetAtomPosition(idx).y,
                    conformer.GetAtomPosition(idx).z,
                )
                for idx in range(mol.GetNumAtoms())
            ]
            atoms = Atoms(symbols=symbols, positions=positions)
            atoms.calc = EMT()
            optimizer = BFGS(atoms, logfile=None)
            converged = optimizer.run(fmax=0.05, steps=120)
            forces = atoms.get_forces()
            forces_max = max(math.sqrt(float((force * force).sum())) for force in forces)
            return {
                "energy_ev": float(atoms.get_potential_energy()),
                "forces_max": float(forces_max),
                "converged": bool(converged),
            }
        except Exception:
            return None

    def _rdkit_xyz(self, mol: Any) -> str:
        """Serialize an RDKit conformer as XYZ text.

        Args:
            mol: RDKit molecule with coordinates.

        Returns:
            XYZ formatted coordinates.
        """
        conformer = mol.GetConformer()
        lines = [str(mol.GetNumAtoms()), "MolForge optimized geometry"]
        for atom in mol.GetAtoms():
            pos = conformer.GetAtomPosition(atom.GetIdx())
            lines.append(f"{atom.GetSymbol()} {pos.x:.6f} {pos.y:.6f} {pos.z:.6f}")
        return "\n".join(lines)

    def _fallback_xyz(self, atoms: list[dict[str, Any]]) -> str:
        """Serialize fallback atom records as XYZ text.

        Args:
            atoms: Parsed fallback atom dictionaries.

        Returns:
            XYZ formatted coordinates.
        """
        lines = [str(len(atoms)), "MolForge fallback geometry"]
        for atom in atoms:
            lines.append(f"{atom['element']} {atom['x']:.6f} {atom['y']:.6f} {atom['z']:.6f}")
        return "\n".join(lines)
