# Auth Testing Notes

**No auth setup needed.**

The Workshop Management app exposes all `/api/*` endpoints without authentication, sessions, cookies, CSRF tokens, or bearer tokens. The frontend has no login flow.

For the testing agent:
- Do NOT attempt to log in.
- Do NOT attempt to set cookies or Authorization headers.
- Call `/api/*` endpoints directly with the preview URL prefix (see `test_credentials.md`).
- The only "identity"-style data is `customerPhone` used as a customer lookup key on vehicle creation and `trackingLink` (`TRK-XXXX`) used for the public vehicle-tracking page.
