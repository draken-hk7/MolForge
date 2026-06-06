"""Tests for Phase B protein functionality."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

from api.routes.proteins import status
from core.protein_predictor import ProteinPredictor
from core.uniprot_client import UniProtClient


def test_validate_sequence_valid() -> None:
    """Canonical amino acids should validate."""
    result = ProteinPredictor(api_key="").validate_sequence("ACDEFG")
    assert result["valid"] is True
    assert result["length"] == 6


def test_validate_sequence_invalid() -> None:
    """Numbers and ambiguous amino-acid codes should fail validation."""
    result = ProteinPredictor(api_key="").validate_sequence("ACDB2")
    assert result["valid"] is False
    assert result["errors"]


def test_get_sequence_properties() -> None:
    """ProtParam analysis should include the required metrics."""
    result = ProteinPredictor(api_key="").get_sequence_properties("MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG")
    assert {
        "molecular_weight",
        "isoelectric_point",
        "instability_index",
        "gravy",
        "aromaticity",
        "secondary_structure_fraction",
        "amino_acid_composition",
    }.issubset(result)


def test_uniprot_client_search(monkeypatch) -> None:
    """UniProt search results should normalize API records."""
    client = UniProtClient()
    monkeypatch.setattr(
        client,
        "_get_json",
        lambda *args, **kwargs: {
            "results": [
                {
                    "primaryAccession": "P0CG47",
                    "entryType": "UniProtKB reviewed (Swiss-Prot)",
                    "uniProtkbId": "UBB_HUMAN",
                    "proteinDescription": {"recommendedName": {"fullName": {"value": "Polyubiquitin-B"}}},
                    "organism": {"scientificName": "Homo sapiens"},
                    "sequence": {"length": 229},
                }
            ]
        },
    )
    results = client.search("ubiquitin")
    assert isinstance(results, list)
    assert results[0]["uniprot_id"] == "P0CG47"
    assert results[0]["reviewed"] is True


def test_protein_status_endpoint(monkeypatch) -> None:
    """The protein status endpoint should expose both service flags."""
    monkeypatch.delenv("HF_API_KEY", raising=False)
    state = SimpleNamespace(protein_predictor=ProteinPredictor(api_key=""), uniprot_client=UniProtClient())
    payload = asyncio.run(status(SimpleNamespace(app=SimpleNamespace(state=state))))
    assert {"esmfold_available", "uniprot_available", "message"}.issubset(payload)


def test_predict_without_key() -> None:
    """Prediction without a token should return a renderable mock PDB."""
    result = ProteinPredictor(api_key="").predict_structure("ACDEFG")
    assert result["method"] == "mock"
    assert result["pdb_string"].startswith("HEADER")
    assert "ATOM" in result["pdb_string"]


def test_mock_prediction_uses_three_dimensional_backbone() -> None:
    """The offline fallback should form a visible helix instead of a straight line."""
    pdb_string = ProteinPredictor(api_key="").predict_structure("ACDEFGHIK")["pdb_string"]
    alpha_carbons = [line for line in pdb_string.splitlines() if line.startswith("ATOM") and line[12:16].strip() == "CA"]
    y_coordinates = {round(float(line[38:46]), 2) for line in alpha_carbons}
    z_coordinates = {round(float(line[46:54]), 2) for line in alpha_carbons}
    assert len(y_coordinates) > 3
    assert len(z_coordinates) > 3
