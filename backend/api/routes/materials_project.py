"""Materials Project API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.materials_project_client import MaterialsProjectClient
from core.property_reconciler import PropertyReconciler


router = APIRouter(prefix="/api/mp", tags=["materials-project"])


class FormulaSearchRequest(BaseModel):
    """Formula search request."""

    formula: str = Field(..., min_length=1)
    include_elasticity: bool = False


class ElementsSearchRequest(BaseModel):
    """Element search request."""

    elements: list[str] = Field(..., min_length=1)


class EnrichPredictionRequest(BaseModel):
    """Prediction enrichment request."""

    smiles: str = Field(..., min_length=1)
    ml_predictions: dict[str, Any]


class ApiKeyRequest(BaseModel):
    """Materials Project API key request."""

    api_key: str = Field(..., min_length=1)


def _client(request: Request) -> MaterialsProjectClient:
    """Resolve the session Materials Project client.

    Args:
        request: Incoming FastAPI request.

    Returns:
        MaterialsProjectClient instance.
    """
    client = getattr(request.app.state, "mp_client", None)
    if client is None:
        client = MaterialsProjectClient()
        request.app.state.mp_client = client
    return client


def _reconciler(request: Request) -> PropertyReconciler:
    """Resolve the shared property reconciler.

    Args:
        request: Incoming FastAPI request.

    Returns:
        PropertyReconciler instance.
    """
    reconciler = getattr(request.app.state, "property_reconciler", None)
    if reconciler is None:
        reconciler = PropertyReconciler()
        request.app.state.property_reconciler = reconciler
    return reconciler


@router.post("/search-formula")
async def search_formula(payload: FormulaSearchRequest, request: Request) -> list[dict[str, Any]]:
    """Search Materials Project by formula.

    Args:
        payload: Formula search payload.
        request: Incoming FastAPI request.

    Returns:
        Material summaries.
    """
    client = _client(request)
    results = client.search_by_formula(payload.formula)
    if payload.include_elasticity:
        for material in results:
            elasticity = client.get_elasticity(material.get("material_id"))
            if elasticity:
                material.update(elasticity)
    return results


@router.post("/search-elements")
async def search_elements(payload: ElementsSearchRequest, request: Request) -> list[dict[str, Any]]:
    """Search Materials Project by chemical system.

    Args:
        payload: Elements search payload.
        request: Incoming FastAPI request.

    Returns:
        Material summaries.
    """
    return _client(request).search_by_elements(payload.elements)


@router.get("/material/{material_id}")
async def get_material(material_id: str, request: Request) -> dict[str, Any]:
    """Fetch one Materials Project material detail.

    Args:
        material_id: Materials Project material id.
        request: Incoming FastAPI request.

    Returns:
        Material detail with optional elasticity and dielectric data.
    """
    client = _client(request)
    material = client.get_material_by_id(material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found or Materials Project is unavailable.")
    material["elasticity"] = client.get_elasticity(material_id)
    material["dielectric"] = client.get_dielectric(material_id)
    return material


@router.post("/enrich-prediction")
async def enrich_prediction(payload: EnrichPredictionRequest, request: Request) -> dict[str, Any]:
    """Enrich local ML predictions with Materials Project data.

    Args:
        payload: Enrichment request payload.
        request: Incoming FastAPI request.

    Returns:
        Reconciled ML and Materials Project data.
    """
    client = _client(request)
    try:
        formula = client.smiles_to_formula(payload.smiles)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    materials = client.search_by_formula(formula)
    reconciled = _reconciler(request).reconcile(payload.ml_predictions, materials, formula=formula)
    reconciled["formula"] = formula
    return reconciled


@router.get("/status")
async def status(request: Request) -> dict[str, Any]:
    """Return Materials Project connection status.

    Args:
        request: Incoming FastAPI request.

    Returns:
        Status payload without exposing the API key.
    """
    client = _client(request)
    status_payload = client.get_status()
    if status_payload["key_set"] and status_payload["available"]:
        message = "Materials Project API key is set for this session."
    elif status_payload["key_set"]:
        message = "Materials Project client is configured, but requests support is unavailable."
    else:
        message = "Materials Project API key is not set. Local ML fallback is active."
    return {**status_payload, "message": message}


@router.post("/set-key")
async def set_key(payload: ApiKeyRequest, request: Request) -> dict[str, Any]:
    """Validate and store a Materials Project API key for the current app session.

    Args:
        payload: API key payload.
        request: Incoming FastAPI request.

    Returns:
        Validation result without echoing the key.
    """
    client = MaterialsProjectClient(api_key=payload.api_key)
    valid, message = client.validate_connection()
    if valid:
        request.app.state.mp_client = client
    return {"valid": valid, "message": message}


@router.post("/clear-cache")
async def clear_cache(request: Request) -> dict[str, Any]:
    """Clear the Materials Project client cache.

    Args:
        request: Incoming FastAPI request.

    Returns:
        Cache clear status.
    """
    _client(request).clear_cache()
    return {"cleared": True, "message": "Materials Project cache cleared."}
