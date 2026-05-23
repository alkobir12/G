// ═══════════════════════════════════════════════════════════════
//   Runtime Config — Parts Pro ERP
// ═══════════════════════════════════════════════════════════════
//
// Source of truth for API keys / endpoints. Read order on every
// call to getRuntimeConfig():
//   1. localStorage key `partspro_runtime_config` (set via Settings page)
//   2. Vite import.meta.env.VITE_* fallback (build-time)
//
// When the user updates keys via the Settings page, we:
//   - persist the new object to localStorage
//   - emit a `partspro:runtime-config:changed` window event so service
//     singletons (supabase, groq) can rebuild their clients lazily.
// ═══════════════════════════════════════════════════════════════

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  groqApiKey: string;
  googleApiKey: string;
  firebaseProjectId: string;
  firebaseAppId: string;
  firebaseMessagingSenderId: string;
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
    groqApiKey: local.groqApiKey || readEnv("VITE_GROQ_API_KEY"),
    googleApiKey: local.googleApiKey || readEnv("VITE_GOOGLE_API_KEY"),
    firebaseProjectId: local.firebaseProjectId || readEnv("VITE_FIREBASE_PROJECT_ID"),
    firebaseAppId: local.firebaseAppId || readEnv("VITE_FIREBASE_APP_ID"),
    firebaseMessagingSenderId: local.firebaseMessagingSenderId || readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
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

/** Convenience flags for UI. */
export function isSupabaseRuntimeReady(): boolean {
  const c = getRuntimeConfig();
  return Boolean(c.supabaseUrl && c.supabaseAnonKey);
}

export function isGroqRuntimeReady(): boolean {
  return Boolean(getRuntimeConfig().groqApiKey);
}

export function isGoogleRuntimeReady(): boolean {
  return Boolean(getRuntimeConfig().googleApiKey);
}
