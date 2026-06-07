"""Phase E preparation contracts."""

from __future__ import annotations

from pathlib import Path

from core.gnn_predictor import GNNPredictor
from core.cloud_compute.job_manager import CloudJobManager
from core.property_predictor import PropertyPredictor
from core.protein_predictor import ProteinPredictor
from core.supabase_client import SupabaseGateway
from core.training_pipeline import TrainingPipelineManager
from core.uniprot_client import KNOWN_PDB_IDS, UniProtClient
from scripts.benchmark import BenchmarkSuite
from scripts.import_qm9 import HARTREE_TO_EV, qm9_properties


ROOT = Path(__file__).resolve().parents[2]


def test_fullscreen_hook_exists() -> None:
    assert (ROOT / "frontend" / "src" / "hooks" / "useFullscreen.js").exists()


def test_rcsb_fallback_known_protein() -> None:
    assert KNOWN_PDB_IDS["P62988"] == "1UBQ"
    assert UniProtClient().find_pdb_ids("P62988")[0] == "1UBQ"


def test_rcsb_fallback_returns_pdb_string(monkeypatch) -> None:
    client = UniProtClient()
    monkeypatch.setattr(client, "find_pdb_ids", lambda _uniprot_id: ["1UBQ"])
    monkeypatch.setattr(client, "get_rcsb_structure", lambda _pdb_id: "HEADER TEST\nATOM      1  CA  ALA A   1       0.000   0.000   0.000  1.00 80.00           C\nEND\n")
    predictor = ProteinPredictor(api_key="", uniprot_client=client)

    result = predictor.predict_structure("ACDEFG", uniprot_id="P62988")

    assert result["method"] == "rcsb_experimental"
    assert "ATOM" in result["pdb_string"]


def test_qm9_import_script_exists() -> None:
    assert (ROOT / "backend" / "scripts" / "import_qm9.py").exists()
    assert (ROOT / "backend" / "scripts" / "download_qm9.py").exists()


def test_qm9_unit_conversion() -> None:
    converted = qm9_properties({"gap": 1.0, "homo": -0.5, "lumo": 0.5, "mu": 1.2, "alpha": 4.5})
    assert HARTREE_TO_EV == 27.2114
    assert converted["band_gap"]["value"] == 27.2114
    assert converted["homo"]["value"] == -13.6057
    assert converted["lumo"]["value"] == 13.6057


def test_benchmark_suite_runs() -> None:
    result = BenchmarkSuite().run_benchmark(PropertyPredictor(), limit=5)

    assert result["n_molecules"] == 5
    assert 0 <= result["ml_accuracy"] <= 100
    assert "per_property" in result


def test_gnn_predictor_no_model(tmp_path) -> None:
    predictor = GNNPredictor(model_path=tmp_path / "missing-model.pt")

    assert predictor.predict("CCO") is None


def test_training_data_table_schema() -> None:
    migration = (ROOT / "supabase" / "migrations" / "20260607090000_phase_e_training_data.sql").read_text(encoding="utf-8").lower()

    assert "create table public.training_data" in migration
    assert "unique (smiles_hash, source)" in migration
    assert "enable row level security" in migration
    assert "coalesce(sum(source_count), 0)" in migration


def test_batch_xtb_script_exists() -> None:
    assert (ROOT / "backend" / "scripts" / "batch_xtb.py").exists()


def test_cloud_stats_include_training_and_benchmarks() -> None:
    manager = CloudJobManager(gateway=SupabaseGateway(url="", anon_key="", service_key=""))

    result = manager.stats()

    assert "training_data" in result
    assert "benchmark_history" in result


def test_training_pipeline_actions_are_bounded() -> None:
    assert set(TrainingPipelineManager.ACTIONS) == {"qm9", "xtb", "benchmark"}
