"""Cloud calculation routing, caching, and status management."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import uuid
from typing import Any

from core.cloud_compute.gcp_client import GCPComputeClient
from core.cloud_compute.oracle_client import OracleComputeClient
from core.cloud_compute.xtb_runner import XTBRunner
from core.supabase_client import SupabaseGateway, get_gateway
from core.telemetry import capture_exception, track


class CloudJobManager:
    """Use Supabase as durable cache while keeping cloud compute fully optional."""

    def __init__(self, gateway: SupabaseGateway | None = None) -> None:
        self.gateway = gateway or get_gateway()
        self.xtb = XTBRunner()
        self.oracle = OracleComputeClient()
        self.gcp = GCPComputeClient()
        self.jobs: dict[str, dict[str, Any]] = {}

    @staticmethod
    def smiles_hash(smiles: str) -> str:
        return hashlib.sha256(smiles.strip().encode("utf-8")).hexdigest()

    def providers(self) -> dict[str, bool]:
        return {"local_xtb": self.xtb.is_available(), "oracle": self.oracle.is_available(), "gcp": self.gcp.is_available(), "colab": True, "kaggle": True}

    def get_precomputed(self, smiles: str, job_type: str = "xtb") -> dict[str, Any] | None:
        target_hash = self.smiles_hash(smiles)
        if self.gateway.service_available:
            rows = self.gateway.table("cloud_jobs").select("*").eq("smiles_hash", target_hash).eq("job_type", job_type).eq("status", "completed").limit(1).execute().data
            return rows[0] if rows else None
        return next((job for job in self.jobs.values() if job["smiles_hash"] == target_hash and job["job_type"] == job_type and job["status"] == "completed"), None)

    def submit_job(self, smiles: str, job_type: str, tier: str = "free", user_id: str | None = None, molecule_id: str | None = None) -> dict[str, Any]:
        cached = self.get_precomputed(smiles, job_type)
        if cached:
            return {"job_id": cached["id"], "provider": cached.get("provider"), "eta_seconds": 0, "cached": True, "status": "completed", "result": cached.get("result", {})}
        job_id = str(uuid.uuid4())
        provider = "local" if self.xtb.is_available() else "oracle" if self.oracle.is_available() else "gcp" if self.gcp.is_available() else "local"
        priority = {"free": 0, "early_access": 1, "plus": 2, "max": 3, "admin": 4}.get(tier, 0)
        job = {"id": job_id, "molecule_id": molecule_id, "user_id": user_id, "job_type": job_type, "status": "queued", "provider": provider, "input_smiles": smiles, "smiles_hash": self.smiles_hash(smiles), "priority": priority, "progress": 0, "result": {}, "cost_credits": 0, "created_at": datetime.now(timezone.utc).isoformat()}
        if self.xtb.is_available() and job_type == "xtb":
            try:
                job.update(status="running", progress=20, started_at=datetime.now(timezone.utc).isoformat())
                job["result"] = self.xtb.run_calculation(smiles)
                job.update(status="completed", progress=100, completed_at=datetime.now(timezone.utc).isoformat())
            except Exception as exc:
                job.update(status="failed", error=str(exc), completed_at=datetime.now(timezone.utc).isoformat())
                capture_exception(exc, {"job_id": job_id, "job_type": job_type, "provider": provider})
        self.jobs[job_id] = job
        if self.gateway.service_available and user_id:
            self.gateway.table("cloud_jobs").insert(job).execute()
            if job["status"] == "completed" and job["result"].get("homo_lumo_gap_ev") is not None:
                self.gateway.table("predictions_feedback").insert(
                    {
                        "molecule_id": molecule_id,
                        "user_id": user_id,
                        "property_name": "homo_lumo_gap_ev",
                        "cloud_calculated_value": job["result"]["homo_lumo_gap_ev"],
                        "source": "cloud_dft",
                    }
                ).execute()
        if job["status"] == "completed":
            track(user_id or "anonymous", "cloud_job_completed", {"provider": provider, "job_type": job_type})
        return {"job_id": job_id, "provider": provider, "eta_seconds": 15 if job["status"] == "queued" else 0, "cached": False, "status": job["status"], "result": job["result"]}

    def get_job_status(self, job_id: str) -> dict[str, Any]:
        if self.gateway.service_available:
            rows = self.gateway.table("cloud_jobs").select("*").eq("id", job_id).limit(1).execute().data
            if rows:
                return rows[0]
        if job_id not in self.jobs:
            raise KeyError("Cloud job not found.")
        return self.jobs[job_id]

    def stats(self) -> dict[str, Any]:
        values = list(self.jobs.values())
        completed = [job for job in values if job["status"] == "completed"]
        return {"jobs_completed": len(completed), "molecules_calculated": len({job["smiles_hash"] for job in completed}), "cache_hit_rate": 0, "providers_available": self.providers()}
