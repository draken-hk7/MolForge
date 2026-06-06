"""Protein folding, UniProt, and structure-analysis API routes."""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from core.protein_analyzer import ProteinAnalyzer
from core.protein_predictor import ProteinPredictor
from core.uniprot_client import UniProtClient


router = APIRouter(prefix="/api/proteins", tags=["proteins"])


class SequenceRequest(BaseModel):
    """Single protein sequence request."""

    sequence: str = Field(..., min_length=1)


class CompareRequest(BaseModel):
    """Two-sequence structure comparison request."""

    sequence_a: str = Field(..., min_length=1)
    sequence_b: str = Field(..., min_length=1)


def _predictor(request: Request) -> ProteinPredictor:
    """Resolve the shared protein predictor."""
    return getattr(request.app.state, "protein_predictor", ProteinPredictor())


def _analyzer(request: Request) -> ProteinAnalyzer:
    """Resolve the shared protein analyzer."""
    return getattr(request.app.state, "protein_analyzer", ProteinAnalyzer())


def _uniprot(request: Request) -> UniProtClient:
    """Resolve the shared UniProt client."""
    return getattr(request.app.state, "uniprot_client", UniProtClient())


@router.post("/predict")
async def predict(payload: SequenceRequest, request: Request) -> dict[str, Any]:
    """Analyze a sequence and predict or mock its structure."""
    try:
        predictor = _predictor(request)
        properties = predictor.get_sequence_properties(payload.sequence)
        structure = predictor.predict_structure(payload.sequence)
        analysis = _analyzer(request).analyze_pdb(structure["pdb_string"], predicted=structure["method"] in {"esmfold", "mock"})
        return {**structure, "properties": properties, "analysis": analysis}
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/analyze-sequence")
async def analyze_sequence(payload: SequenceRequest, request: Request) -> dict[str, Any]:
    """Return BioPython ProtParam sequence properties."""
    try:
        return _predictor(request).get_sequence_properties(payload.sequence)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/search-uniprot")
async def search_uniprot(request: Request, q: str = Query(..., min_length=1), limit: int = Query(default=10, ge=1, le=25)) -> list[dict[str, Any]]:
    """Search UniProtKB."""
    return _uniprot(request).search(q, limit)


@router.get("/uniprot/{uniprot_id}")
async def get_uniprot(uniprot_id: str, request: Request) -> dict[str, Any]:
    """Fetch one UniProtKB record."""
    try:
        return _uniprot(request).get_by_id(uniprot_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/structure/{uniprot_id}")
async def get_structure(uniprot_id: str, request: Request) -> dict[str, Any]:
    """Return a known RCSB structure or predict from the UniProt sequence."""
    client = _uniprot(request)
    try:
        record = client.get_by_id(uniprot_id)
        if record["known_structures"]:
            pdb_id = record["known_structures"][0]
            pdb_string = client.get_known_structure(pdb_id)
            analysis = _analyzer(request).analyze_pdb(pdb_string, predicted=False)
            return {
                "pdb_string": pdb_string,
                "method": "rcsb",
                "source_id": pdb_id,
                "properties": _predictor(request).get_sequence_properties(record["sequence"]),
                "analysis": analysis,
                "uniprot": record,
            }
        predicted = await predict(SequenceRequest(sequence=record["sequence"]), request)
        predicted["uniprot"] = record
        return predicted
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/status")
async def status(request: Request) -> dict[str, Any]:
    """Return protein service availability."""
    predictor = _predictor(request)
    client = _uniprot(request)
    return {
        "esmfold_available": predictor.available,
        "uniprot_available": client.available,
        "message": (
            "ESMFold ready."
            if predictor.available
            else "ESMFold available - add HF_API_KEY to enable hosted prediction. Sequence analysis and mock rendering remain available."
        ),
    }


@router.post("/compare")
async def compare(payload: CompareRequest, request: Request) -> dict[str, Any]:
    """Predict and compare two protein sequences."""
    validation_a = _predictor(request).validate_sequence(payload.sequence_a)
    validation_b = _predictor(request).validate_sequence(payload.sequence_b)
    if not validation_a["valid"] or not validation_b["valid"]:
        raise HTTPException(status_code=400, detail="Both protein sequences must be valid.")
    structure_a = await predict(SequenceRequest(sequence=validation_a["sequence"]), request)
    structure_b = await predict(SequenceRequest(sequence=validation_b["sequence"]), request)
    score = SequenceMatcher(None, validation_a["sequence"], validation_b["sequence"]).ratio() * 100
    return {"structure_a": structure_a, "structure_b": structure_b, "sequence_alignment_score": round(score, 2)}


@router.get("/ligands")
async def ligands(request: Request, q: str = Query(..., min_length=1), limit: int = Query(default=8, ge=1, le=12)) -> list[dict[str, Any]]:
    """Search PubChem for ligand-like compound names."""
    return _uniprot(request).search_pubchem(q, limit)
