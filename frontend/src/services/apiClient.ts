// ═══════════════════════════════════════════════════════════════
//   apiClient.ts — Single axios instance for the FastAPI backend
// ═══════════════════════════════════════════════════════════════
import axios, { AxiosError } from "axios";
import { getRuntimeConfig } from "./runtimeConfig";

function resolveBaseUrl(): string {
  // 1. runtime config (localStorage / Settings page)
  const rc = getRuntimeConfig().apiUrl;
  if (rc) return rc.replace(/\/+$/, "");
  // 2. Vite env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env?.VITE_API_URL || "";
  if (env) return env.replace(/\/+$/, "");
  // 3. same-origin fallback (works when backend is co-hosted under /api/)
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
  headers: { "X-Client": "partspro-web" },
});

apiClient.interceptors.request.use((config) => {
  // Refresh baseURL in case runtime config changed (cheap; just a string read)
  config.baseURL = resolveBaseUrl();
  return config;
});

export interface ApiError extends Error {
  status?: number;
  code?: string;
  detail?: unknown;
}

function unwrap<T>(payload: unknown): T {
  // Backend convention: lists/objects are wrapped in { data: ... }
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

/** Health check: returns true if backend reachable + Supabase configured. */
export async function pingBackend(): Promise<boolean> {
  try {
    await apiClient.get("/api/health", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** GET /api/sync — bulk fetch of all entities. */
export async function backendFetchAll(): Promise<Record<string, any[]>> {
  try {
    const res = await apiClient.get("/api/sync", { timeout: 30_000 });
    return res.data as Record<string, any[]>;
  } catch (e) {
    throw translateError(e);
  }
}

/** POST /api/sync — bulk upsert. Body shape matches SyncRequest in backend/main.py. */
export async function backendSyncAll(payload: Record<string, any[]>): Promise<{ success: boolean; errors: string[] }> {
  try {
    const res = await apiClient.post("/api/sync", payload, { timeout: 60_000 });
    return res.data as { success: boolean; errors: string[] };
  } catch (e) {
    throw translateError(e);
  }
}
