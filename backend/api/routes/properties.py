"""Property prediction API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from api.routes.auth import record_prediction
from core.materials_project_client import MaterialsProjectClient
from core.property_reconciler import PropertyReconciler
from core.property_predictor import PropertyPredictor
from core.telemetry import track


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


def _mp_client(request: Request) -> MaterialsProjectClient:
    """Resolve the shared Materials Project client.

    Args:
        request: Incoming FastAPI request.

    Returns:
        A MaterialsProjectClient instance.
    """
    return getattr(request.app.state, "mp_client", MaterialsProjectClient())


def _reconciler(request: Request) -> PropertyReconciler:
    """Resolve the shared property reconciler.

    Args:
        request: Incoming FastAPI request.

    Returns:
        A PropertyReconciler instance.
    """
    return getattr(request.app.state, "property_reconciler", PropertyReconciler())


@router.post("/predict")
async def predict_properties(
    payload: PredictRequest,
    request: Request,
    mp: bool = True,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Predict material properties for a molecule.

    Args:
        payload: Request containing SMILES.
        request: Incoming FastAPI request.

    Returns:
        Property prediction payload.
    """
    try:
        user = record_prediction(request, authorization)
        predictions = _predictor(request).predict(payload.smiles)
        response: dict[str, Any] = {"smiles": payload.smiles, "properties": predictions, "mp_data": None}
        if mp:
            client = _mp_client(request)
            formula = client.smiles_to_formula(payload.smiles)
            mp_results = client.search_by_formula(formula)
            reconciled = _reconciler(request).reconcile(predictions, mp_results, formula=formula)
            reconciled["formula"] = formula
            response["mp_data"] = reconciled
            _store_mp_feedback(request, user, reconciled)
        track(
            user["id"] if user else "anonymous",
            "molecule_predicted",
            {"tier": user["profile"].get("tier") if user else "anonymous", "has_mp_data": bool(response["mp_data"] and response["mp_data"].get("best_match")), "has_cloud_data": False},
        )
        return response
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _store_mp_feedback(request: Request, user: dict[str, Any] | None, reconciled: dict[str, Any]) -> None:
    """Store MP deltas privately when the backend service client is configured."""
    gateway = getattr(request.app.state, "supabase", None)
    if not gateway or not gateway.service_available or not reconciled.get("best_match"):
        return
    rows = []
    for property_name, values in reconciled.get("reconciled", {}).items():
        if values.get("ml") is None or values.get("mp") is None:
            continue
        rows.append(
            {
                "user_id": user["id"] if user else None,
                "property_name": property_name,
                "predicted_value": values["ml"],
                "mp_actual_value": values["mp"],
                "source": "mp_reconcile",
            }
        )
    if rows:
        try:
            gateway.table("predictions_feedback").insert(rows).execute()
        except Exception:
            return


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
