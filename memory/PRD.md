# Parts Pro ERP — Product Requirements & Architecture

## Original Problem Statement

Build a production-ready Auto Parts ERP for an Arabic-RTL market with:
- Inventory + multi-warehouse stock
- POS with VAT (15%), invoices, customers, receivables
- Supplier purchases + payables
- Expenses, double-entry accounting, journal entries, chart of accounts
- Liquids (fluids inventory) + vehicle service records
- Analytics dashboard with multi-tab charts
- Offline-first with cloud sync (Supabase)
- AI assistant (J.A.R.V.I.S) for natural-language queries and quick actions

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind + Radix UI + TanStack React Query v5
- **Backend**: FastAPI 0.115 + httpx + pydantic v2
- **Database**: Supabase (PostgreSQL + PostgREST + Auth)
- **AI**: Groq + Google Gemini, both proxied via backend (no SDK keys in browser)
- **Forms**: Zod validation + DOMPurify sanitization
- **Build**: yarn / Vite HMR / supervisor

## Architecture

```
/app
├── backend/
│   ├── main.py                       (FastAPI entry, all CRUD + sync endpoints)
│   ├── routers/
│   │   ├── ai.py                     (Groq + Gemini proxy, server-side keys)
│   │   ├── auth.py                   (Supabase auth proxy: signup/login/me/refresh/logout)
│   │   ├── journal.py                (Double-entry journal helpers)
│   │   ├── finance.py
│   │   └── inventory_movements.py
│   ├── migration_v2.sql              (Initial schema)
│   ├── migration_v3_rls.sql          (RLS — NOT applied yet, ships in soft mode)
│   ├── migration_v5_inventory_movements.sql  (✅ applied)
│   └── migration_v6_supplier_id.sql  (✅ applied)
└── frontend/
    └── src/
        ├── App.tsx                   (Monolithic UI — surgical edits only)
        ├── components/
        │   ├── ErrorBoundary.tsx     (Per-page error boundary with label prop)
        │   ├── AuthModal.tsx
        │   └── ui/                   (shadcn primitives)
        ├── services/
        │   ├── apiClient.ts          (axios + JWT bearer + 401 refresh)
        │   ├── auth.ts               (Supabase auth via backend proxy)
        │   ├── aiBackend.ts          (AI proxy client)
        │   └── jarvis.ts             (J.A.R.V.I.S, server-side AI)
        ├── lib/
        │   ├── validation.ts         (Zod schemas)
        │   └── sanitize.ts           (DOMPurify wrappers)
        └── hooks/api/                (React Query hooks)
```

## Phase Roadmap

| Phase | Status | Notes |
|---|---|---|
| 1. App replacement (Parts Pro ERP) | ✅ DONE | Replaced old Workshop Management |
| 2. Backend CRUD + Supabase wiring  | ✅ DONE | All entities have GET/PUT/DELETE/POST |
| 3. Frontend ↔ Backend via React Query | ✅ DONE | localStorage demoted to offline cache |
| **4. Security & Critical Bugs**     | ✅ **DONE (2026-05-24)** | See below |
| 5. Enhancements (PDF, barcode, WhatsApp, JARVIS) | ⏳ Backlog |

## Phase 4 — Completed 2026-05-24

| Sub | Item | Status |
|---|---|---|
| Mini-fix | Free-text brand/category (no enum)        | ✅ |
| 4.1 | Centralized Zod + DOMPurify on all forms     | ✅ Runtime-tested |
| 4.2 | Seed-data resurrection fixed (booted gate)   | ✅ Wipe+reload verified |
| 4.3 | Groq/Google AI keys behind backend proxy     | ✅ `routers/ai.py` |
| 4.4 | Real Supabase Auth (login/signup/refresh)    | ✅ End-to-end curl verified |
| 4.5 | Tighten RLS (v3_rls.sql)                     | ⚠ Deferred — runs in soft mode (auth gates UI, no row-level filter yet) |
| 4.6 | Double-entry journal hooks on POS/invoices/purchases/expenses | ✅ |
| 4.7 | React Error Boundaries (per-page, labeled)   | ✅ |

### Phase 4.4 Notes (Auth)
- `POST /api/auth/signup?auto_confirm=true` needs `SUPABASE_SERVICE_KEY` in
  `/app/backend/.env`; without it, email-confirmation is required.
- Frontend stores tokens at `localStorage["partspro_jwt"]` / `["partspro_refresh"]`.
- `apiClient.ts` attaches `Authorization: Bearer <jwt>` and refreshes once on 401.
- Login modal opens automatically at boot when no JWT exists.

## Pending / Future (P2 backlog)

- Phase 4.5 RLS tightening (add `user_id` columns first, then enable per-tenant policies)
- Phase 5 Enhancements:
  - PDF export for invoices/purchases
  - Barcode printing for parts
  - WhatsApp templates (Twilio / Infobip)
  - J.A.R.V.I.S deeper actions (one-shot purchase, low-stock auto-order)
- Password reset / change wired through backend (currently surfaces "not yet enabled")
- Multi-warehouse stock allocation (UI exists, backend partial)
- Mobile companion (Expo app at `/app/mobile` is bootstrapped but not running)

## Key API Endpoints

```
GET   /api/health
GET   /api/sync                   — fetch every entity
POST  /api/sync                   — bulk upsert
POST  /api/admin/wipe-all         — wipe (preserves accounts + settings)

CRUD  /api/parts, /api/suppliers, /api/customers
CRUD  /api/invoices, /api/purchases, /api/expenses
CRUD  /api/accounts, /api/liquids, /api/vehicles

POST  /api/pos/checkout           — creates invoice + journal entries
GET   /api/inventory-movements    — read-only movement log

POST  /api/auth/signup
POST  /api/auth/login
GET   /api/auth/me                — requires Bearer
POST  /api/auth/refresh
POST  /api/auth/logout            — requires Bearer

POST  /api/ai/groq/chat           — server-side Groq proxy
POST  /api/ai/gemini/generate     — server-side Gemini proxy
```

## Key DB tables

`parts`, `suppliers`, `customers`, `invoices`, `purchases`, `expenses`,
`accounts`, `settings`, `journal_entries`, `liquids`, `vehicles`,
`liquid_transactions`, `inventory_movements`.

## Security Posture

- ✅ AI provider keys server-side only (Groq + Google)
- ✅ JWT-based auth (Supabase) gates the UI
- ✅ XSS prevention via DOMPurify sanitization at every form save boundary
- ✅ Zod validation at every form save boundary
- ✅ React Error Boundaries on every page (label + retry/reload)
- ⚠ RLS not enabled — backend trusts the JWT but doesn't enforce row-level
  ownership. Acceptable for single-tenant Phase 4 ship; required for multi-
  tenant Phase 5.

## Known Limitations

- Auto-confirm signup requires `SUPABASE_SERVICE_KEY` in backend env
- Password reset / change is stubbed (returns Arabic "not enabled" message)
- Firebase fully removed; `useFirestoreSync` calls are no-ops
