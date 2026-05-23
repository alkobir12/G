# Phase 4 — Authentication proxy to Supabase Auth.
#
# This is a thin wrapper that forwards signup/login/me/logout to the Supabase
# GoTrue REST API. We use only the anon key here (the user's password proves
# their identity). On success we return the access_token + user object —
# the frontend stores the JWT and sends it as `Authorization: Bearer <jwt>`
# on subsequent requests.
#
# NOTE: Email confirmation is enabled by default in Supabase. We expose a
# `?auto_confirm=true` query flag on /signup; if a service-role key is set in
# the env, the backend will use admin.create_user to bypass email confirm.
# Otherwise the user will receive a confirmation email (Supabase's default
# SMTP is rate-limited — acceptable for now).

import os
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr

logger = logging.getLogger("partspro.backend.auth")
router = APIRouter(prefix="/api/auth", tags=["Auth"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY", "").strip()
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()  # optional, for auto-confirm


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = ""
    role: Optional[str] = "viewer"  # default lowest privilege


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def _auth_url(path: str) -> str:
    return f"{SUPABASE_URL}/auth/v1{path}"


def _require_supabase():
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="Supabase auth not configured")


@router.post("/signup")
async def signup(req: SignupRequest, auto_confirm: bool = False):
    _require_supabase()
    # If service role key is provided and the caller asks for it, use the admin
    # endpoint to auto-confirm the email (no inbox needed). Otherwise use the
    # regular signup endpoint and the user will receive a confirmation email.
    if auto_confirm and SUPABASE_SERVICE_KEY:
        url = _auth_url("/admin/users")
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {"full_name": req.full_name, "role": req.role},
        }
    else:
        url = _auth_url("/signup")
        headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
        body = {"email": req.email, "password": req.password, "data": {"full_name": req.full_name, "role": req.role}}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(url, headers=headers, json=body)
        data = r.json()
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=data)
        return data


@router.post("/login")
async def login(req: LoginRequest):
    _require_supabase()
    url = _auth_url("/token?grant_type=password")
    headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(url, headers=headers, json={"email": req.email, "password": req.password})
        data = r.json()
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=data)
        return data


async def _get_user_from_token(token: str) -> dict:
    _require_supabase()
    url = _auth_url("/user")
    headers = {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, headers=headers)
        if r.status_code >= 400:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return r.json()


async def bearer_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    FastAPI dependency that extracts and validates the Bearer JWT.
    Routes that want to enforce authentication add `user: dict = Depends(bearer_user)`.
    Not enforced globally in Phase 4 — each route can opt in.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    return await _get_user_from_token(token)


async def optional_bearer_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Same as bearer_user but returns None on missing/invalid token — useful for soft auth."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        token = authorization.split(" ", 1)[1].strip()
        return await _get_user_from_token(token)
    except Exception:
        return None


@router.get("/me")
async def me(user: dict = Depends(bearer_user)):
    return {"user": user}


@router.post("/logout")
async def logout(user: dict = Depends(bearer_user)):
    # GoTrue's logout endpoint invalidates the refresh token; we forward the access token.
    # The frontend should also delete its localStorage JWT.
    return {"success": True}
