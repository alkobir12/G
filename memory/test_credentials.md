# Test Credentials — Parts Pro ERP

## App
- **Preview URL:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com`
- **Backend API base:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api`
- **OpenAPI:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api/openapi.json`
- **Swagger UI:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api/docs`

## Authentication

The Parts Pro frontend ships with a localStorage-only auth layer (`src/services/auth.ts`) that
auto-creates a default admin on first load. Per the H/Q discussion, real authentication will be
added in a later phase; the app is publicly accessible at the preview URL.

### Auto-created default admin (frontend only — localStorage)
- **Email:** `admin@partspro.com`
- **Password:** `admin123`
- **Role:** `admin`

This admin is created automatically by `setupDefaultAdmin()` in `src/services/auth.ts` if no
users exist yet. The session is persisted in `localStorage` keys `pp_users` / `pp_session` /
`pp_role`. To start as a logged-out user, clear localStorage.

### Backend (FastAPI) auth
**None.** The FastAPI backend (`/app/backend/main.py`) has no authentication; all `/api/*`
routes are publicly accessible. Endpoints that need Supabase will return HTTP 503 until
`SUPABASE_URL` and `SUPABASE_KEY` are configured (either in `/app/backend/.env` or via the
in-app Settings page which writes to `localStorage` for the frontend and — best-effort — to
the Supabase `settings` table).

## Runtime configuration

The Settings page (الإعدادات tab) accepts these keys at runtime:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `VITE_GROQ_API_KEY`
- `VITE_GOOGLE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID` / `VITE_FIREBASE_MESSAGING_SENDER_ID`
  (Firebase is currently disabled in `App.tsx`; these fields exist for forward compatibility.)
- `VITE_INFOBIP_BASE_URL` / `VITE_INFOBIP_API_KEY`
- `VITE_API_URL`

Keys are stored under the localStorage key `partspro_runtime_config` (JSON) and — if Supabase
is configured — also persisted as a row in the `settings` table with `id = partspro_runtime_config`.
