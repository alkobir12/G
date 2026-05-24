# Phase 5 — Inventory movement log + Low-stock helpers.
#
# inventory_movements table is provisioned by migration_v5_inventory_movements.sql.
# This router exposes read access; writes are produced as a side effect of POS /
# invoice / purchase / part-update routes in main.py.

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from supabase import Client

logger = logging.getLogger("partspro.backend.inventory_movements")
router = APIRouter(prefix="/api/inventory-movements", tags=["Inventory Movements"])


class MovementCreate(BaseModel):
    part_id: str
    part_name: Optional[str] = ""
    type: str  # in / out / adjust / wipe
    qty: int = 0
    ref_type: Optional[str] = ""
    ref_id: Optional[str] = ""
    before_stock: Optional[int] = 0
    after_stock: Optional[int] = 0
    user_id: Optional[str] = ""
    note: Optional[str] = ""


async def _supabase():
    from main import get_supabase
    return await get_supabase()


@router.get("")
async def list_movements(
    supabase: Client = Depends(_supabase),
    part_id: Optional[str] = None,
    ref_type: Optional[str] = None,
    type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    q = supabase.table("inventory_movements").select("*")
    if part_id:
        q = q.eq("part_id", part_id)
    if ref_type:
        q = q.eq("ref_type", ref_type)
    if type:
        q = q.eq("type", type)
    if date_from:
        q = q.gte("created_at", date_from)
    if date_to:
        q = q.lte("created_at", date_to)
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"data": res.data}


@router.post("")
async def create_movement(m: MovementCreate, supabase: Client = Depends(_supabase)):
    body = m.dict()
    body["id"] = f"MV-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}"
    res = supabase.table("inventory_movements").upsert(body, on_conflict="id").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create movement")
    return {"data": res.data[0]}


# Helper used by main.py to log automatic movements without a route call.
def record_movement(supabase, *, part_id: str, part_name: str, type: str, qty: int,
                    ref_type: str, ref_id: str, before_stock: int, after_stock: int,
                    user_id: str = "", note: str = "") -> None:
    try:
        supabase.table("inventory_movements").upsert({
            "id": f"MV-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}",
            "part_id": part_id,
            "part_name": part_name or "",
            "type": type,
            "qty": qty,
            "ref_type": ref_type,
            "ref_id": ref_id,
            "before_stock": before_stock,
            "after_stock": after_stock,
            "user_id": user_id,
            "note": note,
        }, on_conflict="id").execute()
    except Exception as e:
        logger.warning(f"inventory movement log failed: {e}")
