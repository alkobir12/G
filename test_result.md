#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Parts Pro ERP — Arabic-RTL auto parts inventory / POS / accounting system.
  Stack: Vite + React 19 + TypeScript + Tailwind + Supabase + Groq + Google Gemini.
  Backend: separate FastAPI + Supabase REST proxy.

  User direction:
  - Replaced previous Workshop Management code (preserved on `workshop-management`
    git branch).
  - Keep Supabase as the backing store (do NOT migrate to MongoDB).
  - Keep Groq + Google AI for JARVIS chatbot (do NOT use Emergent LLM key).
  - Firebase / Firestore disabled (`useFirestoreSync` commented out).
  - User will supply API keys via the in-app Settings page; the empty `.env`
    files are just env-fallback scaffolding.

  Current phase: Task C complete — Parts Pro is installed in `/app`, services
  are up, preview renders, no automated tests run yet.

backend:
  - task: "Parts Pro FastAPI boots without Supabase keys"
    implemented: true
    working: true
    file: "backend/main.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Replaced hardcoded stranger's Supabase URL/key fallback with strict
          env-only loading. When SUPABASE_URL/SUPABASE_KEY are empty the
          backend logs a warning and boots; Supabase-dependent endpoints
          return HTTP 503 with a clear message instead of crashing.

  - task: "FastAPI exposes /api/openapi.json + /api/docs"
    implemented: true
    working: true
    file: "backend/main.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          FastAPI(openapi_url='/api/openapi.json', docs_url='/api/docs',
          redoc_url='/api/redoc'). All app routes already prefixed with /api/;
          finance router prefix '/api/v1/finance'. Confirmed 200 on preview
          /api/openapi.json. 39 routes total in the OpenAPI schema.

  - task: "Supabase-dependent endpoints return 503 gracefully"
    implemented: true
    working: true
    file: "backend/main.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          GET /api/parts -> {"detail":"Supabase is not configured. Set
          SUPABASE_URL and SUPABASE_KEY (env or Settings page)."} with HTTP 503.

frontend:
  - task: "Vite dev server reachable through preview ingress"
    implemented: true
    working: true
    file: "frontend/vite.config.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          vite.config.ts: host=0.0.0.0, port=3000, strictPort=true,
          allowedHosts=true (Vite v7 ingress hostnames vary, can't be enumerated),
          hmr.clientPort=443, hmr.protocol='wss'. Removed
          `plugin-inspect-react-code` dep (not on public npm). Removed Vite plugin
          import that depended on it.

  - task: "Frontend renders Parts Pro dashboard on preview URL"
    implemented: true
    working: true
    file: "frontend/src/App.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Preview returns 200 with the Parts Pro dashboard (لوحة التحكم) showing
          KPI cards, category breakdown, low-stock alert (31 items), bottom
          navigation, header. Auto-signed-in as admin@partspro.com.

  - task: "Settings page exposes runtime API-key config (Supabase/Groq/Google/Infobip)"
    implemented: true
    working: true
    file: "frontend/src/components/RuntimeConfigSettings.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New RuntimeConfigSettings component injected at the top of
          SettingsView. Persists to localStorage key `partspro_runtime_config`
          and best-effort upserts to Supabase `settings` table. Emits
          `partspro:runtime-config:changed` window event so supabase.ts /
          groq.ts singletons rebuild their clients on save.

  - task: "Runtime config helper + lazy service rebuild"
    implemented: true
    working: true
    file: "frontend/src/services/runtimeConfig.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          getRuntimeConfig() / saveRuntimeConfig() / clearRuntimeConfig().
          services/supabase.ts now exposes a Proxy-wrapped `supabase` export
          and a lazily-built client. services/groq.ts and services/google.ts
          rewritten to read from runtimeConfig on each call. All three rebuild
          on RUNTIME_CONFIG_EVENT.

  - task: "Missing-config banner"
    implemented: true
    working: true
    file: "frontend/src/App.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Amber banner above main content reading
          'إعدادات قاعدة البيانات غير مكتملة — اذهب إلى الإعدادات' with a
          'فتح الإعدادات' button that switches to the settings page.
          Hidden when on settings page or when Supabase config is present.

  - task: "Firebase / Firestore disabled per user"
    implemented: true
    working: true
    file: "frontend/src/App.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          useFirestoreSync calls commented out with TODO marker. Stub
          initFirestore / pushToCloud no-ops preserve the existing useEffect
          calls. File `hooks/useFirestoreSync.ts` left intact for easy re-enable.

infrastructure:
  - task: "Supervisor updated for Vite + Parts Pro backend"
    implemented: true
    working: true
    file: "/etc/supervisor/conf.d/supervisord.conf"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          [program:backend] -> uvicorn main:app on :8001, cwd /app/backend.
          [program:frontend] -> yarn dev --host 0.0.0.0 --port 3000, cwd /app/frontend.
          Removed [program:mobile] (Workshop relic). MongoDB program kept (unused).
          supervisorctl reread && update applied; status RUNNING.

  - task: "Workshop Management preserved on workshop-management git branch"
    implemented: true
    working: true
    file: ".git"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Pushed alkobir12/G:workshop-management with commit
          917f649 chore: snapshot Workshop Management before Parts Pro switch.

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 0
  run_ui: false
  phase: "Task C — Parts Pro switch (DONE, awaiting user testing direction)"

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Task C complete. Parts Pro ERP now lives in /app. Workshop Management is
      preserved on origin/workshop-management. Services are RUNNING on
      supervisor. Preview renders Arabic dashboard. No automated tests run yet
      — awaiting user approval before invoking deep_testing_backend_v2.

      Known gaps (deliberate, NOT bugs):
        - All Supabase-backed endpoints return 503 until the user enters keys
          via the in-app Settings page (or backend/.env).
        - Frontend is auto-signed-in as admin@partspro.com (localStorage shim);
          real auth deferred to a later phase.
        - Firebase / Firestore disabled (commented out per user decision).
        - `plugin-inspect-react-code` Vite plugin removed from devDeps because
          it isn't available on the public npm registry.
