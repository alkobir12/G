// ═══════════════════════════════════════════════════════════════
//   Runtime Config — Parts Pro ERP
// ═══════════════════════════════════════════════════════════════
//
// Source of truth for the per-tenant settings that legitimately live in the
// browser:
//   - Supabase URL + anon key (browser → Supabase direct fallback path; the
//     primary path is now FastAPI backend which has its own SUPABASE_KEY)
//   - Infobip SMS/WhatsApp credentials (only used by the in-app invoice
//     preview to send SMS — no backend route consumes them)
//   - apiUrl (Vite base override for /api/* calls)
//
// IMPORTANT: Groq and Google AI keys are NOT here. They are server-only —
// stored in /app/backend/.env and proxied via /api/ai/groq/chat and
// /api/ai/gemini/generate. (Phase 4 §C1: key exposure remediation.)
//
// Read order in getRuntimeConfig():
//   1. localStorage["partspro_runtime_config"]   (set via Settings page)
//   2. Vite import.meta.env.VITE_*               (build-time)
//
// When the user updates a key via the Settings page, saveRuntimeConfig()
// emits `partspro:runtime-config:changed` so service singletons rebuild.
// ═══════════════════════════════════════════════════════════════

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  infobipBaseUrl: string;
  infobipApiKey: string;
  apiUrl: string;
}

const LS_KEY = "partspro_runtime_config";
export const RUNTIME_CONFIG_EVENT = "partspro:runtime-config:changed";

function readEnv(name: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env || {};
  return (env[name] as string) || "";
}

function readLocal(): Partial<RuntimeConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<RuntimeConfig>;
  } catch {
    return {};
  }
}

/** Read merged runtime config (localStorage overrides env). */
export function getRuntimeConfig(): RuntimeConfig {
  const local = readLocal();
  return {
    supabaseUrl: local.supabaseUrl || readEnv("VITE_SUPABASE_URL"),
    supabaseAnonKey: local.supabaseAnonKey || readEnv("VITE_SUPABASE_ANON_KEY"),
    infobipBaseUrl: local.infobipBaseUrl || readEnv("VITE_INFOBIP_BASE_URL"),
    infobipApiKey: local.infobipApiKey || readEnv("VITE_INFOBIP_API_KEY"),
    apiUrl: local.apiUrl || readEnv("VITE_API_URL"),
  };
}

/** Persist runtime config to localStorage and notify subscribers. */
export function saveRuntimeConfig(partial: Partial<RuntimeConfig>): void {
  if (typeof window === "undefined") return;
  const merged: Partial<RuntimeConfig> = { ...readLocal(), ...partial };
  // Strip empty values so env fallback can take over if user clears a field.
  Object.keys(merged).forEach((k) => {
    const v = (merged as Record<string, unknown>)[k];
    if (v === "" || v === null || v === undefined) {
      delete (merged as Record<string, unknown>)[k];
    }
  });
  window.localStorage.setItem(LS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent(RUNTIME_CONFIG_EVENT, { detail: getRuntimeConfig() }));
}

/** Clear all runtime config (env vars become the only source). */
export function clearRuntimeConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY);
  window.dispatchEvent(new CustomEvent(RUNTIME_CONFIG_EVENT, { detail: getRuntimeConfig() }));
}

/** Convenience flag for UI. */
export function isSupabaseRuntimeReady(): boolean {
  const c = getRuntimeConfig();
  return Boolean(c.supabaseUrl && c.supabaseAnonKey);
}
