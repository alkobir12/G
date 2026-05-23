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
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Workshop Management System (نظام إدارة ورش الميكانيكا) — an Arabic-RTL automotive
  repair shop manager. Backend: FastAPI + MongoDB + emergentintegrations.
  Frontend: React 19 + CRA + craco + Tailwind + Radix UI.
  User direction: keep the existing Workshop Management app (NOT migrate to the
  uploaded Parts Pro artifact). The artifact is for reference only.
  Phase 1 scope: Restore & Run only — recreate .env files, fix supervisor, ensure
  /api/openapi.json is reachable, seed DB, confirm preview URL renders.

backend:
  - task: "Backend env restore (MONGO_URL, DB_NAME, CORS_ORIGINS, EMERGENT_LLM_KEY)"
    implemented: true
    working: true
    file: "backend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Created /app/backend/.env with MONGO_URL=mongodb://localhost:27017, DB_NAME=workshop_db, CORS_ORIGINS=*, EMERGENT_LLM_KEY=<universal key>. Backend boots cleanly; verified KeyError resolved."

  - task: "FastAPI openapi exposed under /api prefix"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Updated FastAPI(...) constructor: openapi_url='/api/openapi.json', docs_url='/api/docs', redoc_url='/api/redoc'. Confirmed HTTP 200 on /api/openapi.json via preview URL."

  - task: "Seed demo data via init_data.py"
    implemented: true
    working: true
    file: "backend/init_data.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Ran init_data.py: 4 technicians, 15 services, 8 parts inserted. Verified via GET /api/technicians, GET /api/parts, GET /api/stats (technicians=4)."

  - task: "Smoke test core API endpoints"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/ -> 200 (Workshop Management API), GET /api/stats -> 200, GET /api/technicians -> 200 with 4 entries, GET /api/parts -> 200 with 8 entries. Total of 73 routes discovered in OpenAPI schema."

frontend:
  - task: "Frontend env restore (REACT_APP_BACKEND_URL, WDS_SOCKET_PORT)"
    implemented: true
    working: true
    file: "frontend/.env"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Created /app/frontend/.env with REACT_APP_BACKEND_URL=https://3cebdbec-b1df-4a4e-a3ea-d70221702bdc.preview.emergentagent.com and WDS_SOCKET_PORT=443. Restarted frontend; webpack compiled successfully."

  - task: "Preview URL renders dashboard"
    implemented: true
    working: true
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Preview URL returns 200. Dashboard renders Arabic RTL UI with sidebar (لوحة التحكم, التحليلات, المخزون, العملاء, الفنيين, المساعد الذكي) and vehicle cards. NOTE: Dashboard currently shows mock vehicle cards (أ ب ج 1234 etc.) — mock data has not yet been replaced with backend calls (per contracts.md, this was a planned migration). Out of Phase 1 scope; flagged for Phase 2."

infrastructure:
  - task: "Remove stale mobile supervisor program"
    implemented: true
    working: true
    file: "/etc/supervisor/conf.d/supervisord.conf"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Commented out [program:mobile] block in supervisord.conf because /app/mobile/ no longer exists. Ran supervisorctl reread && update; mobile program removed cleanly."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false
  phase: "1 — restore & run (DONE, awaiting user direction for Phase 2)"

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Phase 1 complete. Backend + frontend restored from missing-.env state and
      running cleanly via supervisor. /api/openapi.json reachable on preview URL.
      DB seeded with demo technicians/services/parts. No automated tests run
      yet — awaiting user approval before invoking deep_testing_backend_v2 or
      proceeding to Phase 2 bug fixes / enhancements.

      Known gap (NOT fixed in Phase 1, out of scope):
        - Dashboard.jsx still imports mock data instead of calling backend
          /api/vehicles. Frontend shows hardcoded sample vehicles regardless of
          DB state. Flagged for Phase 2.
