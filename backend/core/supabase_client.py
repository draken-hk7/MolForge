"""Optional Supabase gateway for authentication and shared data."""

from __future__ import annotations

import os
from typing import Any

try:
    from supabase import Client, create_client
except Exception:  # pragma: no cover - optional dependency fallback
    Client = Any
    create_client = None


class SupabaseGateway:
    """Keep service-role access on the backend and fail clearly when unconfigured."""

    def __init__(self, url: str | None = None, anon_key: str | None = None, service_key: str | None = None) -> None:
        self.url = (url if url is not None else os.getenv("SUPABASE_URL", "")).strip()
        self.anon_key = (anon_key if anon_key is not None else os.getenv("SUPABASE_KEY", "")).strip()
        self.service_key = (service_key if service_key is not None else os.getenv("SUPABASE_SERVICE_KEY", "")).strip()
        self.auth_client = create_client(self.url, self.anon_key) if create_client and self.url and self.anon_key else None
        self.service_client = create_client(self.url, self.service_key) if create_client and self.url and self.service_key else None

    @property
    def auth_available(self) -> bool:
        return self.auth_client is not None

    @property
    def service_available(self) -> bool:
        return self.service_client is not None

    def status(self) -> dict[str, Any]:
        return {
            "configured": self.auth_available,
            "service_configured": self.service_available,
            "project_url": self.url or None,
        }

    def require_auth(self) -> Client:
        if not self.auth_client:
            raise RuntimeError("Supabase Auth is not configured.")
        return self.auth_client

    def require_service(self) -> Client:
        if not self.service_client:
            raise RuntimeError("Supabase service role is not configured.")
        return self.service_client

    def get_user(self, token: str) -> dict[str, Any]:
        response = self.require_auth().auth.get_user(token)
        user = response.user
        if not user:
            raise ValueError("Invalid or expired access token.")
        return {"id": str(user.id), "email": user.email, "metadata": user.user_metadata or {}}

    def profile(self, user_id: str) -> dict[str, Any]:
        rows = self.require_service().table("profiles").select("*").eq("id", user_id).limit(1).execute().data
        return rows[0] if rows else {"id": user_id, "tier": "free"}

    def table(self, name: str):
        return self.require_service().table(name)

    def rpc(self, name: str, params: dict[str, Any]):
        return self.require_service().rpc(name, params).execute().data


_gateway: SupabaseGateway | None = None


def get_gateway() -> SupabaseGateway:
    """Return the process-wide optional Supabase gateway."""
    global _gateway
    if _gateway is None:
        _gateway = SupabaseGateway()
    return _gateway
