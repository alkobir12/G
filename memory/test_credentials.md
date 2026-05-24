# Parts Pro ERP — Test Credentials

## Real Supabase Auth (Phase 4.4)

These credentials work against the live backend `/api/auth/*` endpoints.

| Field | Value |
|---|---|
| Email | `rakan.phase4.1779661866@gmail.com` |
| Password | `Phase4Test!2026` |
| Role | admin |
| Confirmed | yes (email_confirmed_at set via SQL because SUPABASE_SERVICE_KEY is not configured) |

### Manual confirmation workaround (until SUPABASE_SERVICE_KEY is added)

The backend exposes `POST /api/auth/signup?auto_confirm=true` but auto-confirm
requires `SUPABASE_SERVICE_KEY` in `/app/backend/.env`. Without it, signups go
through Supabase's default email-confirmation flow, and the user cannot log in
until they click the link in their inbox.

For local testing, confirm a user manually:

```sql
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = '<test_email>';
```

(Use the pooler connection string from `/app/backend/.env` SUPABASE_URL host.)

## Login flow notes

- `POST /api/auth/login`  → `{ access_token, refresh_token, user }`
- `GET  /api/auth/me`     with `Authorization: Bearer <jwt>` → `{ user }`
- `POST /api/auth/refresh` with `{ refresh_token }` → new `{ access_token, refresh_token }`
- `POST /api/auth/logout`  with `Authorization: Bearer <jwt>` → 200

The frontend stores tokens at:

- `localStorage["partspro_jwt"]`
- `localStorage["partspro_refresh"]`
- `localStorage["partspro_user"]`
- `localStorage["parts_pro_role"]`

`axios` request interceptor in `services/apiClient.ts` adds the Bearer
header automatically; on 401 it attempts a single refresh + retry. If the
refresh fails, all auth keys are cleared and `pp_auth_event SIGNED_OUT`
is dispatched.

## Legacy / Removed

- The previous local `admin@partspro.com / admin123` auto-login shim has been
  removed. `setupDefaultAdmin()` is a no-op stub kept only for backwards
  compatibility of imports.
