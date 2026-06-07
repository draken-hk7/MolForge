"""Phase D optional cloud xTB calculation endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from api.routes.auth import optional_user, require_user
from core.cloud_compute.job_manager import CloudJobManager, CloudRateLimitError
from core.telemetry import track
from core.training_pipeline import TrainingPipelineManager


router = APIRouter(prefix="/api/cloud", tags=["cloud-compute"])


class Submit(BaseModel):
    smiles: str = Field(..., min_length=1)
    priority: bool = False
    job_type: str = "xtb"
    molecule_id: str | None = None


class Batch(BaseModel):
    smiles_list: list[str] = Field(..., min_length=1, max_length=100)


class TrainingRun(BaseModel):
    limit: int | None = Field(None, ge=1, le=200000)


def manager(request: Request) -> CloudJobManager:
    return getattr(request.app.state, "cloud_job_manager", None) or CloudJobManager()


def training_pipeline(request: Request) -> TrainingPipelineManager:
    return getattr(request.app.state, "training_pipeline", None) or TrainingPipelineManager()


def require_admin(request: Request, authorization: str | None) -> dict[str, Any]:
    user = require_user(request, authorization)
    if user["profile"].get("tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


@router.post("/submit")
async def submit(payload: Submit, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = optional_user(request, authorization)
    tier = user["profile"].get("tier", "free") if user else "free"
    try:
        result = manager(request).submit_job(
            payload.smiles,
            job_type=payload.job_type,
            tier=tier,
            user_id=user["id"] if user else None,
            molecule_id=payload.molecule_id,
            priority=payload.priority,
        )
    except CloudRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    track(user["id"] if user else "anonymous", "cloud_job_submitted", {"provider": result.get("provider"), "job_type": payload.job_type})
    return result


@router.get("/status/{job_id}")
async def job_status(job_id: str, request: Request) -> dict[str, Any]:
    try:
        return manager(request).get_job_status(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/providers")
async def providers(request: Request) -> dict[str, Any]:
    return manager(request).get_provider_status()


@router.get("/cache-stats")
async def cache_stats(request: Request) -> dict[str, Any]:
    return manager(request).cache_stats()


@router.get("/precomputed/{smiles_hash}")
async def precomputed(smiles_hash: str, request: Request) -> dict[str, Any]:
    cloud = manager(request)
    rows = (
        cloud.gateway.table("cloud_jobs").select("*").eq("smiles_hash", smiles_hash).eq("status", "completed").limit(1).execute().data
        if cloud.gateway.service_available
        else []
    )
    if not rows:
        rows = [job for job in cloud.jobs.values() if job["smiles_hash"] == smiles_hash and job["status"] == "completed"]
    if not rows:
        raise HTTPException(status_code=404, detail="No cached calculation.")
    return rows[0]


@router.get("/stats")
async def cloud_stats(request: Request) -> dict[str, Any]:
    return manager(request).stats()


@router.get("/training-runs")
async def training_runs(request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin(request, authorization)
    return training_pipeline(request).list_runs()


@router.post("/training/{action}")
async def start_training_run(
    action: str,
    payload: TrainingRun,
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin(request, authorization)
    try:
        result = training_pipeline(request).start(action, payload.limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    track(user["id"], "training_pipeline_started", {"action": action, "limit": payload.limit})
    return result


@router.get("/jobs")
async def recent_jobs(request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = optional_user(request, authorization)
    return manager(request).recent_jobs(user["id"]) if user else []


@router.post("/batch")
async def batch(payload: Batch, request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = require_user(request, authorization)
    tier = user["profile"].get("tier", "free")
    if tier not in {"plus", "max", "admin"}:
        raise HTTPException(status_code=403, detail="Batch compute requires Plus or Max.")
    try:
        return [manager(request).submit_job(smiles, tier=tier, user_id=user["id"]) for smiles in payload.smiles_list]
    except CloudRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
