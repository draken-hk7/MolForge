"""Prediction feedback collection and admin learning metrics."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from api.routes.auth import require_user
from core.supabase_client import get_gateway
from core.telemetry import track


router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class Rating(BaseModel):
    molecule_id: str | None = None
    rating: int = Field(..., ge=1, le=5)
    feedback_text: str = ""


class Correction(BaseModel):
    molecule_id: str | None = None
    property_name: str
    predicted_value: float | None = None
    corrected_value: float
    source: str = "From experiment"


def gateway(request: Request):
    return getattr(request.app.state, "supabase", None) or get_gateway()


@router.post("/rating")
async def rating(payload: Rating, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    row = gateway(request).table("predictions_feedback").insert({**payload.model_dump(), "user_id": user["id"], "source": "user_correction"}).execute().data[0]
    track(user["id"], "feedback_submitted", {"rating": payload.rating})
    return row


@router.post("/correction")
async def correction(payload: Correction, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    values = payload.model_dump()
    values["correction_source"] = values.pop("source")
    values.update(user_id=user["id"], source="user_correction")
    row = gateway(request).table("predictions_feedback").insert(values).execute().data[0]
    track(user["id"], "feedback_submitted", {"property_corrected": payload.property_name})
    return row


@router.get("/stats")
async def feedback_stats(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    if user["profile"].get("tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    rows = gateway(request).table("predictions_feedback").select("*").execute().data
    ratings = [row["rating"] for row in rows if row.get("rating")]
    corrected: dict[str, int] = {}
    sources: dict[str, int] = {}
    for row in rows:
        if row.get("property_name"):
            corrected[row["property_name"]] = corrected.get(row["property_name"], 0) + 1
        sources[row["source"]] = sources.get(row["source"], 0) + 1
    return {"total_feedback": len(rows), "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None, "top_corrected_properties": sorted(corrected.items(), key=lambda item: item[1], reverse=True)[:10], "feedback_by_source": sources}
