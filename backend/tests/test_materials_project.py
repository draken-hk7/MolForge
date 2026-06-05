"""Tests for Materials Project integration."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

from api.routes.materials_project import status
from core.materials_project_client import MaterialsProjectClient
from core.property_reconciler import PropertyReconciler


def test_mp_client_returns_empty_without_api_key(monkeypatch) -> None:
    """The Materials Project client should not call out or crash without a key."""
    monkeypatch.delenv("MP_API_KEY", raising=False)
    client = MaterialsProjectClient()
    assert client.available is False
    assert client.search_by_formula("SiO2") == []


def test_smiles_to_formula_ethanol() -> None:
    """SMILES to formula conversion should return Hill notation."""
    client = MaterialsProjectClient(api_key=None)
    assert client.smiles_to_formula("CCO") == "C2H6O"


def test_reconciler_with_mock_mp_data() -> None:
    """The reconciler should merge ML predictions and MP summaries."""
    ml_predictions = {
        "bandgap_ev": {"value": 3.0, "unit": "eV", "confidence": 0.8},
        "refractive_index": {"value": 1.8, "unit": "nD", "confidence": 0.7},
    }
    mp_materials = [
        {
            "material_id": "mp-1",
            "formula_pretty": "C2H6O",
            "band_gap": 2.5,
            "energy_above_hull": 0.02,
            "density": 1.1,
            "n": 1.6,
        }
    ]
    reconciled = PropertyReconciler().reconcile(ml_predictions, mp_materials, formula="C2H6O")
    assert reconciled["data_quality"] == "mp_verified"
    assert reconciled["mp_material_id"] == "mp-1"
    assert reconciled["best_match"]["material_id"] == "mp-1"
    assert reconciled["reconciled"]["band_gap"]["ml"] == 3.0
    assert reconciled["reconciled"]["band_gap"]["mp"] == 2.5
    assert reconciled["reconciled"]["density"]["source"] == "mp"


def test_reconciler_handles_empty_mp_data() -> None:
    """The reconciler should preserve ML predictions when MP has no data."""
    ml_predictions = {"bandgap_ev": {"value": 3.0, "unit": "eV", "confidence": 0.8}}
    reconciled = PropertyReconciler().reconcile(ml_predictions, [], formula="C2H6O")
    assert reconciled["data_quality"] == "ml_only"
    assert reconciled["best_match"] is None
    assert reconciled["mp_material_id"] is None
    assert reconciled["reconciled"]["band_gap"]["source"] == "ml"


def test_mp_status_route_returns_expected_structure(monkeypatch) -> None:
    """The MP status route should return availability without exposing a key."""
    monkeypatch.delenv("MP_API_KEY", raising=False)
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(mp_client=MaterialsProjectClient())))
    payload = asyncio.run(status(request))
    assert {"available", "key_set", "cache_size", "message"}.issubset(payload.keys())
    assert "api_key" not in payload
