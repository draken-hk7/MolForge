"""Inverse design API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.inverse_design_engine import InverseDesignEngine


router = APIRouter(prefix="/api/inverse-design", tags=["inverse-design"])


class InverseDesignRequest(BaseModel):
    """Inverse design request body."""

    target_property: str = Field(..., min_length=1)
    target_value: float
    n_candidates: int = Field(default=5, ge=1, le=10)


def _engine(request: Request) -> InverseDesignEngine:
    """Resolve the shared inverse design engine.

    Args:
        request: Incoming FastAPI request.

    Returns:
        An InverseDesignEngine instance.
    """
    return getattr(request.app.state, "inverse_design_engine", InverseDesignEngine())


@router.post("/run")
async def run_inverse_design(payload: InverseDesignRequest, request: Request) -> dict[str, Any]:
    """Run inverse design for a target property.

    Args:
        payload: Target property request payload.
        request: Incoming FastAPI request.

    Returns:
        Ranked candidate molecules and target metadata.
    """
    try:
        candidates = _engine(request).optimize(
            target_property=payload.target_property,
            target_value=payload.target_value,
            n_candidates=payload.n_candidates,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "target_property": payload.target_property,
        "target_value": payload.target_value,
        "candidates": candidates,
    }
