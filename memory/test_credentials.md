# Test Credentials — Parts Pro ERP

## App
- **Preview URL:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com`
- **Backend API base:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api`
- **OpenAPI:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api/openapi.json`
- **Swagger UI:** `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api/docs`

## Authentication

**No server-side auth required.** The tester can interact directly with the UI or curl `/api/*`
without any tokens, cookies, or session setup.

### Frontend auto-login (localStorage shim)

On first page load, `src/services/auth.ts` calls `setupDefaultAdmin()` which writes a default
admin record to `localStorage` and signs in automatically:

- **Email:** `admin@partspro.com`
- **Password:** `admin123`
- **Role:** `admin`

No network call is made — this is entirely browser-side. To test the logged-out state, the
tester can run `localStorage.clear()` in DevTools and reload (the page will show a "تسجيل
الدخول" button in the top-right). After login the same `admin@partspro.com` / `admin123` works
again (the credentials are stored in `localStorage["pp_users"]`).

### Backend auth

**None.** All `/api/*` endpoints are public. No cookies, no JWTs, no `Authorization` header.

## Service status (as of this snapshot)

| Service | Status |
|---|---|
| `SUPABASE_URL` + `SUPABASE_KEY` (backend `.env`) | ✅ configured |
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (frontend `.env`) | ✅ configured |
| `VITE_GROQ_API_KEY` | ✅ configured |
| `VITE_GOOGLE_API_KEY` | ✅ configured |
| `VITE_FIREBASE_*` | ❌ intentionally empty (Firestore sync disabled) |
| `VITE_INFOBIP_*` | ❌ intentionally empty (SMS/WA disabled) |
| Supabase schema (`parts`, `invoices`, `customers`, ...) | ❌ **pending** — user must run `/app/backend/migration_v2.sql` once in Supabase SQL editor |

## Expected behavior of API calls right now

- `GET /api/openapi.json` → 200
- `GET /api/parts` → **500** with `postgrest.exceptions.APIError: 'Could not find the table public.parts in the schema cache'` (PGRST205). This is **expected** — it confirms the Supabase connection works and the only missing piece is the schema.
- After running `migration_v2.sql` once, `GET /api/parts` will return `200` with `[]`.

## Notes for the tester

- The "إعدادات قاعدة البيانات غير مكتملة" amber banner is now hidden (Supabase URL+key are set).
- A small `Supabase` status pill is shown in the top-right of the header; until the schema is
  migrated, it may show an "amber" `tables_missing` state.
- Runtime config from the Settings page **overrides** env values. Test order: localStorage →
  `.env`. Saving via Settings persists across reload (localStorage). Clearing via Settings →
  "مسح الكل" reverts to env-only.
- Supabase project ref: `uifvnppwgbxaqmorwgky` — for visibility in DB error messages.
