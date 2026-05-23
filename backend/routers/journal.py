# Phase 4 — Double-entry journal endpoints + service helpers.
#
# The accounting model:
#   - journal_entries rows have a JSONB column `entries` containing
#     [{account_code, debit, credit, ...}, ...]
#   - For every business transaction we create one journal_entries row whose
#     debits and credits sum to the same total. /api/journal/validate scans
#     the table and returns any rows whose totals are unbalanced.
#
# Routes:
#   - POST   /api/journal           — create a manual entry
#   - GET    /api/journal           — list with optional filters
#   - GET    /api/journal/{id}      — fetch one
#   - POST   /api/journal/validate  — sum(debit) vs sum(credit) per row
#
# Helper functions are imported by main.py so POS / invoices / purchases /
# expenses can auto-create entries.

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from supabase import Client

logger = logging.getLogger("partspro.backend.journal")
router = APIRouter(prefix="/api/journal", tags=["Journal"])


class JournalLine(BaseModel):
    account_code: str
    debit: float = 0
    credit: float = 0
    description: Optional[str] = ""


class JournalEntry(BaseModel):
    id: Optional[str] = None
    date: str
    description: str
    entries: List[JournalLine]
    ref_id: Optional[str] = ""
    ref_type: Optional[str] = ""


async def _supabase():
    # Late import so this module is decoupled from main.py's get_supabase definition.
    from main import get_supabase
    return await get_supabase()


@router.post("")
async def create_journal_entry(entry: JournalEntry, supabase: Client = Depends(_supabase)):
    if not entry.id:
        entry.id = f"JE-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    debits = sum(line.debit for line in entry.entries)
    credits = sum(line.credit for line in entry.entries)
    if round(abs(debits - credits), 2) > 0.01:
        raise HTTPException(
            status_code=422,
            detail=f"Unbalanced journal entry: debits={debits} credits={credits}",
        )
    body = entry.dict()
    # entries is a list of pydantic objects; Supabase wants JSON
    body["entries"] = [line.dict() for line in entry.entries]
    res = supabase.table("journal_entries").upsert(body, on_conflict="id").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create journal entry")
    return {"data": res.data[0]}


@router.get("")
async def list_journal_entries(
    supabase: Client = Depends(_supabase),
    ref_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    q = supabase.table("journal_entries").select("*")
    if ref_type:
        q = q.eq("ref_type", ref_type)
    if date_from:
        q = q.gte("date", date_from)
    if date_to:
        q = q.lte("date", date_to)
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"data": res.data}


@router.get("/validate")
async def validate_journal(supabase: Client = Depends(_supabase)):
    res = supabase.table("journal_entries").select("*").execute()
    imbalances: List[Dict[str, Any]] = []
    total_debit = 0.0
    total_credit = 0.0
    for row in res.data or []:
        entries = row.get("entries") or []
        d = sum(float(e.get("debit", 0) or 0) for e in entries)
        c = sum(float(e.get("credit", 0) or 0) for e in entries)
        total_debit += d
        total_credit += c
        if round(abs(d - c), 2) > 0.01:
            imbalances.append({"id": row["id"], "date": row.get("date"), "debit": d, "credit": c, "diff": d - c})
    return {
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balanced": round(abs(total_debit - total_credit), 2) <= 0.01,
        "imbalances": imbalances,
    }


@router.get("/{entry_id}")
async def get_journal_entry(entry_id: str, supabase: Client = Depends(_supabase)):
    res = supabase.table("journal_entries").select("*").eq("id", entry_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"data": res.data[0]}


# ════════════════════════════════════════════════════════════
# Helpers — imported by main.py to auto-create journal entries on business events.
# ════════════════════════════════════════════════════════════

EXPENSE_ACCOUNT_BY_CATEGORY = {
    "إيجار": "6110",
    "كهرباء": "6120",
    "مياه": "6130",
    "رواتب": "6140",
    "نثريات": "6150",
}


def build_purchase_journal(purchase: Dict[str, Any]) -> Dict[str, Any]:
    """Dr Inventory, Cr Suppliers (and VAT split if present)."""
    lines = [
        {"account_code": "1210", "debit": float(purchase.get("subtotal", 0)), "credit": 0,
         "description": "شراء بضاعة"},
    ]
    if float(purchase.get("vat", 0)) > 0:
        lines.append({"account_code": "2110", "debit": float(purchase["vat"]), "credit": 0,
                      "description": "ضريبة مدخلات"})
    lines.append({"account_code": "2120", "debit": 0, "credit": float(purchase.get("total", 0)),
                  "description": "موردون دائنون"})
    return {
        "id": f"JE-PUR-{purchase['id']}",
        "date": purchase["date"],
        "description": f"فاتورة شراء {purchase['id']}",
        "entries": lines,
        "ref_id": purchase["id"],
        "ref_type": "purchase",
    }


def build_expense_journal(expense: Dict[str, Any]) -> Dict[str, Any]:
    """Dr Expense account (by category), Cr Cash/Bank."""
    expense_acct = EXPENSE_ACCOUNT_BY_CATEGORY.get(expense.get("category", ""), "6150")
    cash_acct = "1110" if expense.get("payment", "نقدي") in ("نقدي", "Cash") else "1120"
    amount = float(expense.get("amount", 0))
    return {
        "id": f"JE-EXP-{expense['id']}",
        "date": expense["date"],
        "description": f"{expense.get('category', 'مصروف')} — {expense.get('description', '')}",
        "entries": [
            {"account_code": expense_acct, "debit": amount, "credit": 0, "description": expense.get("category", "")},
            {"account_code": cash_acct, "debit": 0, "credit": amount, "description": expense.get("payment", "نقدي")},
        ],
        "ref_id": expense["id"],
        "ref_type": "expense",
    }
