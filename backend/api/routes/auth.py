"""Supabase authentication and profile routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from core.supabase_client import SupabaseGateway, get_gateway
from core.telemetry import track


router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str | None = None
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class RefreshRequest(BaseModel):
    refresh_token: str


class ProfileUpdate(BaseModel):
    username: str | None = Field(None, min_length=2, max_length=40)
    full_name: str | None = Field(None, max_length=100)
    avatar_url: str | None = None


def _gateway(request: Request | None = None) -> SupabaseGateway:
    return getattr(getattr(request, "app", None), "state", object()).supabase if request and hasattr(request.app.state, "supabase") else get_gateway()


def _token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    return authorization.split(" ", 1)[1].strip()


def require_user(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    try:
        user = _gateway(request).get_user(_token(authorization))
        user["profile"] = _gateway(request).profile(user["id"])
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def optional_user(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any] | None:
    if not authorization:
        return None
    return require_user(request, authorization)


def serialize_auth(response: Any) -> dict[str, Any]:
    user = getattr(response, "user", None)
    session = getattr(response, "session", None)
    return {
        "user": {"id": str(user.id), "email": user.email, "metadata": user.user_metadata or {}} if user else None,
        "session": {"access_token": session.access_token, "refresh_token": session.refresh_token, "expires_at": session.expires_at} if session else None,
    }


@router.get("/status")
async def auth_status(request: Request) -> dict[str, Any]:
    return _gateway(request).status()


@router.post("/signup")
async def signup(payload: Credentials, request: Request) -> dict[str, Any]:
    try:
        response = _gateway(request).require_auth().auth.sign_up({"email": payload.email, "password": payload.password, "options": {"data": {"user_name": payload.username, "full_name": payload.full_name}}})
        result = serialize_auth(response)
        track(result.get("user", {}).get("id", payload.email), "user_signed_up", {"method": "email"})
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/login")
async def login(payload: LoginRequest, request: Request) -> dict[str, Any]:
    try:
        return serialize_auth(_gateway(request).require_auth().auth.sign_in_with_password({"email": payload.email, "password": payload.password}))
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/magic-link")
async def magic_link(payload: MagicLinkRequest, request: Request) -> dict[str, bool]:
    try:
        _gateway(request).require_auth().auth.sign_in_with_otp({"email": payload.email})
        return {"sent": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/oauth/{provider}")
async def oauth(provider: str, request: Request, redirect_to: str = "http://localhost:5173") -> dict[str, str]:
    if provider not in {"google", "github"}:
        raise HTTPException(status_code=400, detail="Supported OAuth providers: google, github.")
    try:
        response = _gateway(request).require_auth().auth.sign_in_with_oauth({"provider": provider, "options": {"redirect_to": redirect_to}})
        return {"url": response.url}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/logout")
async def logout(request: Request, authorization: str | None = Header(default=None)) -> dict[str, bool]:
    require_user(request, authorization)
    return {"logged_out": True}


@router.get("/me")
async def me(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return require_user(request, authorization)


@router.put("/profile")
async def update_profile(payload: ProfileUpdate, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    values = payload.model_dump(exclude_none=True)
    if not values:
        return user["profile"]
    try:
        rows = _gateway(request).table("profiles").update(values).eq("id", user["id"]).execute().data
        return rows[0]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/refresh")
async def refresh(payload: RefreshRequest, request: Request) -> dict[str, Any]:
    try:
        return serialize_auth(_gateway(request).require_auth().auth.refresh_session(payload.refresh_token))
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def record_prediction(request: Request, authorization: str | None) -> dict[str, Any] | None:
    """Enforce the free tier daily prediction limit when a user is authenticated."""
    if not authorization:
        return None
    user = require_user(request, authorization)
    profile = user["profile"]
    if profile.get("tier") == "free" and int(profile.get("predictions_today", 0)) >= 10:
        raise HTTPException(status_code=429, detail="Free tier daily limit reached (10 predictions).")
    if not getattr(_gateway(request), "service_available", True):
        return user
    _gateway(request).table("profiles").update({"predictions_today": int(profile.get("predictions_today", 0)) + 1, "predictions_total": int(profile.get("predictions_total", 0)) + 1}).eq("id", user["id"]).execute()
    return user
