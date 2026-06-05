"""SMILES parsing, descriptor calculation, and molecular editing utilities."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Crippen, Descriptors, Lipinski, rdMolDescriptors
except Exception:
    Chem = None
    AllChem = None
    Crippen = None
    Descriptors = None
    Lipinski = None
    rdMolDescriptors = None


ATOMIC_WEIGHTS = {
    "H": 1.008,
    "B": 10.81,
    "C": 12.011,
    "N": 14.007,
    "O": 15.999,
    "F": 18.998,
    "Na": 22.99,
    "Mg": 24.305,
    "Al": 26.982,
    "Si": 28.085,
    "P": 30.974,
    "S": 32.06,
    "Cl": 35.45,
    "K": 39.098,
    "Ca": 40.078,
    "Ti": 47.867,
    "Br": 79.904,
    "Zn": 65.38,
    "I": 126.904,
}

ATOMIC_NUMBERS = {
    "H": 1,
    "B": 5,
    "C": 6,
    "N": 7,
    "O": 8,
    "F": 9,
    "Na": 11,
    "Mg": 12,
    "Al": 13,
    "Si": 14,
    "P": 15,
    "S": 16,
    "Cl": 17,
    "K": 19,
    "Ca": 20,
    "Ti": 22,
    "Zn": 30,
    "Br": 35,
    "I": 53,
}

COMMON_ELEMENTS = set(ATOMIC_WEIGHTS)
GROUP_ALIASES = {"OH", "NH2", "COOH", "CH3", "F", "Cl", "Br"}
ORGANIC_AROMATIC = {"b": "B", "c": "C", "n": "N", "o": "O", "p": "P", "s": "S"}


@dataclass(frozen=True)
class FallbackAtom:
    """Lightweight atom token used when RDKit is unavailable."""

    symbol: str
    aromatic: bool = False


class MoleculeParser:
    """Parse, describe, and mutate molecular structures from SMILES strings."""

    def parse_smiles(self, smiles: str) -> dict[str, Any]:
        """Validate a SMILES string and return atoms, bonds, and 2D coordinates.

        Args:
            smiles: The SMILES representation to parse.

        Returns:
            A dictionary containing atom records, bond records, descriptors, and a MOL block.

        Raises:
            ValueError: If the SMILES string is empty or cannot be parsed.
        """
        smiles = self._clean_smiles(smiles)
        if Chem is not None:
            mol = self._rdkit_mol(smiles)
            mol_2d = Chem.Mol(mol)
            AllChem.Compute2DCoords(mol_2d)
            conformer = mol_2d.GetConformer()
            atoms = []
            for atom in mol_2d.GetAtoms():
                position = conformer.GetAtomPosition(atom.GetIdx())
                atoms.append(
                    {
                        "index": atom.GetIdx(),
                        "element": atom.GetSymbol(),
                        "atomic_num": atom.GetAtomicNum(),
                        "formal_charge": atom.GetFormalCharge(),
                        "aromatic": atom.GetIsAromatic(),
                        "x": round(float(position.x), 4),
                        "y": round(float(position.y), 4),
                        "z": round(float(position.z), 4),
                    }
                )
            bonds = []
            for bond in mol_2d.GetBonds():
                bonds.append(
                    {
                        "begin": bond.GetBeginAtomIdx(),
                        "end": bond.GetEndAtomIdx(),
                        "order": self._bond_order(bond),
                        "type": str(bond.GetBondType()),
                        "aromatic": bond.GetIsAromatic(),
                    }
                )
            return {
                "smiles": Chem.MolToSmiles(mol),
                "atoms": atoms,
                "bonds": bonds,
                "coords_2d": [{"index": atom["index"], "x": atom["x"], "y": atom["y"]} for atom in atoms],
                "descriptors": self.get_descriptors(smiles),
                "molblock": self.smiles_to_molblock(smiles),
            }

        atoms = self._fallback_atoms(smiles)
        coords = self._fallback_coords(len(atoms))
        atom_records = [
            {
                "index": idx,
                "element": atom.symbol,
                "atomic_num": ATOMIC_NUMBERS.get(atom.symbol, 0),
                "formal_charge": 0,
                "aromatic": atom.aromatic,
                "x": coords[idx][0],
                "y": coords[idx][1],
                "z": 0.0,
            }
            for idx, atom in enumerate(atoms)
        ]
        bonds = [
            {
                "begin": idx,
                "end": idx + 1,
                "order": 1.0,
                "type": "SINGLE",
                "aromatic": atoms[idx].aromatic and atoms[idx + 1].aromatic,
            }
            for idx in range(max(0, len(atoms) - 1))
        ]
        return {
            "smiles": smiles,
            "atoms": atom_records,
            "bonds": bonds,
            "coords_2d": [{"index": atom["index"], "x": atom["x"], "y": atom["y"]} for atom in atom_records],
            "descriptors": self.get_descriptors(smiles),
            "molblock": self.smiles_to_molblock(smiles),
        }

    def get_descriptors(self, smiles: str) -> dict[str, float | int]:
        """Calculate molecular descriptors for a SMILES string.

        Args:
            smiles: The SMILES representation to analyze.

        Returns:
            A descriptor dictionary with molecular weight, LogP, TPSA, HBD, HBA,
            rotatable bonds, aromatic rings, and atom count.

        Raises:
            ValueError: If the SMILES string is invalid.
        """
        smiles = self._clean_smiles(smiles)
        if Chem is not None:
            mol = self._rdkit_mol(smiles)
            return {
                "MolWt": round(float(Descriptors.MolWt(mol)), 4),
                "LogP": round(float(Crippen.MolLogP(mol)), 4),
                "TPSA": round(float(rdMolDescriptors.CalcTPSA(mol)), 4),
                "HBD": int(Lipinski.NumHDonors(mol)),
                "HBA": int(Lipinski.NumHAcceptors(mol)),
                "RotatableBonds": int(Lipinski.NumRotatableBonds(mol)),
                "AromaticRings": int(rdMolDescriptors.CalcNumAromaticRings(mol)),
                "NumAtoms": int(mol.GetNumAtoms()),
            }

        atoms = self._fallback_atoms(smiles)
        mol_wt = sum(ATOMIC_WEIGHTS.get(atom.symbol, 0.0) for atom in atoms)
        hetero = sum(1 for atom in atoms if atom.symbol in {"N", "O", "S", "P", "F", "Cl", "Br", "I"})
        donors = sum(1 for atom in atoms if atom.symbol in {"N", "O"})
        acceptors = sum(1 for atom in atoms if atom.symbol in {"N", "O", "S", "F", "Cl", "Br"})
        aromatic_atoms = sum(1 for atom in atoms if atom.aromatic)
        rotatable = max(0, len(atoms) - 2)
        return {
            "MolWt": round(mol_wt, 4),
            "LogP": round(0.54 * sum(1 for atom in atoms if atom.symbol == "C") - 0.35 * hetero, 4),
            "TPSA": round(17.0 * acceptors + 12.0 * donors, 4),
            "HBD": donors,
            "HBA": acceptors,
            "RotatableBonds": rotatable,
            "AromaticRings": int(aromatic_atoms >= 6),
            "NumAtoms": len(atoms),
        }

    def smiles_to_molblock(self, smiles: str) -> str:
        """Convert a SMILES string into a MOL block suitable for 3D viewers.

        Args:
            smiles: The SMILES representation to convert.

        Returns:
            A V2000 MOL block string.

        Raises:
            ValueError: If the SMILES string is invalid.
        """
        smiles = self._clean_smiles(smiles)
        if Chem is not None:
            mol = self._rdkit_mol(smiles)
            mol_3d = Chem.AddHs(mol)
            status = AllChem.EmbedMolecule(mol_3d, randomSeed=0xC0FFEE, useRandomCoords=True)
            if status != 0:
                AllChem.Compute2DCoords(mol_3d)
            else:
                try:
                    AllChem.MMFFOptimizeMolecule(mol_3d, maxIters=200)
                except Exception:
                    AllChem.UFFOptimizeMolecule(mol_3d, maxIters=200)
            return Chem.MolToMolBlock(mol_3d)

        atoms = self._fallback_atoms(smiles)
        coords = self._fallback_coords(len(atoms), radius=1.25)
        bonds = [(idx, idx + 1) for idx in range(max(0, len(atoms) - 1))]
        lines = [
            "MolForge",
            "  MolForge fallback",
            "",
            f"{len(atoms):>3}{len(bonds):>3}  0  0  0  0            999 V2000",
        ]
        for idx, atom in enumerate(atoms):
            x, y = coords[idx]
            lines.append(f"{x:>10.4f}{y:>10.4f}{0.0:>10.4f} {atom.symbol:<3} 0  0  0  0  0  0  0  0  0  0  0  0")
        for begin, end in bonds:
            lines.append(f"{begin + 1:>3}{end + 1:>3}{1:>3}  0  0  0  0")
        lines.append("M  END")
        return "\n".join(lines)

    def mutate_atom(self, smiles: str, atom_idx: int, new_element: str) -> str:
        """Replace one atom in a molecule and return the mutated SMILES.

        Args:
            smiles: The starting SMILES string.
            atom_idx: Zero-based atom index to mutate.
            new_element: Replacement element symbol.

        Returns:
            The canonical SMILES for the mutated molecule when RDKit is available,
            otherwise a best-effort fallback SMILES.

        Raises:
            ValueError: If the SMILES, atom index, or element is invalid.
        """
        smiles = self._clean_smiles(smiles)
        new_element = self._clean_element(new_element)
        if Chem is not None:
            mol = self._rdkit_mol(smiles)
            if atom_idx < 0 or atom_idx >= mol.GetNumAtoms():
                raise ValueError(f"Atom index {atom_idx} is outside the molecule atom range.")
            editable = Chem.RWMol(mol)
            atom = editable.GetAtomWithIdx(atom_idx)
            atomic_number = Chem.GetPeriodicTable().GetAtomicNumber(new_element)
            if atomic_number <= 0:
                raise ValueError(f"Unsupported element '{new_element}'.")
            atom.SetAtomicNum(atomic_number)
            atom.SetFormalCharge(0)
            atom.SetNoImplicit(False)
            try:
                Chem.SanitizeMol(editable)
            except Exception as exc:
                raise ValueError(f"Atom mutation produced an invalid valence pattern: {exc}") from exc
            return Chem.MolToSmiles(editable)

        atoms = self._fallback_atoms(smiles)
        if atom_idx < 0 or atom_idx >= len(atoms):
            raise ValueError(f"Atom index {atom_idx} is outside the molecule atom range.")
        rebuilt = [atom.symbol for atom in atoms]
        rebuilt[atom_idx] = new_element
        return "".join(rebuilt)

    def add_functional_group(self, smiles: str, group: str) -> str:
        """Attach a supported functional group to the first available heavy atom.

        Args:
            smiles: The starting SMILES string.
            group: Functional group name. Supported values are OH, NH2, COOH, CH3,
                F, Cl, and Br.

        Returns:
            The mutated SMILES string.

        Raises:
            ValueError: If the SMILES is invalid or the group is unsupported.
        """
        smiles = self._clean_smiles(smiles)
        group = group.strip()
        if group not in GROUP_ALIASES:
            raise ValueError(f"Unsupported functional group '{group}'.")

        if Chem is not None:
            mol = self._rdkit_mol(smiles)
            target_idx = self._attachment_atom_idx(mol)
            editable = Chem.RWMol(mol)
            if group in {"F", "Cl", "Br"}:
                atom_idx = editable.AddAtom(Chem.Atom(group))
                editable.AddBond(target_idx, atom_idx, Chem.BondType.SINGLE)
            elif group == "OH":
                oxygen_idx = editable.AddAtom(Chem.Atom("O"))
                editable.AddBond(target_idx, oxygen_idx, Chem.BondType.SINGLE)
            elif group == "NH2":
                nitrogen_idx = editable.AddAtom(Chem.Atom("N"))
                editable.AddBond(target_idx, nitrogen_idx, Chem.BondType.SINGLE)
            elif group == "CH3":
                carbon_idx = editable.AddAtom(Chem.Atom("C"))
                editable.AddBond(target_idx, carbon_idx, Chem.BondType.SINGLE)
            elif group == "COOH":
                carbon_idx = editable.AddAtom(Chem.Atom("C"))
                oxygen_double_idx = editable.AddAtom(Chem.Atom("O"))
                oxygen_single_idx = editable.AddAtom(Chem.Atom("O"))
                editable.AddBond(target_idx, carbon_idx, Chem.BondType.SINGLE)
                editable.AddBond(carbon_idx, oxygen_double_idx, Chem.BondType.DOUBLE)
                editable.AddBond(carbon_idx, oxygen_single_idx, Chem.BondType.SINGLE)
            try:
                Chem.SanitizeMol(editable)
            except Exception as exc:
                raise ValueError(f"Functional group addition produced an invalid molecule: {exc}") from exc
            return Chem.MolToSmiles(editable)

        atoms = self._fallback_atoms(smiles)
        suffix_map = {"OH": "O", "NH2": "N", "COOH": "C(=O)O", "CH3": "C", "F": "F", "Cl": "Cl", "Br": "Br"}
        return "".join(atom.symbol for atom in atoms) + suffix_map[group]

    def get_fingerprint(self, smiles: str) -> list[int]:
        """Generate a Morgan fingerprint as a list of integer bits.

        Args:
            smiles: The SMILES string to fingerprint.

        Returns:
            A list of 2048 integers containing zeros and ones.

        Raises:
            ValueError: If the SMILES string is invalid.
        """
        smiles = self._clean_smiles(smiles)
        if Chem is not None:
            mol = self._rdkit_mol(smiles)
            try:
                from rdkit.Chem import rdFingerprintGenerator

                generator = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048)
                fingerprint = generator.GetFingerprint(mol)
            except Exception:
                fingerprint = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)
            return [int(bit) for bit in fingerprint.ToBitString()]

        atoms = self._fallback_atoms(smiles)
        bits = [0] * 2048
        for idx, atom in enumerate(atoms):
            bits[hash((atom.symbol, idx % 7)) % 2048] = 1
        return bits

    def _rdkit_mol(self, smiles: str) -> Any:
        """Return an RDKit molecule for a validated SMILES string.

        Args:
            smiles: The SMILES representation to parse.

        Returns:
            An RDKit Mol instance.

        Raises:
            ValueError: If RDKit cannot parse the SMILES string.
        """
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError(f"Invalid SMILES string: {smiles}")
        return mol

    def _attachment_atom_idx(self, mol: Any) -> int:
        """Find a heavy atom with open valence for group attachment.

        Args:
            mol: The RDKit molecule to inspect.

        Returns:
            A zero-based atom index.

        Raises:
            ValueError: If no attachable atom can be found.
        """
        for atom in mol.GetAtoms():
            if atom.GetAtomicNum() > 1 and atom.GetTotalNumHs() > 0:
                return atom.GetIdx()
        for atom in mol.GetAtoms():
            if atom.GetAtomicNum() > 1:
                return atom.GetIdx()
        raise ValueError("No heavy atom is available for functional group attachment.")

    def _clean_smiles(self, smiles: str) -> str:
        """Normalize a SMILES input string.

        Args:
            smiles: Raw user-provided SMILES input.

        Returns:
            A stripped SMILES string.

        Raises:
            ValueError: If the string is empty.
        """
        if not isinstance(smiles, str) or not smiles.strip():
            raise ValueError("SMILES must be a non-empty string.")
        return smiles.strip()

    def _clean_element(self, element: str) -> str:
        """Normalize an element symbol.

        Args:
            element: Raw element symbol.

        Returns:
            A canonical element symbol.

        Raises:
            ValueError: If the element is unsupported.
        """
        if not isinstance(element, str) or not element.strip():
            raise ValueError("Element must be a non-empty string.")
        normalized = element.strip()
        normalized = normalized[0].upper() + normalized[1:].lower()
        if normalized not in COMMON_ELEMENTS:
            raise ValueError(f"Unsupported element '{element}'.")
        return normalized

    def _fallback_atoms(self, smiles: str) -> list[FallbackAtom]:
        """Tokenize a SMILES string without RDKit.

        Args:
            smiles: The SMILES input string.

        Returns:
            A list of fallback atom records.

        Raises:
            ValueError: If unsupported tokens are encountered.
        """
        atoms: list[FallbackAtom] = []
        idx = 0
        while idx < len(smiles):
            char = smiles[idx]
            if char in "()=#$\\/.-+@0123456789":
                idx += 1
                continue
            if char == "[":
                end = smiles.find("]", idx)
                if end == -1:
                    raise ValueError(f"Invalid bracket atom in SMILES string: {smiles}")
                content = smiles[idx + 1 : end]
                match = re.search(r"([A-Z][a-z]?|[bcnops])", content)
                if not match:
                    raise ValueError(f"Unsupported bracket atom '[{content}]'.")
                symbol = match.group(1)
                atoms.append(FallbackAtom(ORGANIC_AROMATIC.get(symbol, symbol), symbol in ORGANIC_AROMATIC))
                idx = end + 1
                continue
            two = smiles[idx : idx + 2]
            if two in COMMON_ELEMENTS:
                atoms.append(FallbackAtom(two, False))
                idx += 2
                continue
            if char in ORGANIC_AROMATIC:
                atoms.append(FallbackAtom(ORGANIC_AROMATIC[char], True))
                idx += 1
                continue
            if char.isalpha():
                symbol = char.upper()
                if symbol in COMMON_ELEMENTS:
                    atoms.append(FallbackAtom(symbol, False))
                    idx += 1
                    continue
            raise ValueError(f"Unsupported token '{char}' in SMILES string: {smiles}")
        if not atoms:
            raise ValueError(f"Invalid SMILES string: {smiles}")
        return atoms

    def _fallback_coords(self, count: int, radius: float = 1.5) -> list[tuple[float, float]]:
        """Generate deterministic 2D coordinates for fallback rendering.

        Args:
            count: Number of atoms requiring coordinates.
            radius: Radius of the coordinate circle.

        Returns:
            A list of x and y coordinate tuples.
        """
        if count <= 1:
            return [(0.0, 0.0)]
        return [
            (
                round(radius * math.cos(2.0 * math.pi * idx / count), 4),
                round(radius * math.sin(2.0 * math.pi * idx / count), 4),
            )
            for idx in range(count)
        ]

    def _bond_order(self, bond: Any) -> float:
        """Convert an RDKit bond type into a numeric order.

        Args:
            bond: An RDKit bond object.

        Returns:
            The numeric bond order as a float.
        """
        order = bond.GetBondTypeAsDouble()
        return 1.5 if bond.GetIsAromatic() else float(order)
