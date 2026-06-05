"""Molecule parsing and editing API routes."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.molecule_parser import MoleculeParser


router = APIRouter(prefix="/api/molecules", tags=["molecules"])


class SmilesRequest(BaseModel):
    """SMILES request body."""

    smiles: str = Field(..., min_length=1)


class MutateAtomRequest(BaseModel):
    """Atom mutation request body."""

    smiles: str = Field(..., min_length=1)
    atom_idx: int = Field(..., ge=0)
    new_element: str = Field(..., min_length=1)


class FunctionalGroupRequest(BaseModel):
    """Functional group addition request body."""

    smiles: str = Field(..., min_length=1)
    group: str = Field(..., min_length=1)


def _parser(request: Request) -> MoleculeParser:
    """Resolve the shared parser from application state.

    Args:
        request: Incoming FastAPI request.

    Returns:
        A MoleculeParser instance.
    """
    return getattr(request.app.state, "parser", MoleculeParser())


@router.post("/parse")
async def parse_molecule(payload: SmilesRequest, request: Request) -> dict[str, Any]:
    """Parse a SMILES string into atoms, bonds, descriptors, and MOL block.

    Args:
        payload: Request containing a SMILES string.
        request: Incoming FastAPI request.

    Returns:
        Parsed molecule data.
    """
    try:
        return _parser(request).parse_smiles(payload.smiles)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/mutate")
async def mutate_atom(payload: MutateAtomRequest, request: Request) -> dict[str, Any]:
    """Mutate one atom in a molecule.

    Args:
        payload: Mutation request payload.
        request: Incoming FastAPI request.

    Returns:
        Mutated SMILES and parsed molecule data.
    """
    parser = _parser(request)
    try:
        mutated_smiles = parser.mutate_atom(payload.smiles, payload.atom_idx, payload.new_element)
        return {"smiles": mutated_smiles, "molecule": parser.parse_smiles(mutated_smiles)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/add-group")
async def add_group(payload: FunctionalGroupRequest, request: Request) -> dict[str, Any]:
    """Attach a functional group to a molecule.

    Args:
        payload: Functional group request payload.
        request: Incoming FastAPI request.

    Returns:
        Mutated SMILES and parsed molecule data.
    """
    parser = _parser(request)
    try:
        mutated_smiles = parser.add_functional_group(payload.smiles, payload.group)
        return {"smiles": mutated_smiles, "molecule": parser.parse_smiles(mutated_smiles)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/descriptors")
async def descriptors(payload: SmilesRequest, request: Request) -> dict[str, Any]:
    """Calculate molecular descriptors.

    Args:
        payload: Request containing a SMILES string.
        request: Incoming FastAPI request.

    Returns:
        Descriptor values for the molecule.
    """
    try:
        return {"smiles": payload.smiles, "descriptors": _parser(request).get_descriptors(payload.smiles)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/samples")
async def samples() -> list[dict[str, Any]]:
    """Return ten curated sample molecules.

    Args:
        None.

    Returns:
        The first ten sample molecule records.
    """
    path = Path(__file__).resolve().parents[2] / "data" / "sample_molecules.json"
    rows = json.loads(path.read_text(encoding="utf-8"))
    return rows[:10]
