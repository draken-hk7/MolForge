"""Phase D Cloud DFT accuracy engine contracts."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import cloud_compute
from core.cloud_compute.job_manager import CloudJobManager, CloudRateLimitError
from core.cloud_compute.xtb_runner import NoComputeAvailable, XTBRunner
from core.supabase_client import SupabaseGateway


class FakeRunner:
    """Deterministic xTB runner used to exercise orchestration without xTB."""

    def is_available(self) -> bool:
        return True

    def get_provider_status(self) -> dict:
        return {
            "oracle": {"available": False, "host_set": False, "xtb_version": None},
            "gcp": {"available": False, "project_set": False, "xtb_version": None},
            "local": {"available": True, "xtb_version": "6.7.1"},
            "any_available": True,
        }

    def run_calculation(self, smiles: str, job_id: str, properties: list[str] | None = None) -> dict:
        return {
            "provider": "local",
            "raw": {"homo_lumo_gap_ev": 5.2},
            "properties": {
                "bandgap_ev": {
                    "value": 5.2,
                    "unit": "eV",
                    "source": "cloud_xtb",
                    "method": "GFN2-xTB HOMO-LUMO gap",
                    "confidence": 0.72,
                }
            },
        }


def gateway() -> SupabaseGateway:
    return SupabaseGateway(url="", anon_key="", service_key="")


def test_xtb_runner_no_provider_returns_graceful_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ORACLE_HOST", raising=False)
    monkeypatch.delenv("GCP_INSTANCE_IP", raising=False)
    runner = XTBRunner(executable="definitely-not-installed-xtb")

    with pytest.raises(NoComputeAvailable, match="No xTB compute provider"):
        runner.run_calculation("CCO", "no-provider")


def test_job_manager_cache_hit() -> None:
    manager = CloudJobManager(gateway=gateway(), runner=FakeRunner(), run_async=False)

    first = manager.submit_job("CCO")
    second = manager.submit_job("CCO")

    assert first["cached"] is False
    assert second["cached"] is True
    assert second["result"]["properties"]["bandgap_ev"]["value"] == 5.2


def test_job_manager_rate_limit_free() -> None:
    manager = CloudJobManager(gateway=gateway(), runner=FakeRunner(), run_async=False)

    for smiles in ("C", "CC", "CCC"):
        manager.submit_job(smiles, user_id="free-user", tier="free")

    with pytest.raises(CloudRateLimitError, match="3 cloud jobs/day"):
        manager.submit_job("CCCC", user_id="free-user", tier="free")


def test_cloud_submit_endpoint_returns_job_id_and_eta() -> None:
    test_app = FastAPI()
    test_app.include_router(cloud_compute.router)
    test_app.state.cloud_job_manager = CloudJobManager(gateway=gateway(), runner=FakeRunner(), run_async=False)

    response = TestClient(test_app).post("/api/cloud/submit", json={"smiles": "CCO"})

    assert response.status_code == 200
    assert response.json()["job_id"]
    assert response.json()["eta_seconds"] == 0


def test_cloud_status_endpoint_returns_correct_structure() -> None:
    test_app = FastAPI()
    test_app.include_router(cloud_compute.router)
    manager = CloudJobManager(gateway=gateway(), runner=FakeRunner(), run_async=False)
    test_app.state.cloud_job_manager = manager
    submitted = manager.submit_job("CCO")

    response = TestClient(test_app).get(f"/api/cloud/status/{submitted['job_id']}")

    assert response.status_code == 200
    assert set(response.json()) >= {"status", "result", "progress_pct", "error", "provider"}


def test_property_conversion_marks_native_and_derived_quantities() -> None:
    runner = XTBRunner(executable="definitely-not-installed-xtb")
    raw = {
        "homo_lumo_gap_ev": 4.0,
        "total_energy_ev": -120.0,
        "dipole_moment_debye": 1.2,
        "polarizability_au": 20.0,
        "solvation_energy_kcal": -4.5,
        "partial_charges": [-0.2, 0.1, 0.1],
        "calculation_time_s": 2.0,
    }

    converted = runner._convert_to_properties(raw, "CCO")

    assert list(converted)[0] == "bandgap_ev"
    assert converted["bandgap_ev"]["value"] == 4.0
    assert converted["chemical_hardness_ev"]["value"] == 2.0
    assert converted["solubility_logS"]["source"] == "cloud_xtb_derived"
    assert "screening estimate" in converted["solubility_logS"]["note"].lower()


def test_smiles_to_xyz_generates_valid_xyz() -> None:
    runner = XTBRunner(executable="definitely-not-installed-xtb")
    workdir = Path("backend/tests") / f".phase-d-{uuid.uuid4().hex}"
    try:
        xyz_path = runner.smiles_to_xyz("CCO", workdir)
        lines = xyz_path.read_text(encoding="utf-8").splitlines()

        assert xyz_path.name == "molecule.xyz"
        assert int(lines[0]) >= 3
        assert len(lines) == int(lines[0]) + 2
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def test_band_gap_priority_is_first_when_parsing_xtb_json() -> None:
    workdir = Path("backend/tests") / f".phase-d-{uuid.uuid4().hex}"
    workdir.mkdir(parents=True)
    try:
        (workdir / "gas.json").write_text(
            json.dumps(
                {
                    "HOMO-LUMO gap/eV": 3.75,
                    "total energy": -10.0,
                    "dipole/au": [1.0, 0.0, 0.0],
                    "partial charges": [-0.1, 0.1],
                }
            ),
            encoding="utf-8",
        )
        (workdir / "solvent.json").write_text(json.dumps({"total energy": -10.01}), encoding="utf-8")

        parsed = XTBRunner(executable="definitely-not-installed-xtb")._parse_xtb_output(workdir)

        assert parsed["homo_lumo_gap_ev"] == 3.75
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
