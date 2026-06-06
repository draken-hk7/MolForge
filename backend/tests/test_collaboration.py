"""Tests for molecule collaboration routes."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

from api.routes.collaboration import shared_molecule


class PublicMoleculeQuery:
    def __init__(self, row):
        self.row = row

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args):
        return self

    def limit(self, *_args):
        return self

    def execute(self):
        return SimpleNamespace(data=[self.row])


class FakeGateway:
    def __init__(self):
        self.row = {"id": "molecule-1", "name": "Ethanol", "is_public": True, "share_token": "token-1"}
        self.rpc_calls = []
        self.service_available = True

    def table(self, name):
        assert name == "molecules"
        return PublicMoleculeQuery(self.row)

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))


def test_shared_molecule_increments_view_count() -> None:
    gateway = FakeGateway()
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(supabase=gateway)))

    result = asyncio.run(shared_molecule("token-1", request))

    assert result["name"] == "Ethanol"
    assert gateway.rpc_calls == [("increment_molecule_view", {"target": "molecule-1"})]
