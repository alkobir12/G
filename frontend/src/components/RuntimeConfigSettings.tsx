/**
 * ═══════════════════════════════════════════════════════════════
 *   RuntimeConfigSettings — Parts Pro ERP
 *   Lets the user paste API keys / endpoints at runtime.
 *   Persisted to localStorage + (best-effort) Supabase settings table.
 * ═══════════════════════════════════════════════════════════════
 */
import { useEffect, useState } from "react";
import { KeyRound, Save, RefreshCw, Database, Brain, Search, Phone, Trash2 } from "lucide-react";
import {
  getRuntimeConfig,
  saveRuntimeConfig,
  clearRuntimeConfig,
  RUNTIME_CONFIG_EVENT,
  type RuntimeConfig,
} from "../services/runtimeConfig";
import { persistRuntimeConfigToSupabase, isSupabaseConfigured } from "../services/supabase";

interface Props {
  onSaved?: () => void;
}

export default function RuntimeConfigSettings({ onSaved }: Props) {
  const [draft, setDraft] = useState<RuntimeConfig>(() => getRuntimeConfig());
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState<null | "ok" | "skipped">(null);

  useEffect(() => {
    const handler = () => setDraft(getRuntimeConfig());
    window.addEventListener(RUNTIME_CONFIG_EVENT, handler);
    return () => window.removeEventListener(RUNTIME_CONFIG_EVENT, handler);
  }, []);

  function update<K extends keyof RuntimeConfig>(key: K, value: RuntimeConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSavedToCloud(null);
    saveRuntimeConfig(draft);
    // Best-effort cloud persist (will silently skip if Supabase not configured / table missing).
    try {
      if (isSupabaseConfigured()) {
        await persistRuntimeConfigToSupabase(draft as unknown as Record<string, string>);
        setSavedToCloud("ok");
      } else {
        setSavedToCloud("skipped");
      }
    } catch {
      setSavedToCloud("skipped");
    }
    setSaving(false);
    onSaved?.();
  }

  function handleClear() {
    if (!confirm("هل أنت متأكد من مسح كل المفاتيح المحفوظة محلياً؟")) return;
    clearRuntimeConfig();
    setDraft(getRuntimeConfig());
  }

  const inputBase =
    "w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50";

  return (
    <div className="rounded-2xl p-5 bg-slate-900/50 backdrop-blur border border-white/10" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-amber-400" />
        <h3 className="font-bold text-slate-100">مفاتيح API ومسارات الخدمات</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        تُحفظ هذه المفاتيح في متصفحك أولاً (localStorage)، ثم تُزامن مع Supabase إذا كانت متاحة.
        تُستخدم في الواجهة فقط؛ المفاتيح في متغيرات البيئة (Vite) تبقى كقيم احتياطية.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Supabase */}
        <div className="md:col-span-2 flex items-center gap-2 text-emerald-300/80 text-xs font-bold pt-2">
          <Database className="w-4 h-4" /> Supabase
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Supabase URL</label>
          <input
            className={inputBase}
            placeholder="https://xxx.supabase.co"
            value={draft.supabaseUrl}
            onChange={(e) => update("supabaseUrl", e.target.value.trim())}
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Supabase Anon Key</label>
          <input
            className={inputBase}
            type={showSecrets ? "text" : "password"}
            placeholder="eyJhbGci..."
            value={draft.supabaseAnonKey}
            onChange={(e) => update("supabaseAnonKey", e.target.value.trim())}
          />
        </div>

        {/* Groq + Google sections removed in Phase 4 §C1 — these API keys
            are now stored only in /app/backend/.env and never reach the
            browser bundle. To rotate them, edit the backend .env and
            restart the backend service. */}
        <div className="md:col-span-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-200">
          🔒 مفاتيح Groq و Google AI مُدارة من جانب الخادم الآن — لم تعد مُضمَّنة في ملف المتصفح.
          لتدويرها، عدّل <code>/app/backend/.env</code> وأعد تشغيل الخادم.
        </div>

        {/* Firebase removed (Phase 3) — Firestore sync was disabled and the
            firebase npm dep was uninstalled. Leaving the runtime-config fields
            in storage is harmless; they're just no longer surfaced in the UI. */}

        {/* Infobip */}
        <div className="md:col-span-2 flex items-center gap-2 text-rose-300/80 text-xs font-bold pt-3">
          <Phone className="w-4 h-4" /> Infobip (SMS / WhatsApp — اختياري)
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Infobip Base URL</label>
          <input className={inputBase} placeholder="https://xxx.api.infobip.com" value={draft.infobipBaseUrl} onChange={(e) => update("infobipBaseUrl", e.target.value.trim())} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Infobip API Key</label>
          <input className={inputBase} type={showSecrets ? "text" : "password"} value={draft.infobipApiKey} onChange={(e) => update("infobipApiKey", e.target.value.trim())} />
        </div>

        {/* Backend API URL */}
        <div className="md:col-span-2 flex items-center gap-2 text-teal-300/80 text-xs font-bold pt-3">
          🔌 FastAPI Backend (اختياري)
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] text-slate-400 mb-1">VITE_API_URL</label>
          <input className={inputBase} placeholder="https://xxx.preview.emergentagent.com" value={draft.apiUrl} onChange={(e) => update("apiUrl", e.target.value.trim())} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-slate-900 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ
        </button>
        <button
          onClick={() => setShowSecrets((s) => !s)}
          className="px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs"
        >
          {showSecrets ? "إخفاء المفاتيح" : "إظهار المفاتيح"}
        </button>
        <button
          onClick={handleClear}
          className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> مسح الكل
        </button>
        {savedToCloud === "ok" && (
          <span className="text-[11px] text-emerald-300">✅ تم الحفظ محلياً وعلى Supabase</span>
        )}
        {savedToCloud === "skipped" && (
          <span className="text-[11px] text-amber-300">✅ تم الحفظ محلياً (Supabase غير مكوّن — لم تتم المزامنة)</span>
        )}
      </div>
    </div>
  );
}
