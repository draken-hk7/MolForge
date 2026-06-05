"""Property prediction API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.property_predictor import PropertyPredictor


router = APIRouter(prefix="/api/properties", tags=["properties"])


class PredictRequest(BaseModel):
    """Property prediction request body."""

    smiles: str = Field(..., min_length=1)


class CompareRequest(BaseModel):
    """Property comparison request body."""

    smiles_original: str = Field(..., min_length=1)
    smiles_modified: str = Field(..., min_length=1)


def _predictor(request: Request) -> PropertyPredictor:
    """Resolve the shared property predictor.

    Args:
        request: Incoming FastAPI request.

    Returns:
        A PropertyPredictor instance.
    """
    return getattr(request.app.state, "property_predictor", PropertyPredictor())


@router.post("/predict")
async def predict_properties(payload: PredictRequest, request: Request) -> dict[str, Any]:
    """Predict material properties for a molecule.

    Args:
        payload: Request containing SMILES.
        request: Incoming FastAPI request.

    Returns:
        Property prediction payload.
    """
    try:
        predictions = _predictor(request).predict(payload.smiles)
        return {"smiles": payload.smiles, "properties": predictions}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/compare")
async def compare_properties(payload: CompareRequest, request: Request) -> dict[str, Any]:
    """Compare original and modified molecule predictions.

    Args:
        payload: Request containing original and modified SMILES strings.
        request: Incoming FastAPI request.

    Returns:
        Original predictions, modified predictions, and numeric deltas.
    """
    predictor = _predictor(request)
    try:
        original = predictor.predict(payload.smiles_original)
        modified = predictor.predict(payload.smiles_modified)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    deltas = {
        key: {
            "delta": round(float(modified[key]["value"]) - float(original[key]["value"]), 6),
            "unit": modified[key]["unit"],
        }
        for key in original
    }
    return {
        "smiles_original": payload.smiles_original,
        "smiles_modified": payload.smiles_modified,
        "original": original,
        "modified": modified,
        "delta": deltas,
    }
