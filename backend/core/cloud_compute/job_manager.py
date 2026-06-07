"""Asynchronous cloud calculation routing, caching, and tier limits."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
from threading import Lock, Thread
import uuid
from typing import Any

from core.cloud_compute.gcp_client import GCPComputeClient
from core.cloud_compute.oracle_client import OracleComputeClient
from core.cloud_compute.xtb_runner import XTBRunner
from core.supabase_client import SupabaseGateway, get_gateway
from core.telemetry import capture_exception, track


TIER_DAILY_LIMITS = {"free": 3, "early_access": 20, "plus": 100, "max": None, "admin": None}
ROOT = Path(__file__).resolve().parents[3]


class CloudRateLimitError(RuntimeError):
    """Raised when a cloud-compute tier has exhausted its daily allowance."""


class CloudJobManager:
    """Run optional xTB jobs while keeping ML-only MolForge fully functional."""

    def __init__(self, gateway: SupabaseGateway | None = None, runner: XTBRunner | None = None, run_async: bool = True) -> None:
        self.gateway = gateway or get_gateway()
        self.xtb = runner or XTBRunner()
        self.oracle = OracleComputeClient()  # Compatibility/status handles retained from Phase C.
        self.gcp = GCPComputeClient()
        self.run_async = run_async
        self.jobs: dict[str, dict[str, Any]] = {}
        self.usage: dict[str, list[datetime]] = {}
        self.cache_hits = 0
        self.submissions = 0
        self._lock = Lock()

    @staticmethod
    def smiles_hash(smiles: str) -> str:
        return hashlib.sha256(smiles.strip().encode("utf-8")).hexdigest()

    def providers(self) -> dict[str, bool]:
        status = self.xtb.get_provider_status()
        return {
            "local_xtb": bool(status["local"]["available"]),
            "oracle": bool(status["oracle"]["available"]),
            "gcp": bool(status["gcp"]["available"]),
            "colab": True,
            "kaggle": True,
        }

    def get_provider_status(self) -> dict[str, Any]:
        return self.xtb.get_provider_status()

    def get_cached_result(self, smiles: str, job_type: str = "xtb") -> dict[str, Any] | None:
        target_hash = self.smiles_hash(smiles)
        if self.gateway.service_available:
            try:
                rows = (
                    self.gateway.table("cloud_jobs")
                    .select("*")
                    .eq("smiles_hash", target_hash)
                    .eq("job_type", job_type)
                    .eq("status", "completed")
                    .order("completed_at", desc=True)
                    .limit(1)
                    .execute()
                    .data
                )
                if rows:
                    return rows[0]
            except Exception as exc:
                capture_exception(exc, {"operation": "cloud_cache_lookup"})
        return next(
            (
                job
                for job in reversed(list(self.jobs.values()))
                if job["smiles_hash"] == target_hash and job["job_type"] == job_type and job["status"] == "completed"
            ),
            None,
        )

    def get_precomputed(self, smiles: str, job_type: str = "xtb") -> dict[str, Any] | None:
        return self.get_cached_result(smiles, job_type)

    def submit_job(
        self,
        smiles: str,
        job_type: str = "xtb",
        tier: str = "free",
        user_id: str | None = None,
        molecule_id: str | None = None,
        priority: bool = False,
    ) -> dict[str, Any]:
        smiles = smiles.strip()
        if not smiles:
            raise ValueError("SMILES must be a non-empty string.")
        cached = self.get_cached_result(smiles, job_type)
        if cached:
            self.cache_hits += 1
            response = self._public_status(cached)
            response.update(cached=True, eta_seconds=0)
            return response
        self._check_rate_limit(user_id or "anonymous", tier)
        provider = self._best_provider()
        now = datetime.now(timezone.utc)
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "molecule_id": molecule_id,
            "user_id": user_id,
            "job_type": job_type,
            "status": "queued",
            "provider": provider,
            "input_smiles": smiles,
            "smiles_hash": self.smiles_hash(smiles),
            "priority": 10 if priority else {"free": 0, "early_access": 1, "plus": 2, "max": 3, "admin": 4}.get(tier, 0),
            "progress": 0,
            "result": {},
            "cost_credits": 0,
            "error": None,
            "created_at": now.isoformat(),
        }
        with self._lock:
            self.jobs[job_id] = job
            self.usage.setdefault(user_id or "anonymous", []).append(now)
            self.submissions += 1
        self._insert_job(job)
        if self.run_async:
            response = self._public_status(dict(job))
            response.update(cached=False, eta_seconds=45)
            Thread(target=self._execute_job, args=(job_id,), daemon=True, name=f"molforge-cloud-{job_id[:8]}").start()
            return response
        self._execute_job(job_id)
        response = self._public_status(self.jobs[job_id])
        response.update(cached=False, eta_seconds=0 if response["status"] == "completed" else 45)
        return response

    def _execute_job(self, job_id: str) -> None:
        job = self.jobs[job_id]
        try:
            self._update_job(job_id, status="running", progress=15, started_at=datetime.now(timezone.utc).isoformat())
            result = self.xtb.run_calculation(job["input_smiles"], job_id, ["bandgap_ev", "solubility_logS"])
            provider = result.get("provider", job["provider"])
            self._update_job(
                job_id,
                status="completed",
                provider=provider,
                progress=100,
                result=result,
                completed_at=datetime.now(timezone.utc).isoformat(),
                error=None,
            )
            self._store_feedback(self.jobs[job_id])
            self._update_linked_molecule(self.jobs[job_id])
            track(job.get("user_id") or "anonymous", "cloud_job_completed", {"provider": provider, "job_type": job["job_type"]})
        except Exception as exc:
            self._update_job(
                job_id,
                status="failed",
                progress=100,
                error=str(exc),
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
            capture_exception(exc, {"job_id": job_id, "job_type": job["job_type"], "provider": job["provider"]})

    def get_job_status(self, job_id: str) -> dict[str, Any]:
        if job_id in self.jobs:
            return self._public_status(self.jobs[job_id])
        if self.gateway.service_available:
            rows = self.gateway.table("cloud_jobs").select("*").eq("id", job_id).limit(1).execute().data
            if rows:
                return self._public_status(rows[0])
        raise KeyError("Cloud job not found.")

    def cache_stats(self) -> dict[str, Any]:
        values = list(self.jobs.values())
        completed = [job for job in values if job["status"] == "completed"]
        counts = Counter(job["input_smiles"] for job in completed)
        denominator = self.cache_hits + self.submissions
        return {
            "total_cached": len({job["smiles_hash"] for job in completed}),
            "cache_hit_rate": round(self.cache_hits / denominator, 4) if denominator else 0.0,
            "most_calculated": [{"smiles": smiles, "calculations": count} for smiles, count in counts.most_common(10)],
        }

    def stats(self) -> dict[str, Any]:
        values = list(self.jobs.values())
        completed = [job for job in values if job["status"] == "completed"]
        durations = []
        for job in completed:
            duration = job.get("result", {}).get("raw", {}).get("calculation_time_s")
            if isinstance(duration, (int, float)):
                durations.append(float(duration))
        cache = self.cache_stats()
        return {
            "jobs_completed": len(completed),
            "molecules_calculated": cache["total_cached"],
            "cache_hit_rate": cache["cache_hit_rate"],
            "average_calculation_time_s": round(sum(durations) / len(durations), 2) if durations else 0.0,
            "providers_available": self.providers(),
            "training_data": self.training_data_stats(),
            "benchmark_history": self.benchmark_history(),
        }

    def training_data_stats(self) -> dict[str, Any]:
        """Return privacy-safe training sample counts from Supabase or local checkpoints."""
        if self.gateway.service_available:
            try:
                stats = self.gateway.rpc("training_data_stats", {})
                if isinstance(stats, dict):
                    return stats
            except Exception as exc:
                capture_exception(exc, {"operation": "training_data_stats"})
        by_source: dict[str, int] = {}
        checkpoint = ROOT / "ml" / "datasets" / "qm9_import_checkpoint.json"
        if checkpoint.exists():
            try:
                by_source["qm9_dataset"] = int(json.loads(checkpoint.read_text(encoding="utf-8")).get("imported", 0))
            except Exception:
                pass
        xtb_results = ROOT / "ml" / "datasets" / "xtb_results.json"
        if xtb_results.exists():
            try:
                by_source["xtb_batch"] = len(json.loads(xtb_results.read_text(encoding="utf-8")))
            except Exception:
                pass
        return {"total": sum(by_source.values()), "by_source": by_source}

    def benchmark_history(self, limit: int = 12) -> list[dict[str, Any]]:
        """Load compact benchmark summaries for the admin accuracy trend."""
        reports = []
        for path in sorted((ROOT / "ml" / "benchmarks").glob("benchmark_*.json"), reverse=True)[:limit]:
            try:
                result = json.loads(path.read_text(encoding="utf-8"))
                reports.append(
                    {
                        "timestamp": path.stem.removeprefix("benchmark_"),
                        "ml_accuracy": result.get("ml_accuracy"),
                        "xtb_accuracy": result.get("xtb_accuracy"),
                        "n_molecules": result.get("n_molecules", 0),
                        "per_property": result.get("per_property", {}),
                    }
                )
            except Exception:
                continue
        return list(reversed(reports))

    def recent_jobs(self, user_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        jobs = [job for job in reversed(list(self.jobs.values())) if user_id is None or job.get("user_id") == user_id]
        return [self._public_status(job) | {"input_smiles": job["input_smiles"], "created_at": job["created_at"]} for job in jobs[:limit]]

    def _check_rate_limit(self, identity: str, tier: str) -> None:
        tier = tier if tier in TIER_DAILY_LIMITS else "free"
        limit = TIER_DAILY_LIMITS[tier]
        if limit is None:
            return
        cutoff = datetime.now(timezone.utc) - timedelta(days=1)
        recent = [value for value in self.usage.get(identity, []) if value >= cutoff]
        self.usage[identity] = recent
        if len(recent) >= limit:
            raise CloudRateLimitError(f"{tier.replace('_', ' ').title()} tier limit reached ({limit} cloud jobs/day).")

    def _best_provider(self) -> str:
        status = self.xtb.get_provider_status()
        for provider in ("oracle", "gcp", "local"):
            if status[provider]["available"]:
                return provider
        return "local"

    def _public_status(self, job: dict[str, Any]) -> dict[str, Any]:
        status = job.get("status", "queued")
        progress = int(job.get("progress", 0))
        return {
            "job_id": job["id"],
            "status": status,
            "progress_pct": progress,
            "progress": progress,
            "result": job.get("result") or {},
            "error": job.get("error"),
            "provider": job.get("provider", "local"),
            "input_smiles": job.get("input_smiles"),
        }

    def _insert_job(self, job: dict[str, Any]) -> None:
        if not self.gateway.service_available:
            return
        try:
            self.gateway.table("cloud_jobs").insert(job).execute()
        except Exception as exc:
            capture_exception(exc, {"operation": "cloud_job_insert", "job_id": job["id"]})

    def _update_job(self, job_id: str, **values: Any) -> None:
        with self._lock:
            self.jobs[job_id].update(values)
        if self.gateway.service_available:
            try:
                self.gateway.table("cloud_jobs").update(values).eq("id", job_id).execute()
            except Exception as exc:
                capture_exception(exc, {"operation": "cloud_job_update", "job_id": job_id})

    def _store_feedback(self, job: dict[str, Any]) -> None:
        if not self.gateway.service_available:
            return
        for property_name, property_data in job.get("result", {}).get("properties", {}).items():
            value = property_data.get("value")
            if not isinstance(value, (int, float)):
                continue
            try:
                self.gateway.table("predictions_feedback").insert(
                    {
                        "molecule_id": job.get("molecule_id"),
                        "user_id": job.get("user_id"),
                        "property_name": property_name,
                        "cloud_calculated_value": value,
                        "correction_source": property_data.get("method"),
                        "source": "cloud_dft",
                    }
                ).execute()
            except Exception as exc:
                capture_exception(exc, {"operation": "cloud_feedback_insert", "job_id": job["id"]})

    def _update_linked_molecule(self, job: dict[str, Any]) -> None:
        if not self.gateway.service_available or not job.get("molecule_id"):
            return
        try:
            rows = self.gateway.table("molecules").select("properties").eq("id", job["molecule_id"]).limit(1).execute().data
            current = rows[0].get("properties", {}) if rows else {}
            merged = {**current, **job.get("result", {}).get("properties", {})}
            self.gateway.table("molecules").update({"properties": merged}).eq("id", job["molecule_id"]).execute()
        except Exception as exc:
            capture_exception(exc, {"operation": "cloud_molecule_update", "job_id": job["id"]})
