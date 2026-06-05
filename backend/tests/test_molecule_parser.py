"""Tests for molecule parsing and editing."""

from __future__ import annotations

import pytest

from core.molecule_parser import MoleculeParser


def test_parse_valid_smiles_returns_atoms_and_bonds() -> None:
    """A valid SMILES string should produce atom and descriptor data."""
    parser = MoleculeParser()
    parsed = parser.parse_smiles("CCO")
    assert parsed["smiles"]
    assert len(parsed["atoms"]) >= 3
    assert len(parsed["bonds"]) >= 2
    assert parsed["descriptors"]["NumAtoms"] >= 3
    assert "molblock" in parsed


def test_invalid_smiles_raises_value_error() -> None:
    """Invalid SMILES text should fail with a descriptive ValueError."""
    parser = MoleculeParser()
    with pytest.raises(ValueError):
        parser.parse_smiles("not-a-smiles")


def test_mutate_atom_returns_new_smiles() -> None:
    """Atom mutation should return a parseable SMILES string."""
    parser = MoleculeParser()
    mutated = parser.mutate_atom("CCO", atom_idx=0, new_element="N")
    parsed = parser.parse_smiles(mutated)
    assert parsed["smiles"]
    assert any(atom["element"] == "N" for atom in parsed["atoms"])


def test_add_functional_group_returns_parseable_smiles() -> None:
    """Functional group addition should return a parseable SMILES string."""
    parser = MoleculeParser()
    mutated = parser.add_functional_group("CCO", "OH")
    parsed = parser.parse_smiles(mutated)
    assert parsed["smiles"]
    assert parsed["descriptors"]["NumAtoms"] >= 4
