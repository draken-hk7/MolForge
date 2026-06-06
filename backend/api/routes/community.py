"""Public molecule community API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Request

from core.supabase_client import get_gateway


router = APIRouter(prefix="/api/community", tags=["community"])


def gateway(request: Request):
    return getattr(request.app.state, "supabase", get_gateway())


@router.get("/explore")
async def explore(request: Request, sort: str = "newest", search: str = "", tag: str = "", page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=50)) -> dict[str, Any]:
    query = gateway(request).table("molecules").select("*", count="exact").eq("is_public", True)
    if search:
        query = query.or_(f"name.ilike.%{search}%,smiles.ilike.%{search}%")
    if tag:
        query = query.contains("tags", [tag])
    order = {"most_forked": "fork_count", "most_viewed": "view_count"}.get(sort, "created_at")
    response = query.order(order, desc=True).range((page - 1) * page_size, page * page_size - 1).execute()
    return {"items": response.data, "page": page, "page_size": page_size, "total": response.count or len(response.data)}


@router.get("/trending")
async def trending(request: Request) -> list[dict[str, Any]]:
    return gateway(request).table("molecules").select("*").eq("is_public", True).order("fork_count", desc=True).limit(12).execute().data


@router.get("/stats")
async def stats(request: Request) -> dict[str, int]:
    service = gateway(request)
    molecules = service.table("molecules").select("id", count="exact").execute()
    users = service.table("profiles").select("id", count="exact").execute()
    predictions = service.table("predictions_feedback").select("id", count="exact").execute()
    return {"total_molecules": molecules.count or 0, "users": users.count or 0, "predictions": predictions.count or 0}
