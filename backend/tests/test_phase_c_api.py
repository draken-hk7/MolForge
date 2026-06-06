"""Phase C API integration contracts."""

from __future__ import annotations

from api.main import app
from core.cloud_compute.job_manager import CloudJobManager
from core.supabase_client import SupabaseGateway


def test_phase_c_routes_are_registered() -> None:
    paths = {route.path for route in app.routes}

    assert "/api/auth/status" in paths
    assert "/api/collab/molecules/save" in paths
    assert "/api/community/explore" in paths
    assert "/api/feedback/rating" in paths
    assert "/api/cloud/submit" in paths


def test_unconfigured_supabase_status_is_safe() -> None:
    gateway = SupabaseGateway(url="", anon_key="", service_key="")

    assert gateway.status() == {
        "configured": False,
        "service_configured": False,
        "project_url": None,
    }


def test_cloud_submit_reports_provider_and_remains_optional() -> None:
    manager = CloudJobManager(gateway=SupabaseGateway(url="", anon_key="", service_key=""))
    manager.xtb.is_available = lambda: False
    manager.oracle.is_available = lambda: False
    manager.gcp.is_available = lambda: False

    result = manager.submit_job("CCO", "xtb")

    assert result["provider"] == "local"
    assert result["status"] == "queued"
    assert result["cached"] is False
