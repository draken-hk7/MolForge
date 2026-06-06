"""Tests for Phase C authentication helpers."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from api.routes.auth import record_prediction


class UpdateQuery:
    def __init__(self, gateway, values):
        self.gateway = gateway
        self.values = values

    def eq(self, *_args):
        return self

    def execute(self):
        self.gateway.updated = self.values
        return SimpleNamespace(data=[self.values])


class ProfileTable:
    def __init__(self, gateway):
        self.gateway = gateway

    def update(self, values):
        return UpdateQuery(self.gateway, values)


class FakeGateway:
    def __init__(self, count: int):
        self.count = count
        self.updated = None

    def get_user(self, _token):
        return {"id": "user-1", "email": "researcher@example.com", "metadata": {}}

    def profile(self, _user_id):
        return {"id": "user-1", "tier": "free", "predictions_today": self.count, "predictions_total": 20}

    def table(self, name):
        assert name == "profiles"
        return ProfileTable(self)


def request_for(gateway):
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(supabase=gateway)))


def test_record_prediction_increments_free_tier_counters() -> None:
    gateway = FakeGateway(count=3)

    user = record_prediction(request_for(gateway), "Bearer valid-token")

    assert user["id"] == "user-1"
    assert gateway.updated == {"predictions_today": 4, "predictions_total": 21}


def test_record_prediction_enforces_daily_free_tier_limit() -> None:
    with pytest.raises(HTTPException) as error:
        record_prediction(request_for(FakeGateway(count=10)), "Bearer valid-token")

    assert error.value.status_code == 429
