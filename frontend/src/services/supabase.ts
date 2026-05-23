// ═══════════════════════════════════════════════════════════
// Supabase Client Service - Full Sync
// ═══════════════════════════════════════════════════════════
// Reads config from runtimeConfig (localStorage first, env fallback).
// Client is rebuilt automatically when the user updates keys via the
// Settings page (listens to RUNTIME_CONFIG_EVENT).
// ═══════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeConfig, RUNTIME_CONFIG_EVENT } from "./runtimeConfig";

let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient | null {
  const cfg = getRuntimeConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (e) {
    console.error("[supabase] Failed to build client:", e);
    return null;
  }
}

function getClient(): SupabaseClient | null {
  if (_client === null) _client = buildClient();
  return _client;
}

// Rebuild on runtime config change (Settings page save).
if (typeof window !== "undefined") {
  window.addEventListener(RUNTIME_CONFIG_EVENT, () => {
    _client = buildClient();
  });
}

/**
 * Backwards-compat export.
 * Code that does `import { supabase } from "../services/supabase"` keeps working,
 * but the client is now lazily resolved on each property access via a Proxy.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getClient();
    if (!c) {
      // Methods like .from(), .auth, etc. will be called on null → throw a clearer error.
      if (typeof prop === "string") {
        return (...args: unknown[]) => {
          throw new Error(
            `Supabase is not configured. Set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ` +
            `(env or Settings page) before calling supabase.${String(prop)}(...). args=${args.length}`,
          );
        };
      }
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Reflect.get(c as any, prop, receiver);
  },
}) as SupabaseClient;

export function isSupabaseConfigured(): boolean {
  return getClient() !== null;
}

/** Force a rebuild of the client (call this after writing runtimeConfig). */
export function reinitSupabase(): void {
  _client = buildClient();
}

// ═══════════════════════════════════════════════════════════
// Sync: Push all local data to Supabase
// ═══════════════════════════════════════════════════════════

export async function syncAllToSupabase(data: {
  parts: any[];
  suppliers: any[];
  customers: any[];
  invoices: any[];
  purchases: any[];
  expenses: any[];
  accounts: any[];
  journal?: any[];
  settings: any;
}) {
  const client = getClient();
  if (!client) return { success: false, error: "Supabase not configured" };
  try {
    const tables = [
      { name: "parts", data: data.parts },
      { name: "suppliers", data: data.suppliers },
      { name: "customers", data: data.customers },
      { name: "invoices", data: data.invoices },
      { name: "purchases", data: data.purchases },
      { name: "expenses", data: data.expenses },
      { name: "accounts", data: data.accounts },
      { name: "journal", data: data.journal || [] },
    ];
    for (const t of tables) {
      if (t.data.length > 0) {
        await client.from(t.name).upsert(t.data, { onConflict: "id" });
      }
    }
    if (data.settings) {
      await client.from("settings").upsert(data.settings);
    }
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════
// Fetch: Pull all data from Supabase
// ═══════════════════════════════════════════════════════════

export async function fetchAllFromSupabase() {
  const client = getClient();
  if (!client) {
    return {
      parts: [],
      suppliers: [],
      customers: [],
      invoices: [],
      purchases: [],
      expenses: [],
      accounts: [],
      settings: null,
      errors: [],
    };
  }
  const result: any = { errors: [] };
  const tables = ["parts", "suppliers", "customers", "invoices", "purchases", "expenses", "accounts", "journal"];
  for (const t of tables) {
    const { data, error } = await client.from(t).select("*");
    result[t] = data || [];
    if (error) result.errors.push(`${t}: ${error.message}`);
  }
  const { data: settings } = await client.from("settings").select("*").single();
  result.settings = settings;
  return result;
}

// ═══════════════════════════════════════════════════════════
// Ping: Check if Supabase is reachable
// ═══════════════════════════════════════════════════════════

export async function pingSupabase(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    const { error } = await client.from("parts").select("count", { count: "exact", head: true });
    return !error;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// Individual sync helpers
// ═══════════════════════════════════════════════════════════

export async function syncInvoice(invoice: any) {
  const client = getClient();
  if (!client) return;
  await client.from("invoices").upsert(invoice, { onConflict: "id" });
}

export async function syncExpense(expense: any) {
  const client = getClient();
  if (!client) return;
  await client.from("expenses").upsert(expense, { onConflict: "id" });
}

export async function syncPurchase(purchase: any) {
  const client = getClient();
  if (!client) return;
  await client.from("purchases").upsert(purchase, { onConflict: "id" });
}

// ═══════════════════════════════════════════════════════════
// Runtime-config helpers — persist user API keys to Supabase `settings` table
// ═══════════════════════════════════════════════════════════

/**
 * Try to persist a runtime-config blob to a `partspro_runtime_config` row in
 * the `settings` table (best-effort; silently ignores errors if Supabase
 * isn't reachable or the table doesn't have the expected shape).
 */
export async function persistRuntimeConfigToSupabase(blob: Record<string, string>): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.from("settings").upsert(
      { id: "partspro_runtime_config", value: blob, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  } catch (e) {
    console.warn("[supabase] persistRuntimeConfigToSupabase skipped:", e);
  }
}

// ═══════════════════════════════════════════════════════════
// Migration SQL (for reference in Settings page)
// ═══════════════════════════════════════════════════════════
export const MIGRATION_SQL = `-- Parts Pro Database Schema
CREATE TABLE IF NOT EXISTS parts (id TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS accounts (code TEXT PRIMARY KEY, ...);
CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ);
-- See migration_v2.sql for full schema`;
