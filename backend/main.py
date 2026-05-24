# Parts Pro — FastAPI Backend
# ════════════════════════════════════════════════════════════════════
#  Response envelope convention:
#    - Lists  : {"data": [...]}
#    - Single : {"data": {...}}
#    - Mutation success-only : {"success": true} or {"success": true, "id": "..."}
#    - Errors : {"error": {"code": "...", "message": "...", "detail": "..."}}
#  HTTP codes:
#    - 200 ok, 201 created (created via POST endpoints), 204 no content
#    - 400 validation / postgrest 4xx, 404 not found (PGRST205/116), 503 Supabase not configured,
#      500 unexpected
# ════════════════════════════════════════════════════════════════════

from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend folder (same dir as this file)
load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("partspro.backend")

# ── Routers ──
from routers.finance import router as finance_router
from routers.ai import router as ai_router
from routers.auth import router as auth_router
from routers.journal import router as journal_router, build_purchase_journal, build_expense_journal
from routers.inventory_movements import router as inventory_movements_router, record_movement

# ── Supabase client (async) ──
from supabase import create_client, Client
from postgrest.exceptions import APIError as PostgrestAPIError

# Read from env ONLY. NEVER fall back to anyone else's Supabase project.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning(
        "SUPABASE_URL and/or SUPABASE_KEY are not set in the environment. "
        "Backend will boot, but any endpoint that calls Supabase will return an error. "
        "Configure them via /app/backend/.env or the in-app Settings page."
    )

app = FastAPI(
    title="Parts Pro API",
    description="Backend API for Parts Pro Auto Parts Management System",
    version="2.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──
_cors_origins_raw = os.getenv("CORS_ORIGINS", "*").strip()
_cors_origins = ["*"] if _cors_origins_raw in ("", "*") else [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase Client ──
async def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (env or Settings page).",
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Global exception handler for PostgREST errors ──
@app.exception_handler(PostgrestAPIError)
async def postgrest_error_handler(request: Request, exc: PostgrestAPIError):
    msg = exc.message if hasattr(exc, "message") else str(exc)
    code = getattr(exc, "code", "") or ""
    details = getattr(exc, "details", None)
    # PGRST116 = no rows returned for .single(); PGRST205 = relation not found
    status = 404 if code in ("PGRST116", "PGRST205") else 400
    logger.warning(f"PostgREST error: code={code} message={msg}")
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": msg, "detail": details}},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Only catches anything not already handled (HTTPException etc. bypass this).
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL", "message": "Internal server error", "detail": str(exc)}},
    )

# ── Include Routers ──
app.include_router(finance_router)
app.include_router(ai_router)
app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(inventory_movements_router)

# ════════════════════════════════════════════════════════════════════
# MODELS
# ════════════════════════════════════════════════════════════════════

class PartModel(BaseModel):
    id: str
    oem: str = ""
    name_ar: str
    brand: str = "عام"
    category: str = "عام"
    model: str = ""
    stock: int = 0
    min_stock: int = 2
    location: str = ""
    cost: float = 0
    price: float = 0
    wholesale: float = 0

class InvoiceItem(BaseModel):
    # part_id is optional — frontend allows free-text items not in the parts table.
    part_id: Optional[str] = None
    name: str
    qty: int
    price: float
    cost: float = 0

class InvoiceModel(BaseModel):
    id: str
    date: str
    customer: str
    phone: str = ""
    items: List[InvoiceItem]
    subtotal: float = 0
    vat: float = 0
    total: float = 0
    payment: str = "نقدي"
    status: str = "مكتمل"

class CustomerModel(BaseModel):
    id: str
    name: str
    phone: str = ""
    email: str = ""
    type: str = "نقدي"
    purchases_count: int = 0
    total_purchases: float = 0
    balance: float = 0
    last_visit: str = ""

class SupplierModel(BaseModel):
    id: str
    name: str
    contact: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    balance: float = 0
    parts_count: int = 0
    status: str = "نشط"

class PurchaseItem(BaseModel):
    # part_id is optional — same rationale as InvoiceItem.
    part_id: Optional[str] = None
    name: str
    qty: int
    cost: float = 0   # default 0; the frontend may only fill `price`
    price: float

class PurchaseModel(BaseModel):
    id: str
    date: str
    supplier: str
    items: List[PurchaseItem]
    subtotal: float = 0
    vat: float = 0
    total: float = 0
    status: str = "مستلم"

class ExpenseModel(BaseModel):
    id: str
    date: str
    category: str
    amount: float = 0
    description: str = ""
    vendor: str = ""
    payment: str = "نقدي"

class AccountModel(BaseModel):
    code: str
    name: str
    type: str = ""
    balance: float = 0
    parent: str = ""

class SettingsModel(BaseModel):
    id: str = "main"
    company_name: str = "Parts Pro"
    address: str = ""
    phone: str = ""
    email: str = ""
    vat_number: str = ""
    cr_number: str = ""
    currency: str = "ر.س"
    vat_enabled: bool = True
    vat_rate: float = 0.15
    invoice_footer: str = "شكراً لتعاملكم معنا"

class LiquidTypeModel(BaseModel):
    id: str
    name: str
    category: str
    brand: str = ""
    capacity: float = 1
    stock: int = 0
    min_stock: int = 5
    cost: float = 0
    price: float = 0
    location: str = ""

class VehicleModel(BaseModel):
    id: str
    plate: str
    make: str = ""
    model: str = ""
    year: int = 2024
    owner: str = ""
    phone: str = ""
    current_km: int = 0
    last_oil_change_km: int = 0
    last_oil_change_date: str = ""
    oil_type: str = ""
    notes: str = ""

class LiquidTransactionModel(BaseModel):
    id: str
    date: str
    vehicle_id: str = ""
    vehicle_plate: str = ""
    liquid_id: str = ""
    liquid_name: str = ""
    category: str = ""
    qty: int = 1
    price: float = 0
    total: float = 0
    km_at_service: int = 0
    worker: str = ""
    notes: str = ""

class POSRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str = "عميل نقدي"
    customer_phone: str = ""
    payment: str = "نقدي"
    items: List[dict]
    subtotal: float
    vat: float
    total: float

class SyncRequest(BaseModel):
    parts: List[dict] = []
    invoices: List[dict] = []
    suppliers: List[dict] = []
    customers: List[dict] = []
    purchases: List[dict] = []
    expenses: List[dict] = []
    accounts: List[dict] = []
    liquids: List[dict] = []
    vehicles: List[dict] = []
    liquid_txns: List[dict] = []

class InfobipSMSRequest(BaseModel):
    to: str
    message: str

class InfobipWhatsAppRequest(BaseModel):
    to: str
    message: str

# ════════════════════════════════════════════════════════════════════
# Shared helpers
# ════════════════════════════════════════════════════════════════════

MAX_LIMIT = 1000

def _validate_limit(limit: int) -> int:
    if limit < 1:
        raise HTTPException(status_code=400, detail="limit must be >= 1")
    if limit > MAX_LIMIT:
        raise HTTPException(status_code=400, detail=f"limit must be <= {MAX_LIMIT}")
    return limit

def _apply_range(q, limit: int, offset: int):
    """Supabase .range(from, to) is inclusive on both ends."""
    return q.range(offset, offset + limit - 1)

def _strip_id(body: Dict[str, Any], key: str = "id") -> Dict[str, Any]:
    """Path is the source of truth for the row identifier — drop the key from the body if present."""
    if not isinstance(body, dict):
        return body
    body = dict(body)
    body.pop(key, None)
    if not body:
        raise HTTPException(status_code=400, detail="Update body is empty")
    return body

def _single_or_404(rows, label: str):
    if not rows:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return rows[0] if isinstance(rows, list) else rows

def _update_response(rows, label: str):
    """Return updated row(s) or 404. Used by every PUT endpoint."""
    if not rows:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return {"data": rows[0] if isinstance(rows, list) else rows}

# ════════════════════════════════════════════════════════════════════
# PARTS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/parts", tags=["Parts"])
async def list_parts(
    supabase: Client = Depends(get_supabase),
    search: Optional[str] = Query(None, description="Match name_ar or oem (ilike)"),
    category: Optional[str] = None,
    low_stock: bool = False,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("parts").select("*")
    if search:
        q = q.or_(f"name_ar.ilike.%{search}%,oem.ilike.%{search}%,id.ilike.%{search}%")
    if category:
        q = q.eq("category", category)
    if low_stock:
        # PostgREST doesn't support col<col comparison directly via REST; fetch then filter in Python.
        # Cheap enough for typical inventory sizes; if it becomes slow we can move to an RPC.
        res = _apply_range(q, limit, offset).execute()
        data = [r for r in (res.data or []) if (r.get("stock") or 0) <= (r.get("min_stock") or 0)]
        return {"data": data}
    res = _apply_range(q, limit, offset).execute()
    return {"data": res.data}

@app.get("/api/parts/{part_id}", tags=["Parts"])
async def get_part(part_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").select("*").eq("id", part_id).execute()
    return {"data": _single_or_404(res.data, "Part")}

@app.post("/api/parts", tags=["Parts"], status_code=201)
async def create_part(part: PartModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").upsert(part.dict(), on_conflict="id").execute()
    return {"data": _single_or_404(res.data, "Part")}

@app.put("/api/parts/{part_id}", tags=["Parts"])
async def update_part(
    part_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("parts").update(body).eq("id", part_id).execute()
    return _update_response(res.data, "Part")

@app.delete("/api/parts/{part_id}", tags=["Parts"])
async def delete_part(part_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").delete().eq("id", part_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Part not found")
    return {"success": True, "id": part_id}

# ════════════════════════════════════════════════════════════════════
# INVOICES
# ════════════════════════════════════════════════════════════════════

@app.get("/api/invoices", tags=["Invoices"])
async def list_invoices(
    supabase: Client = Depends(get_supabase),
    customer: Optional[str] = Query(None, description="Match customer name (ilike)"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("invoices").select("*")
    if customer:
        q = q.ilike("customer", f"%{customer}%")
    if date_from:
        q = q.gte("date", date_from)
    if date_to:
        q = q.lte("date", date_to)
    res = _apply_range(q.order("created_at", desc=True), limit, offset).execute()
    return {"data": res.data}

@app.get("/api/invoices/{invoice_id}", tags=["Invoices"])
async def get_invoice(invoice_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
    return {"data": _single_or_404(res.data, "Invoice")}

@app.post("/api/invoices", tags=["Invoices"], status_code=201)
async def create_invoice(invoice: InvoiceModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("invoices").upsert(invoice.dict(), on_conflict="id").execute()
    # Update stock for items that reference a real part_id
    for item in invoice.items:
        if not item.part_id:
            continue
        current = supabase.table("parts").select("stock").eq("id", item.part_id).execute()
        if current.data:
            new_stock = max(0, current.data[0]["stock"] - item.qty)
            supabase.table("parts").update({"stock": new_stock}).eq("id", item.part_id).execute()
    # Double-entry: Debit Cash/Bank, Credit Sales + VAT
    create_journal_from_invoice(supabase, invoice)
    return {"data": _single_or_404(res.data, "Invoice")}

@app.put("/api/invoices/{invoice_id}", tags=["Invoices"])
async def update_invoice(
    invoice_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("invoices").update(body).eq("id", invoice_id).execute()
    return _update_response(res.data, "Invoice")

@app.delete("/api/invoices/{invoice_id}", tags=["Invoices"])
async def delete_invoice(invoice_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("invoices").delete().eq("id", invoice_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"success": True, "id": invoice_id}

def create_journal_from_invoice(supabase, invoice: InvoiceModel):
    entries = []
    account_code = "1110" if invoice.payment in ["نقدي", "مدى", "Apple Pay"] else "1120"
    entries.append({"account_code": account_code, "debit": invoice.total, "credit": 0})
    entries.append({"account_code": "4100", "debit": 0, "credit": invoice.subtotal})
    if invoice.vat > 0:
        entries.append({"account_code": "2110", "debit": 0, "credit": invoice.vat})
    journal = {
        "id": f"JE-INV-{invoice.id}",
        "date": invoice.date,
        "description": f"فاتورة مبيعات {invoice.id}",
        "entries": entries,
        "ref_id": invoice.id,
        "ref_type": "invoice",
    }
    supabase.table("journal_entries").upsert(journal, on_conflict="id").execute()

# ════════════════════════════════════════════════════════════════════
# CUSTOMERS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/customers", tags=["Customers"])
async def list_customers(
    supabase: Client = Depends(get_supabase),
    search: Optional[str] = Query(None, description="Match name or phone (ilike)"),
    type: Optional[str] = Query(None, description="نقدي / آجل"),
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("customers").select("*")
    if search:
        q = q.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%,email.ilike.%{search}%")
    if type:
        q = q.eq("type", type)
    res = _apply_range(q, limit, offset).execute()
    return {"data": res.data}

@app.get("/api/customers/{customer_id}", tags=["Customers"])
async def get_customer(customer_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("customers").select("*").eq("id", customer_id).execute()
    return {"data": _single_or_404(res.data, "Customer")}

@app.post("/api/customers", tags=["Customers"], status_code=201)
async def create_customer(customer: CustomerModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("customers").upsert(customer.dict(), on_conflict="id").execute()
    return {"data": _single_or_404(res.data, "Customer")}

@app.put("/api/customers/{customer_id}", tags=["Customers"])
async def update_customer(
    customer_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("customers").update(body).eq("id", customer_id).execute()
    return _update_response(res.data, "Customer")

@app.delete("/api/customers/{customer_id}", tags=["Customers"])
async def delete_customer(customer_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("customers").delete().eq("id", customer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True, "id": customer_id}

# ════════════════════════════════════════════════════════════════════
# SUPPLIERS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/suppliers", tags=["Suppliers"])
async def list_suppliers(
    supabase: Client = Depends(get_supabase),
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("suppliers").select("*")
    if search:
        q = q.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%,contact.ilike.%{search}%")
    if status:
        q = q.eq("status", status)
    res = _apply_range(q, limit, offset).execute()
    return {"data": res.data}

@app.get("/api/suppliers/{supplier_id}", tags=["Suppliers"])
async def get_supplier(supplier_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("suppliers").select("*").eq("id", supplier_id).execute()
    return {"data": _single_or_404(res.data, "Supplier")}

@app.post("/api/suppliers", tags=["Suppliers"], status_code=201)
async def create_supplier(supplier: SupplierModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("suppliers").upsert(supplier.dict(), on_conflict="id").execute()
    return {"data": _single_or_404(res.data, "Supplier")}

@app.put("/api/suppliers/{supplier_id}", tags=["Suppliers"])
async def update_supplier(
    supplier_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("suppliers").update(body).eq("id", supplier_id).execute()
    return _update_response(res.data, "Supplier")

@app.delete("/api/suppliers/{supplier_id}", tags=["Suppliers"])
async def delete_supplier(supplier_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("suppliers").delete().eq("id", supplier_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"success": True, "id": supplier_id}

# ════════════════════════════════════════════════════════════════════
# PURCHASES
# ════════════════════════════════════════════════════════════════════

@app.get("/api/purchases", tags=["Purchases"])
async def list_purchases(
    supabase: Client = Depends(get_supabase),
    supplier: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("purchases").select("*")
    if supplier:
        q = q.ilike("supplier", f"%{supplier}%")
    if date_from:
        q = q.gte("date", date_from)
    if date_to:
        q = q.lte("date", date_to)
    res = _apply_range(q.order("created_at", desc=True), limit, offset).execute()
    return {"data": res.data}

@app.get("/api/purchases/{purchase_id}", tags=["Purchases"])
async def get_purchase(purchase_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("purchases").select("*").eq("id", purchase_id).execute()
    return {"data": _single_or_404(res.data, "Purchase")}

@app.post("/api/purchases", tags=["Purchases"], status_code=201)
async def create_purchase(purchase: PurchaseModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("purchases").upsert(purchase.dict(), on_conflict="id").execute()
    # Double-entry: Dr Inventory + VAT, Cr Suppliers (Phase 4 §C6)
    try:
        je = build_purchase_journal(purchase.dict())
        supabase.table("journal_entries").upsert(je, on_conflict="id").execute()
    except Exception as e:  # noqa: BLE001
        logger.warning(f"purchase journal failed: {e}")
    return {"data": _single_or_404(res.data, "Purchase")}

@app.put("/api/purchases/{purchase_id}", tags=["Purchases"])
async def update_purchase(
    purchase_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("purchases").update(body).eq("id", purchase_id).execute()
    return _update_response(res.data, "Purchase")

@app.delete("/api/purchases/{purchase_id}", tags=["Purchases"])
async def delete_purchase(purchase_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("purchases").delete().eq("id", purchase_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {"success": True, "id": purchase_id}

# ════════════════════════════════════════════════════════════════════
# EXPENSES
# ════════════════════════════════════════════════════════════════════

@app.get("/api/expenses", tags=["Expenses"])
async def list_expenses(
    supabase: Client = Depends(get_supabase),
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("expenses").select("*")
    if category:
        q = q.eq("category", category)
    if date_from:
        q = q.gte("date", date_from)
    if date_to:
        q = q.lte("date", date_to)
    res = _apply_range(q.order("created_at", desc=True), limit, offset).execute()
    return {"data": res.data}

@app.get("/api/expenses/{expense_id}", tags=["Expenses"])
async def get_expense(expense_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("expenses").select("*").eq("id", expense_id).execute()
    return {"data": _single_or_404(res.data, "Expense")}

@app.post("/api/expenses", tags=["Expenses"], status_code=201)
async def create_expense(expense: ExpenseModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("expenses").upsert(expense.dict(), on_conflict="id").execute()
    # Double-entry: Dr Expense (by category), Cr Cash/Bank (Phase 4 §C6)
    try:
        je = build_expense_journal(expense.dict())
        supabase.table("journal_entries").upsert(je, on_conflict="id").execute()
    except Exception as e:  # noqa: BLE001
        logger.warning(f"expense journal failed: {e}")
    return {"data": _single_or_404(res.data, "Expense")}

@app.put("/api/expenses/{expense_id}", tags=["Expenses"])
async def update_expense(
    expense_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("expenses").update(body).eq("id", expense_id).execute()
    return _update_response(res.data, "Expense")

@app.delete("/api/expenses/{expense_id}", tags=["Expenses"])
async def delete_expense(expense_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("expenses").delete().eq("id", expense_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True, "id": expense_id}

# ════════════════════════════════════════════════════════════════════
# ACCOUNTS (chart of accounts)
# ════════════════════════════════════════════════════════════════════

@app.get("/api/accounts", tags=["Accounts"])
async def list_accounts(supabase: Client = Depends(get_supabase)):
    res = supabase.table("accounts").select("*").order("code").execute()
    return {"data": res.data}

@app.get("/api/accounts/{code}/ledger", tags=["Accounts"])
async def account_ledger(code: str, supabase: Client = Depends(get_supabase)):
    account = supabase.table("accounts").select("*").eq("code", code).execute()
    journals = supabase.table("journal_entries").select("*").execute()
    entries = []
    for j in journals.data or []:
        for e in j.get("entries", []):
            if e.get("account_code") == code:
                entries.append({
                    "date": j["date"],
                    "description": j["description"],
                    "debit": e.get("debit", 0),
                    "credit": e.get("credit", 0),
                    "ref_id": j.get("ref_id"),
                })
    return {"account": (account.data[0] if account.data else None), "entries": entries}

@app.post("/api/accounts", tags=["Accounts"], status_code=201)
async def create_account(account: AccountModel, supabase: Client = Depends(get_supabase)):
    # Idempotent upsert keyed on `code` (the primary key of the accounts table).
    res = supabase.table("accounts").upsert(account.dict(), on_conflict="code").execute()
    return {"data": _single_or_404(res.data, "Account")}

@app.put("/api/accounts/{code}", tags=["Accounts"])
async def update_account(
    code: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body, key="code")
    res = supabase.table("accounts").update(body).eq("code", code).execute()
    return _update_response(res.data, "Account")

# ════════════════════════════════════════════════════════════════════
# SETTINGS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/settings", tags=["Settings"])
async def list_settings(supabase: Client = Depends(get_supabase)):
    res = supabase.table("settings").select("*").execute()
    return {"data": res.data}

@app.get("/api/settings/{settings_id}", tags=["Settings"])
async def get_settings(settings_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("settings").select("*").eq("id", settings_id).execute()
    return {"data": _single_or_404(res.data, "Settings")}

@app.post("/api/settings", tags=["Settings"], status_code=201)
async def create_settings(settings: SettingsModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("settings").upsert(settings.dict(), on_conflict="id").execute()
    return {"data": _single_or_404(res.data, "Settings")}

@app.put("/api/settings/{settings_id}", tags=["Settings"])
async def update_settings(
    settings_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    # Upsert so that a brand-new settings row can be created via PUT
    # (the frontend always knows the id 'main').
    body["id"] = settings_id
    res = supabase.table("settings").upsert(body, on_conflict="id").execute()
    return _update_response(res.data, "Settings")

# ════════════════════════════════════════════════════════════════════
# LIQUIDS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/liquids", tags=["Liquids"])
async def list_liquids(
    supabase: Client = Depends(get_supabase),
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("liquids").select("*")
    if category:
        q = q.eq("category", category)
    if search:
        q = q.or_(f"name.ilike.%{search}%,brand.ilike.%{search}%")
    res = _apply_range(q, limit, offset).execute()
    return {"data": res.data}

@app.get("/api/liquids/{liquid_id}", tags=["Liquids"])
async def get_liquid(liquid_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquids").select("*").eq("id", liquid_id).execute()
    return {"data": _single_or_404(res.data, "Liquid")}

@app.post("/api/liquids", tags=["Liquids"], status_code=201)
async def create_liquid(liquid: LiquidTypeModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquids").upsert(liquid.dict(), on_conflict="id").execute()
    return {"data": _single_or_404(res.data, "Liquid")}

@app.put("/api/liquids/{liquid_id}", tags=["Liquids"])
async def update_liquid(
    liquid_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("liquids").update(body).eq("id", liquid_id).execute()
    return _update_response(res.data, "Liquid")

@app.delete("/api/liquids/{liquid_id}", tags=["Liquids"])
async def delete_liquid(liquid_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquids").delete().eq("id", liquid_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Liquid not found")
    return {"success": True, "id": liquid_id}

# ════════════════════════════════════════════════════════════════════
# VEHICLES
# ════════════════════════════════════════════════════════════════════

@app.get("/api/vehicles", tags=["Vehicles"])
async def list_vehicles(
    supabase: Client = Depends(get_supabase),
    search: Optional[str] = Query(None, description="Match plate / owner (ilike)"),
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("vehicles").select("*")
    if search:
        q = q.or_(f"plate.ilike.%{search}%,owner.ilike.%{search}%,phone.ilike.%{search}%")
    res = _apply_range(q, limit, offset).execute()
    return {"data": res.data}

@app.get("/api/vehicles/{vehicle_id}", tags=["Vehicles"])
async def get_vehicle(vehicle_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("vehicles").select("*").eq("id", vehicle_id).execute()
    return {"data": _single_or_404(res.data, "Vehicle")}

@app.post("/api/vehicles", tags=["Vehicles"], status_code=201)
async def create_vehicle(vehicle: VehicleModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("vehicles").upsert(vehicle.dict(), on_conflict="id").execute()
    return {"data": _single_or_404(res.data, "Vehicle")}

@app.put("/api/vehicles/{vehicle_id}", tags=["Vehicles"])
async def update_vehicle(
    vehicle_id: str,
    body: Dict[str, Any],
    supabase: Client = Depends(get_supabase),
):
    body = _strip_id(body)
    res = supabase.table("vehicles").update(body).eq("id", vehicle_id).execute()
    return _update_response(res.data, "Vehicle")

@app.delete("/api/vehicles/{vehicle_id}", tags=["Vehicles"])
async def delete_vehicle(vehicle_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("vehicles").delete().eq("id", vehicle_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"success": True, "id": vehicle_id}

# ════════════════════════════════════════════════════════════════════
# LIQUID TRANSACTIONS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/liquid-transactions", tags=["Liquid Transactions"])
async def list_liquid_txns(
    supabase: Client = Depends(get_supabase),
    vehicle_id: Optional[str] = None,
    liquid_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(200, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    _validate_limit(limit)
    q = supabase.table("liquid_transactions").select("*")
    if vehicle_id:
        q = q.eq("vehicle_id", vehicle_id)
    if liquid_id:
        q = q.eq("liquid_id", liquid_id)
    if date_from:
        q = q.gte("date", date_from)
    if date_to:
        q = q.lte("date", date_to)
    res = _apply_range(q.order("created_at", desc=True), limit, offset).execute()
    return {"data": res.data}

@app.post("/api/liquid-transactions", tags=["Liquid Transactions"], status_code=201)
async def create_liquid_txn(txn: LiquidTransactionModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquid_transactions").upsert(txn.dict(), on_conflict="id").execute()
    # Update liquid stock
    if txn.liquid_id:
        current = supabase.table("liquids").select("stock").eq("id", txn.liquid_id).execute()
        if current.data:
            new_stock = max(0, current.data[0]["stock"] - txn.qty)
            supabase.table("liquids").update({"stock": new_stock}).eq("id", txn.liquid_id).execute()
    # Update vehicle service history
    if txn.vehicle_id:
        supabase.table("vehicles").update({
            "last_oil_change_km": txn.km_at_service,
            "last_oil_change_date": txn.date,
            "oil_type": txn.liquid_id,
        }).eq("id", txn.vehicle_id).execute()
    return {"data": _single_or_404(res.data, "Liquid Transaction")}

@app.delete("/api/liquid-transactions/{tx_id}", tags=["Liquid Transactions"])
async def delete_liquid_txn(tx_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquid_transactions").delete().eq("id", tx_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Liquid transaction not found")
    return {"success": True, "id": tx_id}

# ════════════════════════════════════════════════════════════════════
# POS
# ════════════════════════════════════════════════════════════════════

@app.post("/api/pos/checkout", tags=["POS"], status_code=201)
async def pos_checkout(req: POSRequest, supabase: Client = Depends(get_supabase)):
    invoice_id = f"INV-{datetime.now().strftime('%Y-%m-%d')}-{datetime.now().strftime('%H%M%S')}"
    invoice = {
        "id": invoice_id,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "customer": req.customer_name,
        "phone": req.customer_phone,
        "items": req.items,
        "subtotal": req.subtotal,
        "vat": req.vat,
        "total": req.total,
        "payment": req.payment,
        "status": "مكتمل",
    }
    supabase.table("invoices").insert(invoice).execute()
    for item in req.items:
        pid = item.get("part_id")
        if not pid:
            continue
        current = supabase.table("parts").select("stock").eq("id", pid).execute()
        if current.data:
            new_stock = max(0, current.data[0]["stock"] - item.get("qty", 0))
            supabase.table("parts").update({"stock": new_stock}).eq("id", pid).execute()
    create_journal_from_invoice(supabase, InvoiceModel(**invoice))
    return {"data": {"invoice_id": invoice_id}, "success": True}

# ════════════════════════════════════════════════════════════════════
# SYNC
# ════════════════════════════════════════════════════════════════════

@app.post("/api/sync", tags=["Sync"])
async def sync_all(data: SyncRequest, supabase: Client = Depends(get_supabase)):
    errors = []
    tables = [
        ("parts", data.parts),
        ("invoices", data.invoices),
        ("suppliers", data.suppliers),
        ("customers", data.customers),
        ("purchases", data.purchases),
        ("expenses", data.expenses),
        ("liquids", data.liquids),
        ("vehicles", data.vehicles),
        ("liquid_transactions", data.liquid_txns),
    ]
    for table, rows in tables:
        if rows:
            try:
                supabase.table(table).upsert(rows, on_conflict="id").execute()
            except Exception as e:  # noqa: BLE001
                errors.append(f"{table}: {e}")
    # Accounts use `code` PK, not `id`
    if data.accounts:
        try:
            supabase.table("accounts").upsert(data.accounts, on_conflict="code").execute()
        except Exception as e:  # noqa: BLE001
            errors.append(f"accounts: {e}")
    return {"success": len(errors) == 0, "errors": errors}

@app.get("/api/sync", tags=["Sync"])
async def fetch_all(supabase: Client = Depends(get_supabase)):
    tables = [
        "parts", "invoices", "suppliers", "customers", "purchases", "expenses",
        "accounts", "liquids", "vehicles", "liquid_transactions", "settings",
    ]
    result: Dict[str, Any] = {}
    for table in tables:
        res = supabase.table(table).select("*").execute()
        result[table] = res.data or []
    return result

# ════════════════════════════════════════════════════════════════════
# COMMUNICATIONS (Infobip)
# ════════════════════════════════════════════════════════════════════

INFOBIP_KEY = os.getenv("INFOBIP_API_KEY", "").strip()
INFOBIP_BASE = os.getenv("INFOBIP_BASE_URL", "https://api.infobip.com").strip()

@app.post("/api/send-sms", tags=["Communications"])
async def send_sms_api(req: InfobipSMSRequest):
    if not INFOBIP_KEY:
        raise HTTPException(status_code=503, detail="Infobip not configured (INFOBIP_API_KEY missing)")
    import httpx
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{INFOBIP_BASE}/sms/2/text/advanced",
            headers={"Authorization": f"App {INFOBIP_KEY}", "Content-Type": "application/json"},
            json={"messages": [{"destinations": [{"to": req.to.replace("+", "")}], "from": "PartsPro", "text": req.message}]},
        )
        return resp.json()

@app.post("/api/send-whatsapp", tags=["Communications"])
async def send_whatsapp_api(req: InfobipWhatsAppRequest):
    if not INFOBIP_KEY:
        raise HTTPException(status_code=503, detail="Infobip not configured (INFOBIP_API_KEY missing)")
    import httpx
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{INFOBIP_BASE}/whatsapp/1/message/text",
            headers={"Authorization": f"App {INFOBIP_KEY}", "Content-Type": "application/json"},
            json={"from": "PartsPro", "to": req.to.replace("+", ""), "content": {"body": {"text": req.message, "type": "TEXT"}}},
        )
        return resp.json()

# ════════════════════════════════════════════════════════════════════
# ANALYTICS
# ════════════════════════════════════════════════════════════════════

@app.get("/api/analytics/summary", tags=["Analytics"])
async def analytics_summary(supabase: Client = Depends(get_supabase)):
    parts = supabase.table("parts").select("*").execute().data or []
    invoices = supabase.table("invoices").select("*").execute().data or []
    expenses = supabase.table("expenses").select("*").execute().data or []
    return {
        "parts_count": len(parts),
        "total_stock": sum(p.get("stock", 0) for p in parts),
        "total_sales": sum(i.get("total", 0) for i in invoices),
        "total_expenses": sum(e.get("amount", 0) for e in expenses),
        "invoices_count": len(invoices),
        "expenses_count": len(expenses),
    }

# ════════════════════════════════════════════════════════════════════
# ADMIN
# ════════════════════════════════════════════════════════════════════

WIPE_TABLES = [
    "liquid_transactions", "invoices", "purchases", "expenses",
    "liquids", "vehicles", "parts", "customers", "suppliers",
]

@app.post("/api/admin/wipe-all", tags=["Admin"])
async def wipe_all(supabase: Client = Depends(get_supabase)):
    """
    Hard-delete every row from every business table.
    Uses `.neq('id', '__never_match_xyz__')` so PostgREST returns the deleted rows
    (otherwise it returns nothing because RLS hides the response payload).
    Accounts table is intentionally skipped — its 28 chart-of-accounts rows are
    seeded by the migration and would be lost permanently.
    """
    counts: Dict[str, Any] = {}
    for t in WIPE_TABLES:
        try:
            res = supabase.table(t).delete().neq("id", "__never_match_xyz__").execute()
            counts[t] = len(res.data) if getattr(res, "data", None) else 0
        except Exception as e:  # noqa: BLE001
            counts[t] = f"error: {str(e)[:120]}"
    return {"success": True, "deleted": counts}


# ════════════════════════════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════════════════════════════

@app.get("/api/", tags=["Health"])
async def api_root():
    return {"status": "Parts Pro API is running", "version": "2.1.0"}

@app.get("/", tags=["Health"])
async def root():
    return {"status": "Parts Pro API is running", "version": "2.1.0"}

@app.get("/api/health", tags=["Health"])
async def api_health():
    return {"status": "healthy"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

# ════════════════════════════════════════════════════════════════════
# RUN
# ════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
