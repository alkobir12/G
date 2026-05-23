# Phase 4 — AI Proxy (Groq + Gemini) + Auth (Supabase) + Journal
# These routes are imported by main.py via app.include_router(...).
#
# Why server-side: per Phase 4 §C1, the Groq + Google API keys must NOT be
# baked into the JS bundle. The browser now calls these endpoints; the secrets
# stay in /app/backend/.env.

import os
import logging
from typing import List, Optional, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

logger = logging.getLogger("partspro.backend.ai")

router = APIRouter(prefix="/api", tags=["AI"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()


class GroqChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    model: Optional[str] = "llama-3.3-70b-versatile"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024


@router.post("/ai/groq/chat")
async def groq_chat(req: GroqChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured on server")
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "messages": req.messages,
                    "model": req.model,
                    "temperature": req.temperature,
                    "max_tokens": req.max_tokens,
                },
            )
            data = r.json()
            if r.status_code >= 400:
                logger.warning(f"groq error {r.status_code}: {data}")
                raise HTTPException(status_code=r.status_code, detail=data.get("error", data))
            content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
            return {"content": content, "model": req.model, "usage": data.get("usage")}
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"upstream error: {e}")


class GeminiGenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gemini-2.0-flash"


@router.post("/ai/gemini/generate")
async def gemini_generate(req: GeminiGenerateRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY not configured on server")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{req.model}:generateContent?key={GOOGLE_API_KEY}"
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": req.prompt}]}]},
            )
            data = r.json()
            if r.status_code >= 400:
                logger.warning(f"gemini error {r.status_code}: {data}")
                raise HTTPException(status_code=r.status_code, detail=data.get("error", data))
            text = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return {"content": text, "model": req.model}
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"upstream error: {e}")


class GoogleSearchRequest(BaseModel):
    query: str
    num: Optional[int] = 5


@router.post("/ai/google/search")
async def google_search(req: GoogleSearchRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY not configured on server")
    cx = os.getenv("GOOGLE_CSE_ID", "017576662512468239146:omuauf_lfve")
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"key": GOOGLE_API_KEY, "cx": cx, "q": req.query, "num": req.num},
            )
            data = r.json()
            if r.status_code >= 400:
                raise HTTPException(status_code=r.status_code, detail=data.get("error", data))
            items = data.get("items") or []
            return {"results": [{"title": i.get("title"), "snippet": i.get("snippet"), "link": i.get("link")} for i in items[: req.num]]}
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"upstream error: {e}")
