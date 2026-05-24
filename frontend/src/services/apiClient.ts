// ═══════════════════════════════════════════════════════════════
//   apiClient.ts — Single axios instance for the FastAPI backend
//   Phase 4.4: attach `Authorization: Bearer <jwt>` from localStorage
//   and transparently refresh tokens on 401.
// ═══════════════════════════════════════════════════════════════
import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { getRuntimeConfig } from "./runtimeConfig";

const KEY_JWT     = "partspro_jwt";
const KEY_REFRESH = "partspro_refresh";
const KEY_USER    = "partspro_user";
const KEY_ROLE    = "parts_pro_role";

function resolveBaseUrl(): string {
  const rc = getRuntimeConfig().apiUrl;
  if (rc) return rc.replace(/\/+$/, "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env?.VITE_API_URL || "";
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
  headers: { "X-Client": "partspro-web" },
});

// ── Request interceptor: refresh baseURL + attach JWT ──
apiClient.interceptors.request.use((config) => {
  config.baseURL = resolveBaseUrl();
  try {
    const jwt = localStorage.getItem(KEY_JWT);
    if (jwt) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${jwt}`;
    }
  } catch { /* ignore */ }
  return config;
});

// ── Response interceptor: refresh on 401, retry once ──
// Auth endpoints are excluded from the refresh loop to avoid infinite recursion.
let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem(KEY_REFRESH);
  if (!refresh) return null;
  try {
    const res = await axios.post(`${resolveBaseUrl()}/api/auth/refresh`, { refresh_token: refresh }, {
      timeout: 10_000,
      headers: { "X-Client": "partspro-web" },
    });
    const data = res.data as { access_token?: string; refresh_token?: string };
    if (data?.access_token) {
      localStorage.setItem(KEY_JWT, data.access_token);
      if (data.refresh_token) localStorage.setItem(KEY_REFRESH, data.refresh_token);
      return data.access_token;
    }
  } catch { /* fall through */ }
  // refresh failed — clear session
  localStorage.removeItem(KEY_JWT);
  localStorage.removeItem(KEY_REFRESH);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_ROLE);
  try { window.dispatchEvent(new CustomEvent("pp_auth_event", { detail: { event: "SIGNED_OUT", profile: null } })); } catch { /* ignore */ }
  return null;
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean } | undefined;
    const url = (original?.url || "").toString();
    const isAuthPath = url.includes("/api/auth/");
    if (error.response?.status !== 401 || !original || original._retry || isAuthPath) {
      return Promise.reject(error);
    }
    original._retry = true;
    if (!refreshInFlight) refreshInFlight = tryRefresh().finally(() => { refreshInFlight = null; });
    const newToken = await refreshInFlight;
    if (!newToken) return Promise.reject(error);
    original.headers = original.headers || {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
    return apiClient.request(original);
  },
);

export interface ApiError extends Error {
  status?: number;
  code?: string;
  detail?: unknown;
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function translateError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>;
    const e: ApiError = new Error(
      ax.response?.data?.error?.message ||
        ax.response?.data?.detail ||
        ax.message ||
        "Network error",
    );
    e.status = ax.response?.status;
    e.code = ax.response?.data?.error?.code || ax.code;
    e.detail = ax.response?.data?.error?.detail ?? ax.response?.data?.detail;
    return e;
  }
  const e: ApiError = new Error(String(err));
  return e;
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const res = await apiClient.get(path, { params });
    return unwrap<T>(res.data);
  } catch (e) {
    throw translateError(e);
  }
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  try {
    const res = await apiClient.post(path, body);
    return unwrap<T>(res.data);
  } catch (e) {
    throw translateError(e);
  }
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  try {
    const res = await apiClient.put(path, body);
    return unwrap<T>(res.data);
  } catch (e) {
    throw translateError(e);
  }
}

export async function apiDelete<T = { success: boolean; id?: string }>(path: string): Promise<T> {
  try {
    const res = await apiClient.delete(path);
    return res.data as T;
  } catch (e) {
    throw translateError(e);
  }
}

/** Health check: returns true if backend reachable. */
export async function pingBackend(): Promise<boolean> {
  try {
    await apiClient.get("/api/health", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function backendFetchAll(): Promise<Record<string, any[]>> {
  try {
    const res = await apiClient.get("/api/sync", { timeout: 30_000 });
    return res.data as Record<string, any[]>;
  } catch (e) {
    throw translateError(e);
  }
}

export async function backendSyncAll(payload: Record<string, any[]>): Promise<{ success: boolean; errors: string[] }> {
  try {
    const res = await apiClient.post("/api/sync", payload, { timeout: 60_000 });
    return res.data as { success: boolean; errors: string[] };
  } catch (e) {
    throw translateError(e);
  }
}
