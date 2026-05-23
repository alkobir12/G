# Test Credentials — Workshop Management App

## Authentication

**NO AUTHENTICATION REQUIRED.**

The Workshop Management API (FastAPI backend at `/app/backend/server.py`) does not implement any auth, login, JWT, sessions, or RBAC. All `/api/*` endpoints are publicly accessible without credentials.

The React frontend at `/app/frontend` likewise has no login page or auth context — the dashboard, customer list, technician list, vehicle creation, AI assistant, etc. are all directly accessible at the preview root URL.

## How to access the app

- Preview URL: `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com`
- Backend API base: `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api`
- OpenAPI schema: `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/api/openapi.json`
- Swagger UI: `https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com/docs`

## Seeded demo data (via `init_data.py`)

- 4 technicians (auto-seeded)
- 15 services
- 8 parts (auto-seeded)
- 1 demo customer + 1 demo vehicle (if applicable)

No accounts to log into — interact with the app directly.
