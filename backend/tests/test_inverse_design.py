"""Tests for inverse design search."""

from __future__ import annotations

from core.inverse_design_engine import InverseDesignEngine


def test_inverse_design_returns_requested_candidate_count() -> None:
    """Inverse design should return the requested number of candidates."""
    engine = InverseDesignEngine()
    candidates = engine.optimize("bandgap_ev", 3.0, n_candidates=3)
    assert len(candidates) == 3
    assert all("smiles" in candidate for candidate in candidates)
    assert all(isinstance(candidate["score"], float) for candidate in candidates)


def test_inverse_design_scores_are_sorted() -> None:
    """Candidate scores should be sorted from best to worst."""
    engine = InverseDesignEngine()
    candidates = engine.optimize("hardness_gpa", 12.0, n_candidates=5)
    scores = [candidate["score"] for candidate in candidates]
    assert scores == sorted(scores)
