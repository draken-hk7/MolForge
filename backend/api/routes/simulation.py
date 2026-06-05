"""Simulation and geometry optimization API routes."""

from __future__ import annotations

import hashlib
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.structure_optimizer import StructureOptimizer


router = APIRouter(prefix="/api/simulation", tags=["simulation"])


class OptimizeRequest(BaseModel):
    """Geometry optimization request body."""

    smiles: str = Field(..., min_length=1)


def _optimizer(request: Request) -> StructureOptimizer:
    """Resolve the shared structure optimizer.

    Args:
        request: Incoming FastAPI request.

    Returns:
        A StructureOptimizer instance.
    """
    return getattr(request.app.state, "structure_optimizer", StructureOptimizer())


@router.post("/optimize")
async def optimize_geometry(payload: OptimizeRequest, request: Request) -> dict[str, Any]:
    """Run geometry optimization for a molecule.

    Args:
        payload: Request containing SMILES.
        request: Incoming FastAPI request.

    Returns:
        Geometry optimization result and deterministic job id.
    """
    try:
        result = _optimizer(request).optimize_geometry(payload.smiles)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    job_id = hashlib.sha1(payload.smiles.encode("utf-8")).hexdigest()[:12]
    return {"job_id": job_id, "status": "complete", "result": result}


@router.post("/status/{job_id}")
async def simulation_status(job_id: str) -> dict[str, Any]:
    """Return a mock async job status.

    Args:
        job_id: Job identifier returned by an optimization request.

    Returns:
        A deterministic status payload.
    """
    return {
        "job_id": job_id,
        "status": "complete",
        "progress": 1.0,
        "message": "Geometry optimization completed.",
    }
