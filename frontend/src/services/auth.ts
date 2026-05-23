/**
 * ═══════════════════════════════════════════════════════════════
 *   Authentication Service — Parts Pro ERP
 * ═══════════════════════════════════════════════════════════════
 *
 * Supabase-based auth with role-based access control (RBAC).
 * Falls back to localStorage-based auth when Supabase is not configured.
 * All UI-facing messages are in Arabic (RTL).
 *
 * Architecture:
 *   • pp_users      — Array of registered users (persisted, survives logout)
 *   • pp_session    — Currently logged-in user email (cleared on logout)
 *   • pp_role       — Cached role for permission checks
 *   • setupDefaultAdmin()  — Auto-creates admin@partspro.com / admin123
 *
 * Exported API:
 *   • setupDefaultAdmin()              — Create default admin if none exists
 *   • signIn(email, password)          — Login
 *   • signUp(email, password, fullName, role?) — Register
 *   • signOut()                        — Logout (clears session, NOT users)
 *   • getSession()                     — Current session
 *   • getCurrentUser()                 — User + profile
 *   • onAuthChange(callback)           — Auth state subscription
 *   • resetPassword(email)             — Send reset email
 *   • updatePassword(newPassword)      — Update password
 *   • getUserRole()                    — Get current role
 *   • hasRole(required)                — Check role membership
 *   • isAdmin() / isManager()          — Role shorthands
 *   • can(permission)                  — Permission check
 *   • canDelete() / canEdit()          — Common permission shorthands
 *   • canViewPage(page)                — Page-level access control
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase, isSupabaseConfigured } from "./supabase";

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

export interface LocalAuthUser {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const KEY_USERS   = "pp_users";    // Array of all registered users (persisted)
const KEY_SESSION = "pp_session";  // Currently logged-in user email (volatile)
const KEY_ROLE    = "parts_pro_role"; // Cached role

/** Default admin credentials — shown to user on first visit */
export const DEFAULT_ADMIN_EMAIL    = "admin@partspro.com";
export const DEFAULT_ADMIN_PASSWORD = "admin123";
export const DEFAULT_ADMIN_NAME     = "مدير النظام";

const PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ["all"],
  manager: ["view", "create", "edit", "delete", "export", "print"],
  cashier: ["view", "create_invoice", "create_expense", "print"],
  viewer:  ["view", "export", "print"],
};

/** Page → allowed roles */
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
  PASSWORD_MISMATCH:     "كلمات المرور غير متطابقة",
  PASSWORD_UPDATE_ERROR: "فشل تحديث كلمة المرور",
  RESET_SENT:            "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
  INVALID_EMAIL:         "البريد الإلكتروني غير صالح",
  CONFIG_ERROR:          "خدمة المصادقة غير متوفرة حالياً",
  MISSING_ROLE:          "لم يتم تحديد صلاحية المستخدم",
  GENERIC_ERROR:         "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
  LOGOUT_ERROR:          "حدث خطأ أثناء تسجيل الخروج",
};

function err(key: keyof typeof ARABIC_ERRORS): string {
  return ARABIC_ERRORS[key] || ARABIC_ERRORS.GENERIC_ERROR;
}

// ───────────────────────────────────────────────────────────────
// localStorage Helpers — Multi-user storage
// ───────────────────────────────────────────────────────────────

/** Get all registered users from localStorage */
function getLocalUsers(): LocalAuthUser[] {
  try {
    const raw = localStorage.getItem(KEY_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save users array to localStorage */
function setLocalUsers(users: LocalAuthUser[]): void {
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

/** Find a user by email */
function findLocalUser(email: string): LocalAuthUser | null {
  return getLocalUsers().find((u) => u.email === email) || null;
}

/** Add or update a user in the local users array */
function saveLocalUser(user: LocalAuthUser): void {
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.email === user.email);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  setLocalUsers(users);
}

// ─── Session (volatile — cleared on logout) ───────────────────

function getSessionEmail(): string | null {
  try {
    return localStorage.getItem(KEY_SESSION);
  } catch {
    return null;
  }
}

function setSessionEmail(email: string): void {
  localStorage.setItem(KEY_SESSION, email);
  cacheRole(findLocalUser(email)?.role || "admin");
}

function clearSession(): void {
  localStorage.removeItem(KEY_SESSION);
  clearRoleCache();
}

/** Build a local-only profile object that matches UserProfile shape */
function buildLocalProfile(email: string): UserProfile | null {
  const user = findLocalUser(email);
  if (!user) return null;
  return {
    id:          "local-" + email.replace(/[^a-zA-Z0-9]/g, "-"),
    user_id:     "local-" + email.replace(/[^a-zA-Z0-9]/g, "-"),
    email:       user.email,
    full_name:   user.full_name,
    role:        user.role,
    avatar_url:  null,
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  };
}

// ───────────────────────────────────────────────────────────────
// Default Admin — Auto-setup on first visit
// ───────────────────────────────────────────────────────────────

/**
 * Creates the default admin account if no users exist.
 * Call this once on app startup (e.g., in a useEffect).
 * Returns true if an admin was created (first visit), false otherwise.
 */
export function setupDefaultAdmin(): boolean {
  const users = getLocalUsers();
  if (users.length === 0) {
    // No users exist — create default admin
    const admin: LocalAuthUser = {
      email:     DEFAULT_ADMIN_EMAIL,
      password:  DEFAULT_ADMIN_PASSWORD,
      full_name: DEFAULT_ADMIN_NAME,
      role:      "admin",
    };
    setLocalUsers([admin]);
    // Also auto-login the admin
    setSessionEmail(admin.email);
    cacheRole("admin");
    return true;
  }
  return false;
}

/**
 * Get the default admin credentials for display in UI.
 */
export function getDefaultAdmin(): { email: string; password: string; name: string } {
  return {
    email:    DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    name:     DEFAULT_ADMIN_NAME,
  };
}

/** Check if the default admin account still exists. */
export function hasDefaultAdmin(): boolean {
  return findLocalUser(DEFAULT_ADMIN_EMAIL) !== null;
}

/**
 * Reset the default admin password.
 * Useful for "Forgot password" flow in local mode.
 */
export function resetDefaultAdmin(): void {
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.email === DEFAULT_ADMIN_EMAIL);
  if (idx >= 0) {
    users[idx].password = DEFAULT_ADMIN_PASSWORD;
    setLocalUsers(users);
  }
}

// ───────────────────────────────────────────────────────────────
// Custom Event System — Cross-component auth notifications
// ───────────────────────────────────────────────────────────────

const AUTH_EVENT_KEY = "pp_auth_event";

/** Broadcast an auth event so onAuthChange listeners get notified */
function broadcastAuthEvent(event: string, email: string | null): void {
  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT_KEY, { detail: { event, email } })
    );
  } catch {
    // ignore
  }
}

// ───────────────────────────────────────────────────────────────
// Supabase helpers
// ───────────────────────────────────────────────────────────────

/** Map Supabase error messages to friendly Arabic text */
function mapSupabaseError(error: any): string {
  const msg = (error?.message || "").toLowerCase();

  if (msg.includes("invalid login"))       return err("INVALID_CREDENTIALS");
  if (msg.includes("invalid credentials"))  return err("INVALID_CREDENTIALS");
  if (msg.includes("user not found"))       return err("USER_NOT_FOUND");
  if (msg.includes("already registered"))   return err("EMAIL_EXISTS");
  if (msg.includes("email address"))        return err("EMAIL_EXISTS");
  if (msg.includes("password"))             return err("WEAK_PASSWORD");
  if (msg.includes("network"))              return err("NETWORK_ERROR");
  if (msg.includes("jwt"))                  return err("SESSION_EXPIRED");

  return err("GENERIC_ERROR");
}

/** Fetch profile row from public.profiles linked to auth.uid */
async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/** Upsert a profile row in public.profiles */
async function upsertProfile(
  userId: string,
  email: string,
  fullName: string,
  role: UserRole
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id:    userId,
        email,
        full_name:  fullName,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

// ───────────────────────────────────────────────────────────────
// Public API — Auth functions
// ───────────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * Falls back to localStorage-based auth when Supabase is unavailable.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    // Auto-setup default admin if no users exist
    setupDefaultAdmin();

    const user = findLocalUser(email);
    if (!user) {
      return { success: false, error: err("USER_NOT_FOUND") };
    }

    if (user.password !== password) {
      return { success: false, error: err("INVALID_CREDENTIALS") };
    }

    // Success — create session
    setSessionEmail(email);
    broadcastAuthEvent("SIGNED_IN", email);

    return {
      success: true,
      error:   null,
      data:    { user: buildLocalProfile(email), session: { email } },
    };
  }

  // ── Supabase auth ──────────────────────────────────────────
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: mapSupabaseError(error) };
    }

    const profile = data.user ? await fetchProfile(data.user.id) : null;
    if (profile?.role) cacheRole(profile.role);

    return {
      success: true,
      error:   null,
      data:    { user: data.user, session: data.session, profile },
    };
  } catch {
    return { success: false, error: err("NETWORK_ERROR") };
  }
}

/**
 * Register a new user.
 * Creates the auth user then inserts a profile row with the assigned role.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = "viewer"
): Promise<AuthResult> {
  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    if (findLocalUser(email)) {
      return { success: false, error: err("EMAIL_EXISTS") };
    }

    const newUser: LocalAuthUser = {
      email,
      password,
      full_name: fullName,
      role,
    };
    saveLocalUser(newUser);

    return {
      success: true,
      error:   null,
      data:    { user: buildLocalProfile(email) },
    };
  }

  // ── Supabase auth ──────────────────────────────────────────
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      return { success: false, error: mapSupabaseError(error) };
    }

    if (data.user) {
      const profile = await upsertProfile(data.user.id, email, fullName, role);
      return {
        success: true,
        error:   null,
        data:    { user: data.user, profile },
      };
    }

    return { success: true, error: null, data: data.user };
  } catch {
    return { success: false, error: err("NETWORK_ERROR") };
  }
}

/** Sign out and clear all session data.
 *  IMPORTANT: Only clears the session, NOT the registered users.
 */
export async function signOut(): Promise<AuthResult> {
  // Always clear session (but NOT users)
  clearSession();
  broadcastAuthEvent("SIGNED_OUT", null);

  // Also clear Supabase session if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  return { success: true, error: null };
}

/** Get the current active session. */
export async function getSession(): Promise<AuthResult> {
  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    const email = getSessionEmail();
    if (!email) {
      return { success: false, error: err("NOT_AUTHENTICATED") };
    }
    const profile = buildLocalProfile(email);
    return {
      success: true,
      error:   null,
      data:    { user: profile, session: { email } },
    };
  }

  // ── Supabase auth ──────────────────────────────────────────
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { success: false, error: mapSupabaseError(error) };
    return { success: true, error: null, data: data.session };
  } catch {
    return { success: false, error: err("NETWORK_ERROR") };
  }
}

/**
 * Get the current authenticated user enriched with their profile.
 * Returns null if not logged in.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    const email = getSessionEmail();
    return email ? buildLocalProfile(email) : null;
  }

  // ── Supabase auth ──────────────────────────────────────────
  try {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;
    return await fetchProfile(data.user.id);
  } catch {
    return null;
  }
}

/**
 * Subscribe to authentication state changes.
 * Returns an unsubscribe function.
 *
 * In localStorage mode: listens to CustomEvents fired by signIn/signOut.
 * In Supabase mode: uses the real-time auth.onAuthStateChange subscription.
 */
export function onAuthChange(
  callback: (event: string, profile: UserProfile | null) => void
): () => void {
  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    // Send initial state
    const email = getSessionEmail();
    callback("INITIAL", email ? buildLocalProfile(email) : null);

    // Listen to our custom auth events (fired by signIn/signOut)
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const profile = detail.email ? buildLocalProfile(detail.email) : null;
      callback(detail.event, profile);
    };
    window.addEventListener(AUTH_EVENT_KEY, handler);
    return () => window.removeEventListener(AUTH_EVENT_KEY, handler);
  }

  // ── Supabase real-time subscription ────────────────────────
  const { data } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile?.role) cacheRole(profile.role);
        callback(event, profile);
      } else {
        callback(event, null);
      }
    }
  );

  return data.subscription.unsubscribe;
}

/** Send a password-reset email. */
export async function resetPassword(email: string): Promise<AuthResult> {
  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    // Reset to default password
    resetDefaultAdmin();
    return {
      success: true,
      error:   null,
      data:    { message: "تم إعادة تعيين كلمة المرور إلى: " + DEFAULT_ADMIN_PASSWORD },
    };
  }

  // ── Supabase auth ──────────────────────────────────────────
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: mapSupabaseError(error) };
    }

    return { success: true, error: null, data: { message: err("RESET_SENT") } };
  } catch {
    return { success: false, error: err("NETWORK_ERROR") };
  }
}

/** Update the current user's password. */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: err("WEAK_PASSWORD") };
  }

  // ── localStorage fallback ──────────────────────────────────
  if (!isSupabaseConfigured() || !supabase) {
    const email = getSessionEmail();
    if (!email) return { success: false, error: err("NOT_AUTHENTICATED") };

    const user = findLocalUser(email);
    if (!user) return { success: false, error: err("USER_NOT_FOUND") };

    // Update password
    user.password = newPassword;
    saveLocalUser(user);
    return { success: true, error: null };
  }

  // ── Supabase auth ──────────────────────────────────────────
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: mapSupabaseError(error) };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: err("PASSWORD_UPDATE_ERROR") };
  }
}

// ───────────────────────────────────────────────────────────────
// Role & Permission API
// ───────────────────────────────────────────────────────────────

/**
 * Get the current user's role.
 * Works with both Supabase and localStorage fallback.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentUser();
  return profile?.role ?? null;
}

/**
 * Synchronous role check using a cached/stored role value.
 * Prefer `getUserRole()` for accurate server-side checks.
 */
export function getCachedRole(): UserRole | null {
  // localStorage mode — read from session user
  if (!isSupabaseConfigured()) {
    const email = getSessionEmail();
    if (!email) return null;
    return findLocalUser(email)?.role ?? null;
  }

  // Attempt to read role from localStorage cache first
  try {
    const cached = localStorage.getItem(KEY_ROLE);
    if (cached) return cached as UserRole;
  } catch { /* ignore */ }

  return null;
}

/** Check if the current user's role is one of the required roles. */
export function hasRole(required: UserRole[]): boolean {
  const role = getCachedRole();
  if (!role) return false;
  return required.includes(role);
}

/** Role shorthand checks */
export function isAdmin(): boolean   { return getCachedRole() === "admin"; }
export function isManager(): boolean { return getCachedRole() === "manager"; }
export function isCashier(): boolean { return getCachedRole() === "cashier"; }

// ───────────────────────────────────────────────────────────────
// Permission API
// ───────────────────────────────────────────────────────────────

/**
 * Check if the current user has a specific permission.
 * Admin with "all" always passes.
 */
export function can(permission: string): boolean {
  const role = getCachedRole();
  if (!role) return false;

  const perms = PERMISSIONS[role] || [];
  return perms.includes("all") || perms.includes(permission);
}

/** Common permission shorthands */
export function canDelete(): boolean  { return can("delete"); }
export function canEdit(): boolean    { return can("edit"); }
export function canCreate(): boolean  { return can("create"); }
export function canView(): boolean    { return can("view"); }
export function canExport(): boolean  { return can("export"); }
export function canPrint(): boolean   { return can("print"); }

/**
 * Page-level access control.
 * Returns `true` if the user's role is allowed to view the page.
 * When no user is logged in, allows all pages (public access mode).
 */
export function canViewPage(page: string): boolean {
  const role = getCachedRole();

  // Public access — no login required, show all pages
  if (!role) return true;

  const allowed = PAGE_ACCESS[page];
  if (!allowed) return false;

  // Check base role access
  if (!allowed.includes(role)) return false;

  // Per-page fine-grained rules
  if (role === "cashier" && (page === "inventory" || page === "customers")) {
    return true;
  }

  if (role === "manager" && page === "accounts") {
    return true;
  }

  return true;
}

// ───────────────────────────────────────────────────────────────
// Cache helpers — keep localStorage role in sync
// ───────────────────────────────────────────────────────────────

/** Call after successful login to cache the user's role locally. */
export function cacheRole(role: UserRole): void {
  localStorage.setItem(KEY_ROLE, role);
}

/** Call on logout to clear the cached role. */
export function clearRoleCache(): void {
  localStorage.removeItem(KEY_ROLE);
}

/** Refresh the cached role from the server (Supabase) or localStorage. */
export async function refreshRoleCache(): Promise<void> {
  const role = await getUserRole();
  if (role) {
    cacheRole(role);
  } else {
    clearRoleCache();
  }
}

// ───────────────────────────────────────────────────────────────
// Convenience hook helpers (for useAuth composition)
// ───────────────────────────────────────────────────────────────

/**
 * Check if the user is currently authenticated.
 * Works with both Supabase and localStorage modes.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Initialize the auth service on app startup.
 * 1. Creates default admin if no users exist
 * 2. Syncs the role cache
 * 3. Validates the session
 */
export async function initAuth(): Promise<{
  authenticated: boolean;
  profile: UserProfile | null;
}> {
  // Step 1: Ensure default admin exists
  setupDefaultAdmin();

  // Step 2: Check current session
  if (!isSupabaseConfigured() || !supabase) {
    const email = getSessionEmail();
    if (email) {
      const profile = buildLocalProfile(email);
      if (profile) {
        cacheRole(profile.role);
        return { authenticated: true, profile };
      }
    }
    return { authenticated: false, profile: null };
  }

  // Supabase mode
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      if (profile) cacheRole(profile.role);
      return { authenticated: true, profile };
    }
  } catch {
    // ignore
  }

  clearRoleCache();
  return { authenticated: false, profile: null };
}

// ───────────────────────────────────────────────────────────────
// Re-exports for ergonomic imports
// ───────────────────────────────────────────────────────────────

export { PERMISSIONS, PAGE_ACCESS };
