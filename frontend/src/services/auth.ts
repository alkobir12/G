/**
 * ═══════════════════════════════════════════════════════════════
 *   Authentication Service — Parts Pro ERP (Phase 4.4)
 * ═══════════════════════════════════════════════════════════════
 *
 * Real Supabase authentication, proxied through the FastAPI backend.
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/refresh
 *   GET  /api/auth/me
 *   POST /api/auth/logout
 *
 * The browser never talks to Supabase Auth directly. We store the
 * access_token + refresh_token + cached user profile in localStorage
 * and attach `Authorization: Bearer <jwt>` to every backend request via
 * the axios interceptor in apiClient.ts.
 *
 * RBAC is "soft mode" — auth gates the UI; backend RLS is *not* yet
 * enabled (planned for Phase 4.5 once we add user_id columns).
 * ═══════════════════════════════════════════════════════════════
 */

import { apiPost, apiGet } from "./apiClient";

// ───────────────────────────────────────────────────────────────
// Storage keys
// ───────────────────────────────────────────────────────────────

export const KEY_JWT     = "partspro_jwt";
export const KEY_REFRESH = "partspro_refresh";
export const KEY_USER    = "partspro_user";
export const KEY_ROLE    = "parts_pro_role";

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "cashier" | "viewer";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResult {
  success: boolean;
  error: string | null;
  data?: any;
}

// ───────────────────────────────────────────────────────────────
// Arabic error messages
// ───────────────────────────────────────────────────────────────

const ARABIC_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS:   "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  USER_NOT_FOUND:        "المستخدم غير موجود",
  EMAIL_EXISTS:          "هذا البريد الإلكتروني مستخدم بالفعل",
  WEAK_PASSWORD:         "كلمة المرور ضعيفة، يجب أن تكون ٦ أحرف على الأقل",
  NETWORK_ERROR:         "حدث خطأ في الاتصال، يرجى المحاولة لاحقاً",
  SERVER_ERROR:          "حدث خطأ في الخادم، يرجى المحاولة لاحقاً",
  SESSION_EXPIRED:       "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى",
  NOT_AUTHENTICATED:     "يجب تسجيل الدخول أولاً",
  EMAIL_NOT_CONFIRMED:   "يجب تأكيد البريد الإلكتروني أولاً (تحقق من صندوق الوارد)",
  GENERIC_ERROR:         "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
};

function err(key: keyof typeof ARABIC_ERRORS): string {
  return ARABIC_ERRORS[key] || ARABIC_ERRORS.GENERIC_ERROR;
}

/** Map backend / Supabase error payloads to friendly Arabic text. */
function mapBackendError(e: any): string {
  const status = e?.status;
  const detail = e?.detail || e?.message || "";
  const msg = (typeof detail === "string" ? detail : JSON.stringify(detail)).toLowerCase();

  if (msg.includes("email not confirmed") || msg.includes("not confirmed"))
    return err("EMAIL_NOT_CONFIRMED");
  if (msg.includes("invalid login") || msg.includes("invalid_grant"))
    return err("INVALID_CREDENTIALS");
  if (msg.includes("already registered") || msg.includes("user already") || msg.includes("email_exists"))
    return err("EMAIL_EXISTS");
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("short")))
    return err("WEAK_PASSWORD");
  if (msg.includes("network") || msg.includes("timeout"))
    return err("NETWORK_ERROR");
  if (status === 401) return err("SESSION_EXPIRED");
  if (status >= 500) return err("SERVER_ERROR");
  return e?.message || err("GENERIC_ERROR");
}

// ───────────────────────────────────────────────────────────────
// Token + profile cache helpers
// ───────────────────────────────────────────────────────────────

export function getJWT(): string | null {
  try { return localStorage.getItem(KEY_JWT); } catch { return null; }
}

export function getRefreshToken(): string | null {
  try { return localStorage.getItem(KEY_REFRESH); } catch { return null; }
}

function storeTokens(access: string | null, refresh: string | null): void {
  if (access) localStorage.setItem(KEY_JWT, access); else localStorage.removeItem(KEY_JWT);
  if (refresh) localStorage.setItem(KEY_REFRESH, refresh); else localStorage.removeItem(KEY_REFRESH);
}

function storeUser(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem(KEY_USER, JSON.stringify(user));
    if (user.role) localStorage.setItem(KEY_ROLE, user.role);
  } else {
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_ROLE);
  }
}

function readUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Build a UserProfile from the Supabase auth user object returned by GoTrue. */
function userFromSupabase(u: any): UserProfile | null {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    user_id: u.id,
    email: u.email,
    full_name: meta.full_name || "",
    role: (meta.role || "admin") as UserRole,
    avatar_url: meta.avatar_url || null,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

// ───────────────────────────────────────────────────────────────
// Custom event broadcasting (cross-component auth notifications)
// ───────────────────────────────────────────────────────────────

const AUTH_EVENT_KEY = "pp_auth_event";

function broadcastAuthEvent(event: string, profile: UserProfile | null): void {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: { event, profile } }));
  } catch { /* ignore */ }
}

// ───────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const res: any = await apiPost("/api/auth/login", { email, password });
    if (!res?.access_token) {
      return { success: false, error: err("INVALID_CREDENTIALS") };
    }
    storeTokens(res.access_token, res.refresh_token);
    const profile = userFromSupabase(res.user);
    storeUser(profile);
    broadcastAuthEvent("SIGNED_IN", profile);
    return { success: true, error: null, data: { user: profile, session: res } };
  } catch (e: any) {
    return { success: false, error: mapBackendError(e) };
  }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = "viewer",
): Promise<AuthResult> {
  try {
    const res: any = await apiPost(
      // The backend exposes ?auto_confirm=true; we always request it. If the
      // server has no SUPABASE_SERVICE_KEY it gracefully falls back to email-
      // confirmation and the user receives a confirmation email instead.
      "/api/auth/signup?auto_confirm=true",
      { email, password, full_name: fullName, role },
    );
    // Auto-confirm path returns the user object directly; the email-confirmation
    // path returns { user, session } where session may be null until confirmed.
    const supaUser = res.user || res;
    const profile = userFromSupabase(supaUser);
    return { success: true, error: null, data: { user: profile, raw: res } };
  } catch (e: any) {
    return { success: false, error: mapBackendError(e) };
  }
}

export async function signOut(): Promise<AuthResult> {
  try { await apiPost("/api/auth/logout", {}); } catch { /* ignore */ }
  storeTokens(null, null);
  storeUser(null);
  broadcastAuthEvent("SIGNED_OUT", null);
  return { success: true, error: null };
}

/** Try to refresh the access token using the stored refresh_token.
 *  On failure clears the session. Returns the new access token on success. */
export async function refreshSession(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res: any = await apiPost("/api/auth/refresh", { refresh_token: refresh });
    if (res?.access_token) {
      storeTokens(res.access_token, res.refresh_token || refresh);
      if (res.user) storeUser(userFromSupabase(res.user));
      return res.access_token;
    }
  } catch { /* fall through to clearing */ }
  storeTokens(null, null);
  storeUser(null);
  broadcastAuthEvent("SIGNED_OUT", null);
  return null;
}

export function getCurrentUser(): UserProfile | null {
  return readUser();
}

export async function getSession(): Promise<AuthResult> {
  const user = readUser();
  if (!user || !getJWT()) {
    return { success: false, error: err("NOT_AUTHENTICATED") };
  }
  return { success: true, error: null, data: { user, session: { access_token: getJWT() } } };
}

export function onAuthChange(
  callback: (event: string, profile: UserProfile | null) => void,
): () => void {
  // Replay initial state synchronously
  callback("INITIAL", readUser());
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail) return;
    callback(detail.event, detail.profile);
  };
  window.addEventListener(AUTH_EVENT_KEY, handler);
  return () => window.removeEventListener(AUTH_EVENT_KEY, handler);
}

/** Password-reset is not yet wired through the backend; surface a clear
 *  message so the UI doesn't pretend it succeeded. */
export async function resetPassword(_email: string): Promise<AuthResult> {
  return {
    success: false,
    error: "إعادة تعيين كلمة المرور غير مفعّلة بعد. يرجى التواصل مع المدير.",
  };
}

export async function updatePassword(_newPassword: string): Promise<AuthResult> {
  return {
    success: false,
    error: "تغيير كلمة المرور غير مفعّل بعد. يرجى التواصل مع المدير.",
  };
}

// ───────────────────────────────────────────────────────────────
// Role / permission helpers (unchanged surface)
// ───────────────────────────────────────────────────────────────

const PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ["all"],
  manager: ["view", "create", "edit", "delete", "export", "print"],
  cashier: ["view", "create_invoice", "create_expense", "print"],
  viewer:  ["view", "export", "print"],
};

const PAGE_ACCESS: Record<string, UserRole[]> = {
  dashboard:    ["admin", "manager", "cashier", "viewer"],
  pos:          ["admin", "manager", "cashier"],
  inventory:    ["admin", "manager", "cashier"],
  customers:    ["admin", "manager", "cashier"],
  transactions: ["admin", "manager", "cashier"],
  accounts:     ["admin", "manager"],
  settings:     ["admin"],
  ai_chat:      ["admin", "manager"],
};

export function getCachedRole(): UserRole | null {
  try {
    const cached = localStorage.getItem(KEY_ROLE);
    if (cached) return cached as UserRole;
  } catch { /* ignore */ }
  return readUser()?.role ?? null;
}

export async function getUserRole(): Promise<UserRole | null> {
  return getCachedRole();
}

export function hasRole(required: UserRole[]): boolean {
  const r = getCachedRole();
  return r ? required.includes(r) : false;
}

export function isAdmin(): boolean   { return getCachedRole() === "admin"; }
export function isManager(): boolean { return getCachedRole() === "manager"; }
export function isCashier(): boolean { return getCachedRole() === "cashier"; }

export function can(permission: string): boolean {
  const r = getCachedRole();
  if (!r) return false;
  const perms = PERMISSIONS[r] || [];
  return perms.includes("all") || perms.includes(permission);
}

export function canDelete(): boolean  { return can("delete"); }
export function canEdit(): boolean    { return can("edit"); }
export function canCreate(): boolean  { return can("create"); }
export function canView(): boolean    { return can("view"); }
export function canExport(): boolean  { return can("export"); }
export function canPrint(): boolean   { return can("print"); }

export function canViewPage(page: string): boolean {
  const r = getCachedRole();
  if (!r) return true; // public when logged out (login modal gates UI)
  const allowed = PAGE_ACCESS[page];
  return !!allowed && allowed.includes(r);
}

export function cacheRole(role: UserRole): void {
  localStorage.setItem(KEY_ROLE, role);
}

export function clearRoleCache(): void {
  localStorage.removeItem(KEY_ROLE);
}

export async function refreshRoleCache(): Promise<void> {
  const role = getCachedRole();
  if (role) cacheRole(role); else clearRoleCache();
}

export async function isAuthenticated(): Promise<boolean> {
  return !!(getJWT() && readUser());
}

/** Boot-time session validation. Verifies the JWT against the backend
 *  via GET /api/auth/me; refreshes silently if expired. */
export async function initAuth(): Promise<{ authenticated: boolean; profile: UserProfile | null }> {
  const jwt = getJWT();
  if (!jwt) return { authenticated: false, profile: null };
  try {
    const res: any = await apiGet("/api/auth/me");
    if (res?.user) {
      const profile = userFromSupabase(res.user);
      if (profile) {
        storeUser(profile);
        return { authenticated: true, profile };
      }
    }
    const cached = readUser();
    return cached ? { authenticated: true, profile: cached } : { authenticated: false, profile: null };
  } catch {
    // axios interceptor already tried to refresh; if we're here, refresh failed.
    // Treat as logged out.
    storeTokens(null, null);
    storeUser(null);
    return { authenticated: false, profile: null };
  }
}

// ───────────────────────────────────────────────────────────────
// Backwards-compatible stubs (no auto-admin in real-auth mode)
// ───────────────────────────────────────────────────────────────

/** No-op in Phase 4.4. Real auth requires the user to register/login. */
export function setupDefaultAdmin(): boolean { return false; }

export function getDefaultAdmin(): { email: string; password: string; name: string } {
  return { email: "", password: "", name: "" };
}

export function hasDefaultAdmin(): boolean { return false; }
export function resetDefaultAdmin(): void { /* no-op */ }

export const DEFAULT_ADMIN_EMAIL    = "";
export const DEFAULT_ADMIN_PASSWORD = "";
export const DEFAULT_ADMIN_NAME     = "";

export { PERMISSIONS, PAGE_ACCESS };
