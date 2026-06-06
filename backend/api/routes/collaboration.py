"""Molecule sharing, workspaces, forks, and comments."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from api.routes.auth import optional_user, require_user
from core.supabase_client import get_gateway
from core.telemetry import track


router = APIRouter(prefix="/api/collab", tags=["collaboration"])


class MoleculeSave(BaseModel):
    name: str = Field(..., min_length=1)
    smiles: str = Field(..., min_length=1)
    mol_data: dict[str, Any] = Field(default_factory=dict)
    properties: dict[str, Any] = Field(default_factory=dict)
    mp_data: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class ShareRequest(BaseModel):
    is_public: bool = True


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    is_public: bool = False


class InviteRequest(BaseModel):
    email: EmailStr


class CommentCreate(BaseModel):
    molecule_id: str
    content: str = Field(..., min_length=1, max_length=2000)


def gateway(request: Request):
    return getattr(request.app.state, "supabase", None) or get_gateway()


@router.get("/status")
async def status(request: Request) -> dict[str, Any]:
    return gateway(request).status()


@router.post("/molecules/save")
async def save_molecule(payload: MoleculeSave, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    values = payload.model_dump()
    values["user_id"] = user["id"]
    try:
        return gateway(request).table("molecules").insert(values).execute().data[0]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/molecules")
async def list_molecules(request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = require_user(request, authorization)
    return gateway(request).table("molecules").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute().data


@router.get("/molecules/shared/{token}")
async def shared_molecule(token: str, request: Request) -> dict[str, Any]:
    rows = gateway(request).table("molecules").select("*").eq("share_token", token).eq("is_public", True).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Shared molecule not found.")
    gateway(request).rpc("increment_molecule_view", {"target": rows[0]["id"]})
    return rows[0]


@router.get("/molecules/{molecule_id}")
async def get_molecule(molecule_id: str, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    rows = gateway(request).table("molecules").select("*").eq("id", molecule_id).eq("user_id", user["id"]).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Molecule not found.")
    return rows[0]


@router.delete("/molecules/{molecule_id}")
async def delete_molecule(molecule_id: str, request: Request, authorization: str | None = Header(default=None)) -> dict[str, bool]:
    user = require_user(request, authorization)
    gateway(request).table("molecules").delete().eq("id", molecule_id).eq("user_id", user["id"]).execute()
    return {"deleted": True}


@router.post("/molecules/{molecule_id}/share")
async def share_molecule(molecule_id: str, payload: ShareRequest, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    rows = gateway(request).table("molecules").update({"is_public": payload.is_public}).eq("id", molecule_id).eq("user_id", user["id"]).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Molecule not found.")
    track(user["id"], "molecule_shared", {"molecule_id": molecule_id, "is_public": payload.is_public})
    return {**rows[0], "share_url": f"/m/{rows[0]['share_token']}"}


@router.post("/molecules/{molecule_id}/fork")
async def fork_molecule(molecule_id: str, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    rows = gateway(request).table("molecules").select("*").eq("id", molecule_id).eq("is_public", True).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Public molecule not found.")
    source = rows[0]
    values = {key: source[key] for key in ("name", "smiles", "mol_data", "properties", "mp_data", "tags")}
    values.update(user_id=user["id"], name=f"{source['name']} (fork)", forked_from=molecule_id, is_public=False)
    forked = gateway(request).table("molecules").insert(values).execute().data[0]
    gateway(request).rpc("increment_molecule_fork", {"target": molecule_id})
    track(user["id"], "molecule_forked", {"molecule_id": molecule_id})
    return forked


@router.post("/workspaces")
async def create_workspace(payload: WorkspaceCreate, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    return gateway(request).table("shared_workspaces").insert({**payload.model_dump(), "owner_id": user["id"], "members": [user["id"]]}).execute().data[0]


@router.get("/workspaces")
async def list_workspaces(request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = require_user(request, authorization)
    return gateway(request).table("shared_workspaces").select("*").or_(f"owner_id.eq.{user['id']},members.cs.{{{user['id']}}}").execute().data


@router.post("/workspaces/{workspace_id}/invite")
async def invite(workspace_id: str, payload: InviteRequest, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    return gateway(request).table("workspace_invites").upsert({"workspace_id": workspace_id, "email": payload.email, "invited_by": user["id"]}).execute().data[0]


@router.post("/comments")
async def add_comment(payload: CommentCreate, request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_user(request, authorization)
    return gateway(request).table("comments").insert({**payload.model_dump(), "user_id": user["id"]}).execute().data[0]


@router.get("/comments/{molecule_id}")
async def comments(molecule_id: str, request: Request, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    optional_user(request, authorization)
    return gateway(request).table("comments").select("*").eq("molecule_id", molecule_id).order("created_at").execute().data
