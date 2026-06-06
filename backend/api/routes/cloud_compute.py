"""Optional cloud calculation endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from api.routes.auth import optional_user, require_user
from core.cloud_compute.job_manager import CloudJobManager
from core.telemetry import track


router = APIRouter(prefix="/api/cloud", tags=["cloud-compute"])


class Submit(BaseModel):
    smiles: str = Field(..., min_length=1)
    job_type: str = "xtb"
    molecule_id: str | None = None


class Batch(BaseModel):
    smiles_list: list[str] = Field(..., min_length=1, max_length=100)
    job_type: str = "xtb"


def manager(request: Request) -> CloudJobManager:
    return getattr(request.app.state, "cloud_job_manager", CloudJobManager())


@router.post("/submit")
async def submit(payload: Submit, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = optional_user(request, authorization)
    tier = user["profile"].get("tier", "free") if user else "free"
    result = manager(request).submit_job(payload.smiles, payload.job_type, tier, user["id"] if user else None, payload.molecule_id)
    track(user["id"] if user else "anonymous", "cloud_job_submitted", {"provider": result.get("provider"), "job_type": payload.job_type})
    return result


@router.get("/status/{job_id}")
async def job_status(job_id: str, request: Request) -> dict[str, Any]:
    try:
        return manager(request).get_job_status(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/precomputed/{smiles_hash}")
async def precomputed(smiles_hash: str, request: Request) -> dict[str, Any]:
    rows = manager(request).gateway.table("cloud_jobs").select("*").eq("smiles_hash", smiles_hash).eq("status", "completed").limit(1).execute().data if manager(request).gateway.service_available else []
    if not rows:
        raise HTTPException(status_code=404, detail="No cached calculation.")
    return rows[0]


@router.get("/stats")
async def cloud_stats(request: Request) -> dict[str, Any]:
    return manager(request).stats()


@router.post("/batch")
async def batch(payload: Batch, request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = require_user(request, authorization)
    if user["profile"].get("tier") not in {"plus", "max", "admin"}:
        raise HTTPException(status_code=403, detail="Batch compute requires Plus or Max.")
    return [manager(request).submit_job(smiles, payload.job_type, user["profile"]["tier"], user["id"]) for smiles in payload.smiles_list]
