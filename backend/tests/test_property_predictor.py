"""Tests for property prediction."""

from __future__ import annotations

import pytest

from core.property_predictor import PROPERTY_RANGES, PropertyPredictor


def test_predict_returns_all_required_keys() -> None:
    """Property predictor should return six material properties."""
    predictor = PropertyPredictor()
    predictions = predictor.predict("CCO")
    assert set(predictions) == set(PROPERTY_RANGES)
    for key, payload in predictions.items():
        assert "value" in payload
        assert "unit" in payload
        assert "confidence" in payload
        assert 0.0 <= float(payload["confidence"]) <= 1.0
        low, high, _unit = PROPERTY_RANGES[key]
        assert low <= float(payload["value"]) <= high


def test_predict_handles_small_edge_case_molecule() -> None:
    """Single-atom molecules should still receive valid property estimates."""
    predictor = PropertyPredictor()
    predictions = predictor.predict("O")
    assert predictions["bandgap_ev"]["value"] >= 0.0
    assert predictions["melting_point_k"]["value"] >= 200.0


def test_predict_rejects_invalid_smiles() -> None:
    """Invalid SMILES should propagate as a ValueError."""
    predictor = PropertyPredictor()
    with pytest.raises(ValueError):
        predictor.predict("not-a-smiles")
