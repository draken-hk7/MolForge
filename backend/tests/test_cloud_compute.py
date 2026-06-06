"""Tests for optional Phase C cloud compute."""

from __future__ import annotations

from core.cloud_compute.job_manager import CloudJobManager
from core.supabase_client import SupabaseGateway


def optional_manager() -> CloudJobManager:
    manager = CloudJobManager(gateway=SupabaseGateway(url="", anon_key="", service_key=""))
    manager.xtb.is_available = lambda: False
    manager.oracle.is_available = lambda: False
    manager.gcp.is_available = lambda: False
    return manager


def test_cloud_jobs_queue_without_any_provider_credentials() -> None:
    manager = optional_manager()

    submitted = manager.submit_job("CCO", "xtb")
    status = manager.get_job_status(submitted["job_id"])

    assert submitted["status"] == "queued"
    assert submitted["provider"] == "local"
    assert status["input_smiles"] == "CCO"
    assert manager.providers()["colab"] is True


def test_cloud_job_hash_is_stable() -> None:
    assert CloudJobManager.smiles_hash(" CCO ") == CloudJobManager.smiles_hash("CCO")
