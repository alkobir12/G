// ═══════════════════════════════════════════════════════════════
//   DataManagementPanel.tsx — seed + wipe buttons on the Settings page
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";
import { Database, Sparkles, Trash2 } from "lucide-react";
import { apiClient, backendSyncAll, apiDelete, apiGet } from "../services/apiClient";
import {
  MITSUBISHI_PARTS, INVOICE_PARTS, SEED_SUPPLIERS, SEED_CUSTOMERS,
  SEED_INVOICES, SEED_PURCHASES, SEED_EXPENSES, SEED_ACCOUNTS,
} from "../data/seed";
import {
  partToBackend, supplierToBackend, customerToBackend,
  invoiceToBackend, purchaseToBackend, expenseToBackend, accountToBackend,
} from "../services/schemaAdapter";

interface Props {
  onChange?: () => void;
  addToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function DataManagementPanel({ onChange, addToast }: Props) {
  const [seeding, setSeeding] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wipeText, setWipeText] = useState("");

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    setProgress(5);
    try {
      const payload = {
        parts: [...MITSUBISHI_PARTS, ...INVOICE_PARTS].map(partToBackend),
        suppliers: SEED_SUPPLIERS.map(supplierToBackend),
        customers: SEED_CUSTOMERS.map(customerToBackend),
        invoices: SEED_INVOICES.map(invoiceToBackend),
        purchases: SEED_PURCHASES.map(purchaseToBackend),
        expenses: SEED_EXPENSES.map(expenseToBackend),
        accounts: SEED_ACCOUNTS.map(accountToBackend),
        liquids: [],
        vehicles: [],
        liquid_txns: [],
      };
      setProgress(40);
      const res = await backendSyncAll(payload);
      setProgress(100);
      if (res.errors.length === 0) {
        addToast("تم تحميل البيانات التجريبية بنجاح", "success");
      } else {
        addToast(`أخطاء أثناء التحميل: ${res.errors.length}`, "error");
        console.warn("Seed errors:", res.errors);
      }
      onChange?.();
    } catch (e: any) {
      addToast(`فشل التحميل: ${e.message}`, "error");
    } finally {
      setSeeding(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }

  async function deleteAllFromTable(resource: string, idKey: "id" | "code" = "id") {
    try {
      const rows = await apiGet<any[]>(`/api/${resource}`, { limit: 1000 });
      for (const row of rows || []) {
        const key = row[idKey];
        if (!key) continue;
        try {
          await apiDelete(`/api/${resource}/${encodeURIComponent(key)}`);
        } catch {
          // continue; some tables don't expose DELETE for every row (e.g., accounts) — swallow.
        }
      }
    } catch (e: any) {
      console.warn(`wipe ${resource} failed:`, e);
    }
  }

  async function handleWipe() {
    if (wipeText !== "احذف") {
      addToast("يجب كتابة ‏احذف‏ للتأكيد", "error");
      return;
    }
    setWiping(true);
    setProgress(5);
    try {
      // Delete in dependency order (children first)
      const resources: [string, "id" | "code"][] = [
        ["liquid-transactions", "id"],
        ["invoices", "id"],
        ["purchases", "id"],
        ["expenses", "id"],
        ["parts", "id"],
        ["liquids", "id"],
        ["vehicles", "id"],
        ["customers", "id"],
        ["suppliers", "id"],
      ];
      let i = 0;
      for (const [r, k] of resources) {
        await deleteAllFromTable(r, k);
        i++;
        setProgress(Math.round((i / resources.length) * 100));
      }
      addToast("تم مسح كل البيانات", "success");
      setWipeText("");
      onChange?.();
    } catch (e: any) {
      addToast(`فشل المسح: ${e.message}`, "error");
    } finally {
      setWiping(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }

  const busy = seeding || wiping;

  return (
    <div className="rounded-2xl p-5 bg-slate-900/50 backdrop-blur border border-white/10" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-emerald-400" />
        <h3 className="font-bold text-slate-100">إدارة البيانات (Backend)</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        تتعامل هذه العمليات مباشرة مع قاعدة بيانات Supabase عبر FastAPI.
        يجب تحديث الصفحة بعد كل عملية لرؤية البيانات الجديدة.
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSeed}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-slate-900 text-sm font-bold disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {seeding ? "جارٍ التحميل…" : "تحميل بيانات تجريبية كاملة"}
          </button>
          <span className="text-[11px] text-slate-500">
            (يرسل كل البيانات التجريبية مرة واحدة عبر POST /api/sync)
          </span>
        </div>

        <div className="border-t border-white/10 pt-3 mt-3">
          <div className="text-rose-300 text-sm font-bold mb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> منطقة الخطر — مسح كل البيانات
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            لحذف كل القطع، العملاء، الموردين، الفواتير، وباقي الجداول،
            اكتب ‏‎<strong>احذف</strong>‏ في الحقل ثم اضغط الزر:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={wipeText}
              onChange={(e) => setWipeText(e.target.value)}
              placeholder="احذف"
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-slate-100 text-sm"
              dir="rtl"
            />
            <button
              onClick={handleWipe}
              disabled={busy || wipeText !== "احذف"}
              className="px-4 py-2 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-40"
            >
              {wiping ? "جارٍ المسح…" : "مسح كل البيانات"}
            </button>
          </div>
        </div>

        {progress > 0 && (
          <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
