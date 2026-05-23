# Auth Testing Notes — Parts Pro ERP

**No auth setup needed for the testing agent.**

## How the app handles identity

1. **Backend (FastAPI):** No auth. All `/api/*` endpoints are public. No cookies, no JWTs, no
   bearer tokens. Endpoints that depend on Supabase return HTTP 503 "Supabase is not
   configured" until the user pastes Supabase keys via the in-app Settings page.

2. **Frontend (Vite + React):** Uses a localStorage-only auth shim in `src/services/auth.ts`.
   On first load, `setupDefaultAdmin()` creates `admin@partspro.com` / `admin123` (role `admin`)
   and signs in automatically. No network call is involved — it's pure browser state.

## For the tester

- **UI flows:** Just open the preview URL. You'll be auto-signed-in as admin. To test the
  logged-out state, run `localStorage.clear()` in DevTools and reload.
- **Curl / backend:** Hit `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api/*`
  directly. No headers required.
- **Supabase-backed endpoints (`GET /api/parts`, `POST /api/customers`, etc.) will return 503**
  until valid `SUPABASE_URL` + `SUPABASE_KEY` are set in `/app/backend/.env` (or via Settings).
  This is the expected current state — not a bug.

## Key data sources
- `localStorage["partspro"]` — full app state (parts, invoices, etc., seeded from
  `src/data/seed.ts`)
- `localStorage["partspro_runtime_config"]` — user-supplied API keys
- `localStorage["pp_users"]`, `pp_session`, `pp_role` — auth shim
