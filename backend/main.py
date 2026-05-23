# Parts Pro — Full FastAPI Backend
# Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
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

# ── Supabase client (async) ──
from supabase import create_client, Client

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
    version="2.0.0",
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

# ── Include Routers ──
app.include_router(finance_router)

# ═══════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════

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
    part_id: str
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
    part_id: str
    name: str
    qty: int
    cost: float
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

class JournalEntryModel(BaseModel):
    id: str
    date: str
    description: str
    entries: List[dict]
    ref_id: str = ""
    ref_type: str = ""

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
    vehicle_id: str
    vehicle_plate: str
    liquid_id: str
    liquid_name: str
    category: str
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

# ═══════════════════════════════════════════════
# PARTS API
# ═══════════════════════════════════════════════

@app.get("/api/parts", tags=["Parts"])
async def list_parts(supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").select("*").execute()
    return {"data": res.data}

@app.post("/api/parts", tags=["Parts"])
async def create_part(part: PartModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").upsert(part.dict(), on_conflict="id").execute()
    return {"data": res.data}

@app.put("/api/parts/{part_id}", tags=["Parts"])
async def update_part(part_id: str, part: PartModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").update(part.dict()).eq("id", part_id).execute()
    return {"data": res.data}

@app.delete("/api/parts/{part_id}", tags=["Parts"])
async def delete_part(part_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("parts").delete().eq("id", part_id).execute()
    return {"success": True}

# ═══════════════════════════════════════════════
# INVOICES API
# ═══════════════════════════════════════════════

@app.get("/api/invoices", tags=["Invoices"])
async def list_invoices(supabase: Client = Depends(get_supabase)):
    res = supabase.table("invoices").select("*").execute()
    return {"data": res.data}

@app.post("/api/invoices", tags=["Invoices"])
async def create_invoice(invoice: InvoiceModel, supabase: Client = Depends(get_supabase)):
    # Insert invoice
    res = supabase.table("invoices").upsert(invoice.dict(), on_conflict="id").execute()
    # Update stock
    for item in invoice.items:
        current = supabase.table("parts").select("stock").eq("id", item.part_id).execute()
        if current.data:
            new_stock = max(0, current.data[0]["stock"] - item.qty)
            supabase.table("parts").update({"stock": new_stock}).eq("id", item.part_id).execute()
    # Double-entry: Debit Cash/Bank, Credit Sales + VAT
    create_journal_from_invoice(supabase, invoice)
    return {"data": res.data}

@app.delete("/api/invoices/{invoice_id}", tags=["Invoices"])
async def delete_invoice(invoice_id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("invoices").delete().eq("id", invoice_id).execute()
    return {"success": True}

def create_journal_from_invoice(supabase, invoice: InvoiceModel):
    entries = []
    # Debit: Cash (1110) or Bank (1120)
    account_code = "1110" if invoice.payment in ["نقدي", "مدى", "Apple Pay"] else "1120"
    entries.append({"account_code": account_code, "debit": invoice.total, "credit": 0})
    # Credit: Sales (4100)
    entries.append({"account_code": "4100", "debit": 0, "credit": invoice.subtotal})
    # Credit: VAT Output (2110) if applicable
    if invoice.vat > 0:
        entries.append({"account_code": "2110", "debit": 0, "credit": invoice.vat})
    journal = {
        "id": f"JE-INV-{invoice.id}",
        "date": invoice.date,
        "description": f"فاتورة مبيعات {invoice.id}",
        "entries": entries,
        "ref_id": invoice.id,
        "ref_type": "invoice"
    }
    supabase.table("journal_entries").upsert(journal, on_conflict="id").execute()

# ═══════════════════════════════════════════════
# CUSTOMERS API
# ═══════════════════════════════════════════════

@app.get("/api/customers", tags=["Customers"])
async def list_customers(supabase: Client = Depends(get_supabase)):
    res = supabase.table("customers").select("*").execute()
    return {"data": res.data}

@app.post("/api/customers", tags=["Customers"])
async def create_customer(customer: CustomerModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("customers").upsert(customer.dict(), on_conflict="id").execute()
    return {"data": res.data}

# ═══════════════════════════════════════════════
# SUPPLIERS API
# ═══════════════════════════════════════════════

@app.get("/api/suppliers", tags=["Suppliers"])
async def list_suppliers(supabase: Client = Depends(get_supabase)):
    res = supabase.table("suppliers").select("*").execute()
    return {"data": res.data}

@app.post("/api/suppliers", tags=["Suppliers"])
async def create_supplier(supplier: SupplierModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("suppliers").upsert(supplier.dict(), on_conflict="id").execute()
    return {"data": res.data}

# ═══════════════════════════════════════════════
# PURCHASES API
# ═══════════════════════════════════════════════

@app.get("/api/purchases", tags=["Purchases"])
async def list_purchases(supabase: Client = Depends(get_supabase)):
    res = supabase.table("purchases").select("*").execute()
    return {"data": res.data}

@app.post("/api/purchases", tags=["Purchases"])
async def create_purchase(purchase: PurchaseModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("purchases").upsert(purchase.dict(), on_conflict="id").execute()
    # Double-entry: Debit Purchases/Payable, Credit Cash/Bank
    return {"data": res.data}

# ═══════════════════════════════════════════════
# EXPENSES API
# ═══════════════════════════════════════════════

@app.get("/api/expenses", tags=["Expenses"])
async def list_expenses(supabase: Client = Depends(get_supabase)):
    res = supabase.table("expenses").select("*").execute()
    return {"data": res.data}

@app.post("/api/expenses", tags=["Expenses"])
async def create_expense(expense: ExpenseModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("expenses").upsert(expense.dict(), on_conflict="id").execute()
    return {"data": res.data}

# ═══════════════════════════════════════════════
# ACCOUNTS API
# ═══════════════════════════════════════════════

@app.get("/api/accounts", tags=["Accounts"])
async def list_accounts(supabase: Client = Depends(get_supabase)):
    res = supabase.table("accounts").select("*").execute()
    return {"data": res.data}

@app.get("/api/accounts/{code}/ledger", tags=["Accounts"])
async def account_ledger(code: str, supabase: Client = Depends(get_supabase)):
    # Get account info
    account = supabase.table("accounts").select("*").eq("code", code).execute()
    # Get journal entries
    journals = supabase.table("journal_entries").select("*").execute()
    entries = []
    for j in journals.data:
        for e in j.get("entries", []):
            if e.get("account_code") == code:
                entries.append({
                    "date": j["date"],
                    "description": j["description"],
                    "debit": e.get("debit", 0),
                    "credit": e.get("credit", 0),
                    "ref_id": j.get("ref_id"),
                })
    return {"account": account.data[0] if account.data else None, "entries": entries}

# ═══════════════════════════════════════════════
# LIQUID SYSTEM API
# ═══════════════════════════════════════════════

@app.get("/api/liquids", tags=["Liquids"])
async def list_liquids(supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquids").select("*").execute()
    return {"data": res.data}

@app.post("/api/liquids", tags=["Liquids"])
async def create_liquid(liquid: LiquidTypeModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquids").upsert(liquid.dict(), on_conflict="id").execute()
    return {"data": res.data}

@app.get("/api/vehicles", tags=["Vehicles"])
async def list_vehicles(supabase: Client = Depends(get_supabase)):
    res = supabase.table("vehicles").select("*").execute()
    return {"data": res.data}

@app.post("/api/vehicles", tags=["Vehicles"])
async def create_vehicle(vehicle: VehicleModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("vehicles").upsert(vehicle.dict(), on_conflict="id").execute()
    return {"data": res.data}

@app.get("/api/liquid-transactions", tags=["Liquid Transactions"])
async def list_liquid_txns(supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquid_transactions").select("*").execute()
    return {"data": res.data}

@app.post("/api/liquid-transactions", tags=["Liquid Transactions"])
async def create_liquid_txn(txn: LiquidTransactionModel, supabase: Client = Depends(get_supabase)):
    res = supabase.table("liquid_transactions").upsert(txn.dict(), on_conflict="id").execute()
    # Update liquid stock
    current = supabase.table("liquids").select("stock").eq("id", txn.liquid_id).execute()
    if current.data:
        new_stock = max(0, current.data[0]["stock"] - txn.qty)
        supabase.table("liquids").update({"stock": new_stock}).eq("id", txn.liquid_id).execute()
    # Update vehicle
    supabase.table("vehicles").update({
        "last_oil_change_km": txn.km_at_service,
        "last_oil_change_date": txn.date,
        "oil_type": txn.liquid_id
    }).eq("id", txn.vehicle_id).execute()
    return {"data": res.data}

# ═══════════════════════════════════════════════
# POS API (Double-Entry Accounting)
# ═══════════════════════════════════════════════

@app.post("/api/pos/checkout", tags=["POS"])
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
        "status": "مكتمل"
    }
    # Save invoice
    supabase.table("invoices").insert(invoice).execute()
    # Update stock
    for item in req.items:
        current = supabase.table("parts").select("stock").eq("id", item["part_id"]).execute()
        if current.data:
            new_stock = max(0, current.data[0]["stock"] - item["qty"])
            supabase.table("parts").update({"stock": new_stock}).eq("id", item["part_id"]).execute()
    # Journal Entry
    create_journal_from_invoice(supabase, InvoiceModel(**invoice))
    return {"invoice_id": invoice_id, "success": True}

# ═══════════════════════════════════════════════
# SYNC API
# ═══════════════════════════════════════════════

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
        ("accounts", data.accounts),
        ("liquids", data.liquids),
        ("vehicles", data.vehicles),
        ("liquid_transactions", data.liquid_txns),
    ]
    for table, rows in tables:
        if rows:
            res = supabase.table(table).upsert(rows, on_conflict="id").execute()
            if hasattr(res, 'error') and res.error:
                errors.append(f"{table}: {res.error}")
    return {"success": len(errors) == 0, "errors": errors}

@app.get("/api/sync", tags=["Sync"])
async def fetch_all(supabase: Client = Depends(get_supabase)):
    tables = ["parts", "invoices", "suppliers", "customers", "purchases", "expenses", "accounts", "liquids", "vehicles", "liquid_transactions", "settings"]
    result = {}
    for table in tables:
        res = supabase.table(table).select("*").execute()
        result[table] = res.data or []
    return result

# ═══════════════════════════════════════════════
# INFOBIP API
# ═══════════════════════════════════════════════

INFOBIP_KEY = "21541083b63a455e4d911e59eb4df144-6912c053-35d0-46cd-adcf-abbf950ed629"
INFOBIP_BASE = "https://api.infobip.com"

@app.post("/api/send-sms", tags=["Infobip"])
async def send_sms_api(req: InfobipSMSRequest):
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{INFOBIP_BASE}/sms/2/text/advanced",
            headers={"Authorization": f"App {INFOBIP_KEY}", "Content-Type": "application/json"},
            json={"messages": [{"destinations": [{"to": req.to.replace("+", "")}], "from": "PartsPro", "text": req.message}]}
        )
        return resp.json()

@app.post("/api/send-whatsapp", tags=["Infobip"])
async def send_whatsapp_api(req: InfobipWhatsAppRequest):
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{INFOBIP_BASE}/whatsapp/1/message/text",
            headers={"Authorization": f"App {INFOBIP_KEY}", "Content-Type": "application/json"},
            json={"from": "PartsPro", "to": req.to.replace("+", ""), "content": {"body": {"text": req.message, "type": "TEXT"}}}
        )
        return resp.json()

# ═══════════════════════════════════════════════
# ANALYTICS API
# ═══════════════════════════════════════════════

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

# ═══════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    return {"status": "Parts Pro API is running", "version": "2.0.0"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

# ═══════════════════════════════════════════════
# RUN
# ═══════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
