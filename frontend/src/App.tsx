import { useState, useMemo, useCallback, useEffect } from "react";
import {
  LayoutDashboard, Package2, Receipt, Users, BarChart3,
  Plus, Pencil, Trash2, X, Search, AlertTriangle, Printer,
  ShoppingCart, TrendingUp, TrendingDown, DollarSign,
  CheckCircle2, Building2, Bell, Save,
  Settings as Cog,
  Truck, ClipboardList,
  Download, RefreshCw,
  AlertOctagon, Upload, BookOpen, Code,
  UserCircle, BarChart4,
  PieChart,
  Phone, MapPin,
  ShieldCheck, RotateCcw, List, SlidersHorizontal,
  LogOut, KeyRound,
} from "lucide-react";
import RakanAnalytics from "./components/RakanAnalytics";
import FinancialAuditor from "./components/FinancialAuditor";
import CustomerLedger from "./components/CustomerLedger";
import JarvisChat from "./components/JarvisChat";
import InvoicePreview from "./components/InvoicePreview";
import FileImportPanel from "./components/FileImportPanel";
import {
  isSupabaseConfigured, fetchAllFromSupabase,
  syncAllToSupabase, syncInvoice, syncExpense,
  pingSupabase, MIGRATION_SQL,
} from "./services/supabase";
import {
  signIn, signUp, signOut,
  onAuthChange, canDelete, canViewPage,
  initAuth, cacheRole, setupDefaultAdmin, getDefaultAdmin,
  type UserRole,
} from "./services/auth";
import AuthModal, { type RegisterData } from "./components/AuthModal";
import RuntimeConfigSettings from "./components/RuntimeConfigSettings";
import OnlineIndicator from "./components/OnlineIndicator";
import DataManagementPanel from "./components/DataManagementPanel";
import { isSupabaseRuntimeReady, RUNTIME_CONFIG_EVENT } from "./services/runtimeConfig";
import { backendFetchAll, backendSyncAll, apiDelete, pingBackend } from "./services/apiClient";
import {
  partFromBackend, customerFromBackend, supplierFromBackend, invoiceFromBackend,
  purchaseFromBackend, expenseFromBackend, accountFromBackend, settingsFromBackend,
  partToBackend, customerToBackend, supplierToBackend, invoiceToBackend,
  purchaseToBackend, expenseToBackend, accountToBackend,
} from "./services/schemaAdapter";
import {
  validatePart, validateSupplier, validateCustomer,
  validateInvoice, validateExpense,
} from "./lib/validation";
import {
  createSaleJournal, createPurchaseJournal, createExpenseJournal,
  validateBatch,
  applyJournalToAccounts, generateJournalId,
} from "./services/journal";
// Firestore sync removed per Phase 3 — backend (FastAPI + Supabase) is the source of truth.
// To re-enable Firebase later: restore src/hooks/useFirestoreSync.ts, src/services/firestore.ts,
// src/services/firebase.ts, reinstall the `firebase` npm package, and uncomment its import here.

import {
  MITSUBISHI_PARTS, INVOICE_PARTS, SEED_SUPPLIERS, SEED_CUSTOMERS,
  SEED_INVOICES, SEED_PURCHASES, SEED_EXPENSES, SEED_ACCOUNTS,
  SEED_PRICE_HISTORY, SEED_JOURNAL, DEFAULT_SETTINGS
} from "./data/seed";
import type { Part, Supplier, Customer, Invoice, Purchase, Expense, Account, AppSettings, PriceHistory, JournalEntry } from "./data/seed";
import { fmt, fmtInt, today, newId, stockStatus } from "./lib/utils";

// ═══════════════════════════════════════════════════════════════
// TYPES & CONTEXT
// ═══════════════════════════════════════════════════════════════

type ToastType = "success" | "error" | "info" | "warning";
interface ToastItem { id: string; message: string; type: ToastType; }

type Page = "dashboard" | "inventory" | "pos" | "customers" | "transactions" | "accounts" | "settings";

// ═══════════════════════════════════════════════════════════════
// HOOK: useMediaQuery
// ═══════════════════════════════════════════════════════════════

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

/** GlassCard — Liquid Design */
function GlassCard({ children, className = "", title, icon: Icon, action }: {
  children: React.ReactNode; className?: string; title?: string;
  icon?: React.ElementType; action?: React.ReactNode;
}) {
  return (
    <div className={`glass-liquid rounded-2xl transition-all duration-500 hover:shadow-2xl liquid-glow ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            {Icon && <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-amber-400" /></div>}
            {title && <h3 className="font-bold text-slate-100 text-base">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/** HoverCard — Liquid Design */
function HoverCard({ children, className = "", onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass-liquid rounded-2xl p-5 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] cursor-pointer liquid-glow ${className}`}
    >
      {children}
    </div>
  );
}

/** Btn — Liquid Design */
function Btn({ children, variant = "primary", size = "md", className = "", onClick, disabled = false, type = "button", icon: Icon }: {
  children?: React.ReactNode; variant?: "primary" | "ghost" | "danger" | "success" | "outline" | "secondary";
  size?: "sm" | "md" | "lg" | "icon"; className?: string; onClick?: () => void;
  disabled?: boolean; type?: "button" | "submit" | "reset"; icon?: React.ElementType;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizeCls = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-6 py-3 text-base" : size === "icon" ? "w-9 h-9 p-0" : "px-4 py-2 text-sm";
  const varCls = variant === "primary" ? "liquid-btn text-white font-bold"
    : variant === "ghost" ? "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white"
    : variant === "danger" ? "bg-rose-500/80 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 backdrop-blur-sm"
    : variant === "success" ? "bg-emerald-500/80 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 backdrop-blur-sm"
    : variant === "secondary" ? "bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 backdrop-blur-sm border border-white/5"
    : "border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/60 backdrop-blur-sm";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizeCls} ${varCls} ${className}`}>
      {Icon && <Icon className={size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}

/** Input — Liquid Design */
function Input({ label, value, onChange, placeholder = "", type = "text", className = "", required = false, min, max, step, name, readOnly = false, icon: Icon }: {
  label?: string; value: string | number; onChange: (v: string) => void; placeholder?: string;
  type?: string; className?: string; required?: boolean; min?: number | string; max?: number | string;
  step?: number | string; name?: string; readOnly?: boolean; icon?: React.ElementType;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-semibold text-slate-400">{label}{required && <span className="text-rose-400 mr-1">*</span>}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
        <input
          type={type} value={value} name={name} min={min} max={max} step={step} required={required} readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${Icon ? "pr-10" : "px-3.5"} py-2.5 pl-3.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
}

/** Select — Liquid Design */
function Select({ label, value, onChange, options, className = "", required = false }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string; required?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-semibold text-slate-400">{label}{required && <span className="text-rose-400 mr-1">*</span>}</label>}
      <select
        value={value} required={required}
        onChange={(e) => onChange(e.target.value)}
        className="px-3.5 py-2.5 rounded-xl liquid-input text-sm text-slate-100 focus:outline-none transition-all"
      >
        {options.map((o) => <option key={o.value} value={o.value} className="bg-slate-800 text-slate-100">{o.label}</option>)}
      </select>
    </div>
  );
}

/** Toggle — Liquid Design */
function Toggle({ label, checked, onChange, className = "" }: {
  label?: string; checked: boolean; onChange: (v: boolean) => void; className?: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`w-10 rounded-full p-0.5 transition-colors duration-300 ${checked ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-slate-600"}`} style={{ height: "22px" }}>
        <div className={`rounded-full transition-transform duration-300 ${checked ? "bg-white translate-x-5" : "bg-slate-400 translate-x-0"}`} style={{ width: "18px", height: "18px" }} />
      </div>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </button>
  );
}

/** Modal — Liquid Design */
function Modal({ open, onClose, title, children, maxWidth = "max-w-lg", footer }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
  maxWidth?: string; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className={`relative liquid-modal rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** ToastContainer — Liquid Design */
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg shadow-black/30 backdrop-blur-md text-sm font-medium border transition-all duration-300 ${
          t.type === "success" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" :
          t.type === "error" ? "bg-rose-500/15 text-rose-300 border-rose-500/20" :
          t.type === "warning" ? "bg-amber-500/15 text-amber-300 border-amber-500/20" :
          "bg-sky-500/15 text-sky-300 border-sky-500/20"
        }`}>
          {t.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
           t.type === "error" ? <AlertOctagon className="w-4 h-4 text-rose-400" /> :
           t.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
           <Bell className="w-4 h-4 text-sky-400" />}
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="mr-1 hover:opacity-100 opacity-60 transition-opacity"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

/** StatusPill — Liquid Design */
function StatusPill({ status }: { status: string }) {
  const cls = status === "متوفر" || status === "مكتمل" || status === "مدفوعة"
    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
    : status === "منخفض" || status === "جزئي" || status === "قيد الانتظار"
    ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
    : status === "نفاذ" || status === "معلق" || status === "غير مدفوعة"
    ? "bg-rose-500/15 text-rose-300 border border-rose-500/25"
    : status === "مستخدم" || status === "نشط"
    ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
    : "bg-slate-500/15 text-slate-400 border border-slate-500/25";
  const dotCls = status === "متوفر" || status === "مكتمل" ? "bg-emerald-400 liquid-dot"
    : status === "منخفض" ? "bg-amber-400 liquid-dot"
    : status === "نفاذ" ? "bg-rose-400 liquid-dot"
    : "bg-slate-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
      {status}
    </span>
  );
}

/** KPI — Liquid Design */
function KPI({ title, value, subtitle, icon: Icon, trend, trendUp, color = "amber" }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType;
  trend?: string; trendUp?: boolean; color?: "amber" | "emerald" | "rose" | "sky" | "violet";
}) {
  const colorMap = {
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-amber-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", glow: "shadow-rose-500/20" },
    sky: { bg: "bg-sky-500/10", text: "text-sky-400", glow: "shadow-sky-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", glow: "shadow-violet-500/20" },
  };
  const c = colorMap[color];
  return (
    <HoverCard>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-extrabold text-slate-100 drop-shadow-sm">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trendUp ? "text-emerald-400" : "text-rose-400"}`}>
              {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend}
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shadow-lg ${c.glow}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </HoverCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORMS (kept from original)
// ═══════════════════════════════════════════════════════════════

/** PartForm */
function PartForm({ part, onSave, onCancel }: {
  part?: Part | null; onSave: (p: Part) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Part>({
    id: part?.id || "", oem: part?.oem || "", name_ar: part?.name_ar || "",
    brand: part?.brand || "Toyota", category: part?.category || "محرك",
    model: part?.model || "", stock: part?.stock ?? 0, min_stock: part?.min_stock ?? 2,
    location: part?.location || "", cost: part?.cost ?? 0, price: part?.price ?? 0, wholesale: part?.wholesale ?? 0,
  });
  const categories = ["محرك", "تبريد", "كهرباء", "فرامل", "عليق", "نقل", "هيكل", "أخرى"];
  const brands = ["Toyota", "Mitsubishi", "Nissan", "Hyundai", "Kia", "Ford", "Chevrolet", "عام"];
  const update = (field: keyof Part, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_ar || !form.oem) return;
    onSave({ ...form, id: form.id || newId("SKU") });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="الاسم بالعربي" value={form.name_ar} onChange={(v) => update("name_ar", v)} required placeholder="مثال: بستم مكينة" />
        <Input label="رقم OEM" value={form.oem} onChange={(v) => update("oem", v)} required placeholder="مثال: 13101-17100" />
        <Select label="الماركة" value={form.brand} onChange={(v) => update("brand", v)} options={brands.map((b) => ({ value: b, label: b }))} />
        <Select label="الفئة" value={form.category} onChange={(v) => update("category", v)} options={categories.map((c) => ({ value: c, label: c }))} />
        <Input label="الموديل / المركبة" value={form.model} onChange={(v) => update("model", v)} placeholder="مثال: Hilux 2006" />
        <Input label="الموقع في المستودع" value={form.location} onChange={(v) => update("location", v)} placeholder="مثال: A01-ممر1" />
        <Input label="الكمية" value={form.stock} onChange={(v) => update("stock", Number(v))} type="number" min={0} />
        <Input label="الحد الأدنى" value={form.min_stock} onChange={(v) => update("min_stock", Number(v))} type="number" min={0} />
        <Input label="سعر التكلفة" value={form.cost} onChange={(v) => update("cost", Number(v))} type="number" min={0} step={0.01} />
        <Input label="سعر البيع" value={form.price} onChange={(v) => update("price", Number(v))} type="number" min={0} step={0.01} />
        <Input label="سعر الجملة" value={form.wholesale} onChange={(v) => update("wholesale", Number(v))} type="number" min={0} step={0.01} />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onCancel} type="button">إلغاء</Btn>
        <Btn type="submit" icon={Save}>{part ? "حفظ التعديلات" : "إضافة القطعة"}</Btn>
      </div>
    </form>
  );
}

/** SupplierForm */
function SupplierForm({ supplier, onSave, onCancel }: {
  supplier?: Supplier | null; onSave: (s: Supplier) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Supplier>({
    id: supplier?.id || "", name: supplier?.name || "", contact: supplier?.contact || "",
    phone: supplier?.phone || "", city: supplier?.city || "", rating: supplier?.rating ?? 4, balance: supplier?.balance ?? 0,
  });
  const update = (field: keyof Supplier, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({ ...form, id: form.id || newId("SUP") });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="اسم المورد" value={form.name} onChange={(v) => update("name", v)} required placeholder="مثال: شركة النخيل" />
        <Input label="اسم الشخص المسؤول" value={form.contact} onChange={(v) => update("contact", v)} placeholder="مثال: فهد البقمي" />
        <Input label="رقم الهاتف" value={form.phone} onChange={(v) => update("phone", v)} placeholder="05xxxxxxxx" type="tel" />
        <Input label="المدينة" value={form.city} onChange={(v) => update("city", v)} placeholder="مثال: الرياض" />
        <Input label="التقييم (1-5)" value={form.rating} onChange={(v) => update("rating", Math.min(5, Math.max(1, Number(v))))} type="number" min={1} max={5} step={0.1} />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onCancel} type="button">إلغاء</Btn>
        <Btn type="submit" icon={Save}>{supplier ? "حفظ التعديلات" : "إضافة المورد"}</Btn>
      </div>
    </form>
  );
}

/** CustomerForm */
function CustomerForm({ customer, onSave, onCancel }: {
  customer?: Customer | null; onSave: (c: Customer) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Customer>({
    id: customer?.id || "", name: customer?.name || "", phone: customer?.phone || "",
    email: customer?.email || "", address: customer?.address || "", balance: customer?.balance ?? 0,
    total_bought: customer?.total_bought ?? 0, last_visit: customer?.last_visit || today(),
  });
  const update = (field: keyof Customer, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({ ...form, id: form.id || newId("CUS") });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="اسم العميل" value={form.name} onChange={(v) => update("name", v)} required placeholder="مثال: أحمد الشمري" />
        <Input label="رقم الهاتف" value={form.phone} onChange={(v) => update("phone", v)} placeholder="05xxxxxxxx" type="tel" />
        <Input label="البريد الإلكتروني" value={form.email} onChange={(v) => update("email", v)} placeholder="example@email.com" type="email" />
        <Input label="العنوان" value={form.address} onChange={(v) => update("address", v)} placeholder="مثال: الرياض" />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onCancel} type="button">إلغاء</Btn>
        <Btn type="submit" icon={Save}>{customer ? "حفظ التعديلات" : "إضافة العميل"}</Btn>
      </div>
    </form>
  );
}

/** ExpenseForm */
function ExpenseForm({ expense, onSave, onCancel }: {
  expense?: Expense | null; onSave: (e: Expense) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Expense>({
    id: expense?.id || "", date: expense?.date || today(), category: expense?.category || "إيجار",
    description: expense?.description || "", amount: expense?.amount ?? 0, account: expense?.account || "5200",
    reason: expense?.reason || "", party: expense?.party || "",
  });
  const categories = ["إيجار", "رواتب", "كهرباء", "صيانة", "تسويق", "نقل", "مستلزمات", "أخرى"];
  const update = (field: keyof Expense, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    onSave({ ...form, id: form.id || newId("EXP") });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="التاريخ" value={form.date} onChange={(v) => update("date", v)} type="date" />
        <Select label="الفئة" value={form.category} onChange={(v) => update("category", v)} options={categories.map((c) => ({ value: c, label: c }))} />
        <Input label="الوصف" value={form.description} onChange={(v) => update("description", v)} required placeholder="مثال: إيجار المستودع" />
        <Input label="المبلغ" value={form.amount} onChange={(v) => update("amount", Number(v))} type="number" min={0} step={0.01} required />
        <Input label="السبب" value={form.reason || ""} onChange={(v) => update("reason", v)} placeholder="مثال: إيجار شهري" />
        <Input label="الجهة" value={form.party || ""} onChange={(v) => update("party", v)} placeholder="مثال: شركة العقارات الذهبية" />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onCancel} type="button">إلغاء</Btn>
        <Btn type="submit" icon={Save}>{expense ? "حفظ التعديلات" : "إضافة المصروف"}</Btn>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK: useToast
// ═══════════════════════════════════════════════════════════════

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, addToast, dismiss };
}

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE PERSISTENCE
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'partspro_data';
const INIT_KEY = 'partspro_init';

const loadData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

const isFirstVisit = () => {
  return !localStorage.getItem(INIT_KEY);
};

const markInitialized = () => {
  localStorage.setItem(INIT_KEY, "true");
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const { toasts, addToast, dismiss } = useToast();

  // Data state (with localStorage persistence)
  const firstVisit = isFirstVisit();
  const saved = loadData();
  const [parts, setParts] = useState<Part[]>(firstVisit ? [...MITSUBISHI_PARTS, ...INVOICE_PARTS] : (saved?.parts ?? []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(firstVisit ? SEED_SUPPLIERS : (saved?.suppliers ?? []));
  const [customers, setCustomers] = useState<Customer[]>(firstVisit ? SEED_CUSTOMERS : (saved?.customers ?? []));
  const [invoices, setInvoices] = useState<Invoice[]>(firstVisit ? SEED_INVOICES : (saved?.invoices ?? []));
  const [purchases, setPurchases] = useState<Purchase[]>(firstVisit ? SEED_PURCHASES : (saved?.purchases ?? []));
  const [expenses, setExpenses] = useState<Expense[]>(firstVisit ? SEED_EXPENSES : (saved?.expenses ?? []));
  const [accounts, setAccounts] = useState<Account[]>(firstVisit ? SEED_ACCOUNTS : (saved?.accounts ?? []));
  const [priceHistory] = useState<PriceHistory[]>(SEED_PRICE_HISTORY);
  const [_journal] = useState<JournalEntry[]>(SEED_JOURNAL);
  const [settings, setSettings] = useState<AppSettings>(firstVisit ? DEFAULT_SETTINGS : (saved?.settings ?? DEFAULT_SETTINGS));

  // Mark as initialized on first mount (useEffect, NOT useState!)
  useEffect(() => {
    if (isFirstVisit()) {
      markInitialized();
      // Also save seed data immediately so loadData picks it up on refresh
      const seedData = { parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    }
  }, []);

  // ── Auth initialization ──
  useEffect(() => {
    // Step 1: Ensure default admin exists (auto-login if first visit)
    const isFirstAdmin = setupDefaultAdmin();
    if (isFirstAdmin) {
      // First visit — default admin auto-logged in
      const admin = getDefaultAdmin();
      setUser({ email: admin.email, full_name: admin.name });
      setUserRole("admin");
      setAuthLoading(false);
    } else {
      // Subsequent visit — check existing session
      initAuth().then(({ authenticated, profile }) => {
        if (authenticated && profile) {
          setUser(profile);
          setUserRole(profile.role);
        }
        setAuthLoading(false);
      });
    }

    // Listen to auth state changes
    const unsub = onAuthChange((event, profile) => {
      if (event === "SIGNED_IN" && profile) {
        setUser(profile);
        setUserRole(profile.role);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setUserRole(null);
      }
    });
    return unsub;
  }, []);

  // Reset confirmation state
  // resetConfirm: 0=none, 1=data-mgmt, 4=restore-demo
  const [resetConfirm, setResetConfirm] = useState<number>(0);

  // deleteConfirm: null=none, {type, id, name}=pending
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // Print invoice state
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // ═══ Auth State ═══
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [_authLoading, setAuthLoading] = useState(true);

  // ═══ Journal State ═══
  const [journal, setJournal] = useState<JournalEntry[]>(firstVisit ? SEED_JOURNAL : (saved?.journal ?? SEED_JOURNAL));

  // ═══ Firestore Real-time Sync ═══ (DISABLED per user — Firebase off)
  // TODO: Firebase disabled per user decision — re-enable by uncommenting the block below.
  // const { init: initFirestore, pushToCloud } = useFirestoreSync(
  //   { setParts, setSuppliers, setCustomers, setInvoices, setPurchases, setExpenses, setAccounts, setJournal, setSettings },
  //   { parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings },
  //   addToast
  // );
  const initFirestore = () => {};
  const pushToCloud = (_payload?: any) => {};

  // Initialize Firestore on mount (after auth)
  useEffect(() => {
    initFirestore();
  }, []);

  // Auto-push data changes to Firestore
  useEffect(() => {
    pushToCloud({ parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings });
  }, [parts.length, suppliers.length, customers.length, invoices.length, purchases.length, expenses.length, accounts.length, journal.length, settings.company_name]);

  // UI state
  const [page, setPage] = useState<Page>("dashboard");
  // sidebar removed — now uses bottom navigation
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);

  // ═══ Supabase Sync State ═══
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "disconnected" | "tables_missing">("checking");
  const [syncing, setSyncing] = useState(false);

  // ── Boot: fetch all data from FastAPI backend (which talks to Supabase) ──
  useEffect(() => {
    let cancelled = false;
    pingBackend().then((ok) => {
      if (cancelled) return;
      if (!ok) { setSupabaseStatus("disconnected"); return; }
      backendFetchAll().then((result) => {
        if (cancelled) return;
        setSupabaseStatus("connected");
        const local = loadData();
        const hasLocalData = local && (
          (local.parts && local.parts.length > 0) ||
          (local.suppliers && local.suppliers.length > 0) ||
          (local.invoices && local.invoices.length > 0)
        );
        // Prefer backend data on every boot — localStorage is offline cache only.
        // Only fall back to local if the backend returns empty AND we have something cached.
        const anyBackendData =
          (result.parts && result.parts.length > 0) ||
          (result.invoices && result.invoices.length > 0) ||
          (result.customers && result.customers.length > 0) ||
          (result.suppliers && result.suppliers.length > 0);
        if (anyBackendData) {
          if (result.parts) setParts((result.parts as any[]).map(partFromBackend) as any);
          if (result.suppliers) setSuppliers((result.suppliers as any[]).map(supplierFromBackend) as any);
          if (result.customers) setCustomers((result.customers as any[]).map(customerFromBackend) as any);
          if (result.invoices) setInvoices((result.invoices as any[]).map(invoiceFromBackend) as any);
          if (result.purchases) setPurchases((result.purchases as any[]).map(purchaseFromBackend) as any);
          if (result.expenses) setExpenses((result.expenses as any[]).map(expenseFromBackend) as any);
          if (result.accounts) setAccounts((result.accounts as any[]).map(accountFromBackend) as any);
          if (result.settings && Array.isArray(result.settings) && result.settings.length > 0) {
            setSettings(settingsFromBackend(result.settings[0]) as any);
          }
        } else if (!hasLocalData) {
          // backend empty + cache empty → leave the seed defaults already in state
        }
      }).catch((err) => {
        console.warn("[boot] backend fetch failed:", err);
        if (!cancelled) setSupabaseStatus("disconnected");
      });
    });
    return () => { cancelled = true; };
  }, []);

  // ── Auto-sync to backend (debounced 3s after last change) ──
  useEffect(() => {
    if (supabaseStatus !== "connected" || syncing) return;
    const timeout = setTimeout(() => {
      const payload = {
        parts: (parts as any[]).map(partToBackend),
        suppliers: (suppliers as any[]).map(supplierToBackend),
        customers: (customers as any[]).map(customerToBackend),
        invoices: (invoices as any[]).map(invoiceToBackend),
        purchases: (purchases as any[]).map(purchaseToBackend),
        expenses: (expenses as any[]).map(expenseToBackend),
        accounts: (accounts as any[]).map(accountToBackend),
        liquids: [],
        vehicles: [],
        liquid_txns: [],
      };
      backendSyncAll(payload).catch((err) => {
        console.warn("[autosync] backend sync failed:", err);
      });
    }, 3000);
    return () => clearTimeout(timeout);
  }, [parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings, supabaseStatus, syncing]);

  // Persist all data to localStorage
  useEffect(() => {
    const data = { parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings]);


  // ═══════════════════════════════════════════════════════════════
  // DERIVED STATS — computed from SAME source for consistency
  // ═══════════════════════════════════════════════════════════════

  const allCategories = useMemo(() => ["الكل", ...Array.from(new Set(parts.map((p) => p.category)))], [parts]);
  const allBrands = useMemo(() => ["الكل", ...Array.from(new Set(parts.map((p) => p.brand)))], [parts]);

  // Unified stats — all derived from invoices, purchases, expenses, parts
  const stats = useMemo(() => {
    const totalParts = parts.length;
    const totalStock = parts.reduce((s, p) => s + p.stock, 0);
    const stockValue = parts.reduce((s, p) => s + p.stock * p.cost, 0);
    const stockRetailValue = parts.reduce((s, p) => s + p.stock * p.price, 0);
    const expectedProfit = stockRetailValue - stockValue;
    const lowStock = parts.filter((p) => p.stock <= p.min_stock).length;
    const outOfStock = parts.filter((p) => p.stock === 0).length;

    const totalSales = invoices.reduce((s, i) => s + i.total, 0);
    const totalSubtotal = invoices.reduce((s, i) => s + i.subtotal, 0);
    const totalVat = invoices.reduce((s, i) => s + i.vat, 0);
    const totalPurchasesVal = purchases.reduce((s, p) => s + p.total, 0);
    const totalExpensesVal = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalSubtotal - totalPurchasesVal - totalExpensesVal;

    const totalQtySold = invoices.reduce((s, inv) => s + inv.items.reduce((is, item) => is + item.qty, 0), 0);

    return {
      totalParts, totalStock, stockValue, stockRetailValue, expectedProfit,
      lowStock, outOfStock, totalSales, totalSubtotal, totalVat,
      totalPurchases: totalPurchasesVal, totalExpenses: totalExpensesVal,
      netProfit, totalQtySold
    };
  }, [parts, invoices, purchases, expenses]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleSavePart = (p: Part) => {
    const result = validatePart(p);
    if (!result.success) {
      addToast(result.errors[0], "error");
      return;
    }
    setParts((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = p; return copy; }
      return [...prev, p];
    });
    addToast(p.id && parts.find((x) => x.id === p.id) ? "تم تحديث القطعة" : "تم إضافة القطعة", "success");
    setModal(null);
  };

  const handleDeletePart = (id: string) => {
    const p = parts.find((x) => x.id === id);
    setDeleteConfirm({ type: "part", id, name: p?.name_ar || id });
  };

  const handleSaveSupplier = (s: Supplier) => {
    const result = validateSupplier(s);
    if (!result.success) {
      addToast(result.errors[0], "error");
      return;
    }
    setSuppliers((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = s; return copy; }
      return [...prev, s];
    });
    addToast(s.id && suppliers.find((x) => x.id === s.id) ? "تم تحديث المورد" : "تم إضافة المورد", "success");
    setModal(null);
  };

  const handleDeleteSupplier = (id: string) => {
    const s = suppliers.find((x) => x.id === id);
    setDeleteConfirm({ type: "supplier", id, name: s?.name || id });
  };

  const handleSaveCustomer = (c: Customer) => {
    const result = validateCustomer(c);
    if (!result.success) {
      addToast(result.errors[0], "error");
      return;
    }
    setCustomers((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = c; return copy; }
      return [...prev, c];
    });
    addToast(c.id && customers.find((x) => x.id === c.id) ? "تم تحديث العميل" : "تم إضافة العميل", "success");
    setModal(null);
  };

  const handleDeleteCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setDeleteConfirm({ type: "customer", id, name: c?.name || id });
  };

  const handleSaveExpense = (e: Expense) => {
    const result = validateExpense(e);
    if (!result.success) {
      addToast(result.errors[0], "error");
      return;
    }
    setExpenses((prev) => {
      const idx = prev.findIndex((x) => x.id === e.id);
      const updated = idx >= 0 ? prev.map((x, i) => i === idx ? e : x) : [...prev, e];
      return updated;
    });
    // Create journal entry for expense
    const expenseJournal = createExpenseJournal(e);
    if (expenseJournal.length > 0) {
      setJournal((prev) => [...prev, ...expenseJournal]);
      // Update account balances
      setAccounts((prev) => applyJournalToAccounts(expenseJournal, prev));
    }
    addToast(e.id && expenses.find((x) => x.id === e.id) ? "تم تحديث المصروف" : "تم إضافة المصروف", "success");
    setModal(null);
    if (isSupabaseConfigured() && supabaseStatus === "connected") {
      syncExpense(e).catch(() => {});
    }
  };

  const handleDeleteExpense = (id: string) => {
    const e = expenses.find((x) => x.id === id);
    setDeleteConfirm({ type: "expense", id, name: e?.description || id });
  };
  const handleDeletePurchase = (id: string) => {
    const pur = purchases.find((x) => x.id === id);
    setDeleteConfirm({ type: "purchase", id, name: pur?.id || id });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (!canDelete()) {
      addToast("ليس لديك صلاحية الحذف", "error");
      setDeleteConfirm(null);
      return;
    }
    const { type, id } = deleteConfirm;

    // Helper: reverse journal entries for a deleted transaction
    const reverseJournal = (refId: string) => {
      const entriesToReverse = journal.filter((j) => j.ref === refId);
      if (entriesToReverse.length > 0) {
        // Reverse entries: swap debit and credit to undo the transaction
        const reversedEntries = entriesToReverse.map((entry) => ({
          id: generateJournalId(),
          date: today(),
          ref: `${refId}-DEL`,
          desc: `عكس: ${entry.desc}`,
          debit_account: entry.credit_account,  // Swap
          credit_account: entry.debit_account,   // Swap
          amount: entry.amount,
        }));
        setJournal((prev) => [...prev, ...reversedEntries]);
        setAccounts((prev) => applyJournalToAccounts(reversedEntries, prev));
        // Also mark original entries as voided by removing them
        setJournal((prev) => prev.filter((j) => j.ref !== refId));
      }
    };

    switch (type) {
      case "part": setParts((prev) => prev.filter((p) => p.id !== id)); apiDelete(`/api/parts/${encodeURIComponent(id)}`).catch(() => {}); addToast("تم حذف القطعة", "success"); break;
      case "supplier": setSuppliers((prev) => prev.filter((s) => s.id !== id)); apiDelete(`/api/suppliers/${encodeURIComponent(id)}`).catch(() => {}); addToast("تم حذف المورد", "success"); break;
      case "customer": setCustomers((prev) => prev.filter((c) => c.id !== id)); apiDelete(`/api/customers/${encodeURIComponent(id)}`).catch(() => {}); addToast("تم حذف العميل", "success"); break;
      case "expense": {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        apiDelete(`/api/expenses/${encodeURIComponent(id)}`).catch(() => {});
        reverseJournal(id);
        addToast("تم حذف المصروف وعكس القيد المحاسبي", "success");
        break;
      }
      case "invoice": {
        const inv = invoices.find((x) => x.id === id);
        if (inv) {
          // Return sold parts back to stock
          setParts((prev) => prev.map((p) => {
            const item = inv.items.find((i) => i.part_id === p.id);
            return item ? { ...p, stock: p.stock + item.qty } : p;
          }));
          setInvoices((prev) => prev.filter((i) => i.id !== id));
          apiDelete(`/api/invoices/${encodeURIComponent(id)}`).catch(() => {});
          reverseJournal(id);
          addToast("تم حذف الفاتورة وإرجاع القطع للمخزون وعكس القيد المحاسبي", "success");
        }
        break;
      }
      case "purchase": {
        const pur = purchases.find((x) => x.id === id);
        if (pur) {
          // Remove purchased parts from stock
          setParts((prev) => prev.map((p) => {
            const item = pur.items.find((i) => i.part_id === p.id);
            return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
          }));
          setPurchases((prev) => prev.filter((p) => p.id !== id));
          apiDelete(`/api/purchases/${encodeURIComponent(id)}`).catch(() => {});
          reverseJournal(id);
          addToast("تم حذف فاتورة الشراء وخصم القطع من المخزون وعكس القيد المحاسبي", "success");
        }
        break;
      }
    }
    setDeleteConfirm(null);
  };

  const handleImportParts = (imported: any[]) => {
    setParts((prev) => [...prev, ...imported]);
    addToast(`تم استيراد ${imported.length} قطعة`, "success");
  };

  const handleClearAllData = () => {
    // حذف جميع البيانات فعلياً - تصفير كل شيء
    const emptyParts: Part[] = [];
    const emptySuppliers: Supplier[] = [];
    const emptyCustomers: Customer[] = [];
    const emptyInvoices: Invoice[] = [];
    const emptyPurchases: Purchase[] = [];
    const emptyExpenses: Expense[] = [];
    const emptyJournal: JournalEntry[] = [];

    setParts(emptyParts);
    setSuppliers(emptySuppliers);
    setCustomers(emptyCustomers);
    setInvoices(emptyInvoices);
    setPurchases(emptyPurchases);
    setExpenses(emptyExpenses);
    setJournal(emptyJournal);

    // Write immediately to localStorage
    const data = {
      parts: emptyParts,
      suppliers: emptySuppliers,
      customers: emptyCustomers,
      invoices: emptyInvoices,
      purchases: emptyPurchases,
      expenses: emptyExpenses,
      journal: emptyJournal,
      accounts, // Keep accounts structure
      settings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Best-effort backend sync of the cleared state
    backendSyncAll(data as any).catch(() => {});
    setResetConfirm(0);
    addToast("تم حذف جميع البيانات بنجاح - التطبيق فارغ الآن", "success");
  };

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  const navItems: { key: Page; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { key: "inventory", label: "المخزون", icon: Package2, badge: stats.lowStock },
    { key: "pos", label: "نقطة البيع", icon: ShoppingCart },
    { key: "customers", label: "العملاء", icon: Users },
    { key: "transactions", label: "المشتريات والمصروفات", icon: ClipboardList },
    { key: "accounts", label: "الحسابات", icon: BookOpen },
    { key: "settings", label: "الإعدادات", icon: Cog },
  ];

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: LowStockDisplay (responsive table/cards)
  // ═══════════════════════════════════════════════════════════════

  /** LowStockDisplay — responsive: table on desktop, cards on mobile */
  function LowStockDisplay({ parts: displayParts }: { parts: Part[] }) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const lowStockParts = displayParts.filter((p) => p.stock <= p.min_stock).slice(0, 8);

    if (lowStockParts.length === 0) {
      return <div className="text-center py-6 text-sm text-slate-500">لا توجد تنبيهات مخزون حالياً</div>;
    }

    if (isDesktop) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الرقم</th>
                <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الاسم</th>
                <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الماركة</th>
                <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">المخزون</th>
                <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الحد الأدنى</th>
                <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {lowStockParts.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">{p.id}</td>
                  <td className="px-3 py-2 font-medium text-slate-200">{p.name_ar}</td>
                  <td className="px-3 py-2 text-slate-400">{p.brand}</td>
                  <td className="px-3 py-2 text-slate-300">{fmtInt(p.stock)}</td>
                  <td className="px-3 py-2 text-slate-400">{fmtInt(p.min_stock)}</td>
                  <td className="px-3 py-2"><StatusPill status={stockStatus(p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Mobile cards
    return (
      <div className="space-y-3">
        {lowStockParts.map((p) => (
          <div key={p.id} className="glass-liquid rounded-xl p-3">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
              <StatusPill status={stockStatus(p)} />
            </div>
            <p className="font-bold text-slate-100 text-sm">{p.name_ar}</p>
            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>{p.brand}</span>
              <span>المخزون: {fmtInt(p.stock)} / الحد: {fmtInt(p.min_stock)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: RevenueExpenseDisplay (text-based)
  // ═══════════════════════════════════════════════════════════════

  /** RevenueExpenseDisplay — Comparison cards + progress bar + anomaly table */
  function RevenueExpenseDisplay({ data }: { data: { date: string; إيراد: number; مصروف: number }[] }) {
    if (data.length === 0) return <div className="text-center py-8 text-sm text-slate-500">لا توجد بيانات</div>;

    const totalRev = data.reduce((s, d) => s + d.إيراد, 0);
    const totalExp = data.reduce((s, d) => s + d.مصروف, 0);
    const ratio = totalRev > 0 ? (totalExp / totalRev) * 100 : 0;
    const anomalyDays = data.filter(d => d.مصروف > d.إيراد);

    return (
      <div className="space-y-4">
        {/* Big number cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-liquid rounded-xl p-3 text-center">
            <p className="text-[10px] text-emerald-400 font-medium">إجمالي الإيرادات</p>
            <p className="text-lg sm:text-xl font-black text-emerald-300 mt-1">{fmt(totalRev)}</p>
          </div>
          <div className="glass-liquid rounded-xl p-3 text-center">
            <p className="text-[10px] text-rose-400 font-medium">إجمالي المصروفات</p>
            <p className="text-lg sm:text-xl font-black text-rose-300 mt-1">{fmt(totalExp)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>نسبة المصروف/الإيراد</span>
            <span>{ratio.toFixed(0)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800/50 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500/60 rounded-r-full transition-all" style={{ width: `${Math.min(100, Math.max(0, 100 - ratio))}%` }} />
            <div className="h-full bg-rose-500/60 rounded-l-full transition-all" style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-500">
            <span className="text-emerald-400">{fmt(totalRev - totalExp)} صافي</span>
            <span>{data.length} يوم</span>
          </div>
        </div>

        {/* Anomaly table — days where expenses > revenue */}
        {anomalyDays.length > 0 && (
          <div>
            <p className="text-[10px] text-rose-400 font-bold mb-1.5">{"⚠ أيام الخلل (مصروفات > إيرادات):"}</p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {anomalyDays.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1.5 bg-rose-500/5 rounded-lg border border-rose-500/10">
                  <span className="text-slate-400">{d.date}</span>
                  <span className="text-emerald-400">{fmt(d.إيراد)}</span>
                  <span className="text-rose-400">{fmt(d.مصروف)}</span>
                  <span className="text-rose-300 font-bold">-{fmt(d.مصروف - d.إيراد)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: CategoryProgressList (text-based)
  // ═══════════════════════════════════════════════════════════════

  /** CategoryProgressList — Sorted list with mini progress bars */
  function CategoryProgressList({ data }: { data: { name: string; value: number }[] }) {
    if (data.length === 0 || data.every(d => d.value === 0)) return <div className="text-center py-8 text-sm text-slate-500">لا توجد بيانات</div>;

    const total = data.reduce((s, d) => s + d.value, 0);
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

    return (
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {sorted.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">{d.name}</span>
                <span className="text-slate-400">{fmt(d.value)} <span className="text-slate-500">({pct.toFixed(0)}%)</span></span>
              </div>
              <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
              </div>
            </div>
          );
        })}
        <div className="pt-1 border-t border-white/5 text-center">
          <span className="text-[10px] text-slate-500">الإجمالي: </span>
          <span className="text-[11px] text-slate-300 font-bold">{fmt(total)}</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: DailySalesCards (text-based with arrows)
  // ═══════════════════════════════════════════════════════════════

  /** DailySalesCards — Day cards with ⬆️⬇️ arrows + smart summary */
  function DailySalesCards({ data }: { data: { date: string; total: number }[] }) {
    if (data.length === 0) return <div className="text-center py-8 text-sm text-slate-500">لا توجد بيانات</div>;

    const maxDay = data.reduce((m, d) => d.total > m.total ? d : m, data[0]);
    const minDay = data.reduce((m, d) => d.total < m.total ? d : m, data[0]);
    const total = data.reduce((s, d) => s + d.total, 0);
    const avg = total / data.length;

    return (
      <div className="space-y-4">
        {/* Smart summary */}
        <div className="glass-liquid rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">
            أفضل يوم <strong className="text-emerald-400">{maxDay.date.slice(5)}</strong> بمبلغ <strong className="text-emerald-400">{fmt(maxDay.total)}</strong>
            <span className="mx-1.5 text-slate-600">|</span>
            أقل يوم <strong className="text-rose-400">{minDay.date.slice(5)}</strong> بمبلغ <strong className="text-rose-400">{fmt(minDay.total)}</strong>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">المتوسط: {fmt(avg)} · الإجمالي: {fmt(total)}</p>
        </div>

        {/* Day cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {data.map((d, i) => {
            const prev = i > 0 ? data[i - 1].total : d.total;
            const change = prev > 0 ? ((d.total - prev) / prev) * 100 : 0;
            const isUp = d.total >= prev;
            const isBest = d.date === maxDay.date;
            const isWorst = d.date === minDay.date;

            return (
              <div key={i} className={`glass-liquid rounded-xl p-2.5 text-center transition-all hover:scale-[1.02] ${isBest ? "border-emerald-500/30" : isWorst ? "border-rose-500/30" : ""}`}>
                <p className="text-[10px] text-slate-500">{d.date.slice(5)}</p>
                <p className="text-sm font-black text-slate-100 mt-0.5">{fmt(d.total)}</p>
                {i > 0 && (
                  <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {isUp ? "↑" : "↓"}
                    <span>{Math.abs(change).toFixed(0)}%</span>
                  </div>
                )}
                {i === 0 && <span className="text-[9px] text-slate-600 mt-1 block">—</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: DashboardView
  // ═══════════════════════════════════════════════════════════════

  function DashboardView() {
    // Prepare chart data (last 7 days) from invoices + purchases + expenses
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const revenueExpenseData = days.map((day) => ({
      date: day,
      إيراد: invoices.filter((inv) => inv.date === day).reduce((s, inv) => s + inv.subtotal, 0),
      مصروف: expenses.filter((e) => e.date === day).reduce((s, e) => s + e.amount, 0),
    }));
    const salesData = days.map((day) => ({
      date: day,
      total: invoices.filter((inv) => inv.date === day).reduce((s, inv) => s + inv.total, 0),
    }));
    const categoryData = allCategories
      .filter((c) => c !== "الكل")
      .map((cat) => ({ name: cat, value: parts.filter((p) => p.category === cat).reduce((s, p) => s + p.stock * p.price, 0) }));

    return (
      <div className="space-y-5" dir="rtl">
        {/* ── Title Row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><LayoutDashboard className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h2 className="text-xl font-black text-slate-100">لوحة التحكم</h2>
              <p className="text-xs text-slate-400">نظرة شاملة على أداء المتجر</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupabaseStatusBadge />
            <div className="text-[10px] text-slate-500 font-mono">v3.1</div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI title="الإيرادات اليومية" value={fmt(invoices.filter(i => i.date === today()).reduce((s, i) => s + i.total, 0))} icon={DollarSign} color="emerald" />
          <KPI title="إجمالي المخزون" value={fmtInt(stats.totalStock)} subtitle={`${stats.totalParts} قطعة`} icon={Package2} color="sky" trend={stats.expectedProfit > 0 ? `أرباح متوقعة ${fmt(stats.expectedProfit)}` : undefined} trendUp={stats.expectedProfit > 0} />
          <KPI title="إجمالي الإيرادات" value={fmt(stats.totalSales)} subtitle={`شامل الضريبة`} icon={Receipt} color="amber" />
          <KPI title="الأرباح الصافية" value={fmt(stats.netProfit)} subtitle={`بعد الخصم والمصروفات`} icon={TrendingUp} color="emerald" trend={stats.netProfit >= 0 ? "ربح" : "خسارة"} trendUp={stats.netProfit >= 0} />
        </div>

        {/* ── Alerts ── */}
        {(stats.lowStock > 0 || stats.outOfStock > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.lowStock > 0 && (
              <div className="glass-liquid rounded-xl p-3 border border-amber-500/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-300"><strong className="font-bold">{stats.lowStock}</strong> قطعة منخفضة المخزون</span>
                <button onClick={() => setPage("inventory")} className="text-xs text-amber-400 hover:text-amber-300 underline mr-auto">عرض</button>
              </div>
            )}
            {stats.outOfStock > 0 && (
              <div className="glass-liquid rounded-xl p-3 border border-rose-500/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-xs text-rose-300"><strong className="font-bold">{stats.outOfStock}</strong> قطعة نفاذت من المخزون</span>
                <button onClick={() => setPage("inventory")} className="text-xs text-rose-400 hover:text-rose-300 underline mr-auto">عرض</button>
              </div>
            )}
          </div>
        )}

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard title="مقارنة الإيرادات والمصروفات" icon={BarChart3}>
            <RevenueExpenseDisplay data={revenueExpenseData} />
          </GlassCard>
          <GlassCard title="الفئات حسب القيمة" icon={PieChart}>
            <CategoryProgressList data={categoryData} />
          </GlassCard>
        </div>

        <GlassCard title="المبيعات اليومية (آخر 7 أيام)" icon={BarChart4}>
          <DailySalesCards data={salesData} />
        </GlassCard>

        {/* ── Low Stock Alert Table ── */}
        <GlassCard title="تنبيهات المخزون" icon={AlertTriangle} action={<span className="text-[10px] text-slate-500">{stats.lowStock} قطعة منخفضة</span>}>
          <LowStockDisplay parts={parts} />
        </GlassCard>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: InventoryView
  // ═══════════════════════════════════════════════════════════════

  function InventoryView() {
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("الكل");
    const [brandFilter, setBrandFilter] = useState("الكل");
    const [tab, setTab] = useState<"parts" | "suppliers" | "import">("parts");

    const filteredParts = useMemo(() => {
      return parts.filter((p) => {
        const matchSearch = !search || p.name_ar.toLowerCase().includes(search.toLowerCase()) || p.oem.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
        const matchCat = catFilter === "الكل" || p.category === catFilter;
        const matchBrand = brandFilter === "الكل" || p.brand === brandFilter;
        return matchSearch && matchCat && matchBrand;
      });
    }, [parts, search, catFilter, brandFilter]);

    // Summary stats
    const stats = useMemo(() => {
      const totalItems = parts.length;
      const inventoryValue = parts.reduce((sum, p) => sum + p.price * p.stock, 0);
      const lowStockCount = parts.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;
      const outOfStockCount = parts.filter((p) => p.stock === 0).length;
      return { totalItems, inventoryValue, lowStockCount, outOfStockCount };
    }, [parts]);

    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2"><Package2 className="w-6 h-6 text-amber-400" /> المخزون</h2>
          <div className="flex gap-2">
            <Btn size="sm" onClick={() => setModal({ type: "part" })} icon={Plus}>إضافة قطعة</Btn>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-liquid rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0"><Package2 className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-slate-400">إجمالي القطع</p>
              <p className="text-lg font-black text-slate-100">{fmtInt(stats.totalItems)}</p>
            </div>
          </div>
          <div className="glass-liquid rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">قيمة المخزون</p>
              <p className="text-lg font-black text-emerald-400">{fmt(stats.inventoryValue)}</p>
            </div>
          </div>
          <div className="glass-liquid rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-slate-400">منخفض المخزون</p>
              <p className="text-lg font-black text-amber-400">{fmtInt(stats.lowStockCount)}</p>
            </div>
          </div>
          <div className="glass-liquid rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center flex-shrink-0"><AlertOctagon className="w-5 h-5 text-rose-400" /></div>
            <div>
              <p className="text-xs text-slate-400">نفاذ المخزون</p>
              <p className="text-lg font-black text-rose-400">{fmtInt(stats.outOfStockCount)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { key: "parts" as const, label: "القطع", icon: Package2 },
            { key: "suppliers" as const, label: "الموردين", icon: Truck },
            { key: "import" as const, label: "استيراد", icon: Upload },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${tab === t.key ? "bg-amber-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "parts" && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الرقم..." className="w-full pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500" />
              </div>
              <Select value={catFilter} onChange={setCatFilter} options={allCategories.map((c) => ({ value: c, label: c }))} />
              <Select value={brandFilter} onChange={setBrandFilter} options={allBrands.map((b) => ({ value: b, label: b }))} />
            </div>
            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الرقم</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الاسم</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الماركة / الفئة</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الكمية</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">السعر</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الحالة</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400 whitespace-nowrap">{p.id}</td>
                      <td className="px-3 py-2 font-medium text-slate-200">{p.name_ar}</td>
                      <td className="px-3 py-2">
                        <span className="block text-slate-300 text-xs">{p.brand}</span>
                        <span className="block text-slate-500 text-[11px]">{p.category}</span>
                      </td>
                      <td className={`px-3 py-2 font-bold whitespace-nowrap ${p.stock === 0 ? "text-rose-400" : p.stock <= p.min_stock ? "text-amber-400" : "text-emerald-400"}`}>
                        {fmtInt(p.stock)}
                      </td>
                      <td className="px-3 py-2 text-emerald-400 font-bold whitespace-nowrap">{fmt(p.price)}</td>
                      <td className="px-3 py-2"><StatusPill status={stockStatus(p)} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => setModal({ type: "part", data: p })} className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5 text-amber-400" /></button>
                          <button onClick={() => handleDeletePart(p.id)} className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredParts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500 text-sm">لا توجد قطع</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "suppliers" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Btn size="sm" onClick={() => setModal({ type: "supplier" })} icon={Plus}>إضافة مورد</Btn>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} className="glass-liquid rounded-2xl p-5 transition-all hover:shadow-2xl liquid-glow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-100">{s.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{s.contact || "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ type: "supplier", data: s })} className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5 text-amber-400" /></button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {s.phone || "—"}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {s.city || "—"}</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">الرصيد</span>
                    <span className={`text-xs font-bold ${(s.balance || 0) >= 0 ? "text-slate-300" : "text-rose-400"}`}>{fmt(s.balance || 0)}</span>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 text-sm">لا يوجد موردين</div>}
            </div>
          </div>
        )}

        {tab === "import" && (
          <FileImportPanel
            onImport={handleImportParts}
            onClose={() => setTab("parts")}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: POSView
  // ═══════════════════════════════════════════════════════════════

  function POSView() {
    const [posTab, setPosTab] = useState<"sell" | "buy" | "adjust">("sell");
    const [cart, setCart] = useState<{ part: Part; qty: number }[]>([]);
    const [buyCart, setBuyCart] = useState<{ part: Part; qty: number; buyPrice: number }[]>([]);
    const [adjustInputs, setAdjustInputs] = useState<Record<string, number>>({});
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("الكل");
    const [selCustomer, setSelCustomer] = useState<string>("walk-in");
    const [selSupplier, setSelSupplier] = useState<string>("");
    const [discount, setDiscount] = useState(0);
    const [selCat, setSelCat] = useState<string>("الكل");
    const [sellPaymentMethod, setSellPaymentMethod] = useState("نقدي");
    const [cartOpen, setCartOpen] = useState(false);

    const productCategories = useMemo(() => {
      return ["الكل", ...Array.from(new Set(parts.map((p) => p.category)))];
    }, [parts]);

    const filteredProducts = useMemo(() => {
      return parts.filter((p) => {
        const matchSearch = !search || p.name_ar.toLowerCase().includes(search.toLowerCase()) || p.oem.toLowerCase().includes(search.toLowerCase());
        const matchCat = (posTab === "sell" ? catFilter : selCat) === "الكل" || p.category === (posTab === "sell" ? catFilter : selCat);
        return matchSearch && matchCat;
      });
    }, [parts, search, catFilter, selCat, posTab]);

    const cartTotal = cart.reduce((s, c) => s + c.part.price * c.qty, 0);
    const cartAfterDiscount = Math.max(0, cartTotal - discount);
    const vatAmt = settings.vat_enabled ? cartAfterDiscount * settings.vat_rate : 0;
    const finalTotal = cartAfterDiscount + vatAmt;

    const buyCartTotal = buyCart.reduce((s, c) => s + c.buyPrice * c.qty, 0);

    const addToCart = (p: Part) => {
      setCart((prev) => { const existing = prev.find((c) => c.part.id === p.id); if (existing) return prev.map((c) => c.part.id === p.id ? { ...c, qty: c.qty + 1 } : c); return [...prev, { part: p, qty: 1 }]; });
    };
    const addToBuyCart = (p: Part) => {
      setBuyCart((prev) => { const existing = prev.find((c) => c.part.id === p.id); if (existing) return prev.map((c) => c.part.id === p.id ? { ...c, qty: c.qty + 1 } : c); return [...prev, { part: p, qty: 1, buyPrice: p.cost || p.price * 0.6 }]; });
    };

    const checkout = () => {
      if (cart.length === 0) return;
      const newInvoice: any = {
        id: newId("INV"), date: today(),
        customer: selCustomer === "walk-in" ? "عميل نقدي" : customers.find((c) => c.id === selCustomer)?.name || "عميل نقدي",
        phone: "",
        items: cart.map((c) => ({ part_id: c.part.id, name: c.part.name_ar, qty: c.qty, price: c.part.price, cost: c.part.cost })),
        subtotal: cartAfterDiscount, vat: vatAmt, total: finalTotal,
        payment: sellPaymentMethod, status: "مكتمل",
        type: "sell",
      };
      // Validate invoice
      const validation = validateInvoice(newInvoice);
      if (!validation.success) {
        addToast(validation.errors[0], "error");
        return;
      }
      setInvoices((prev) => [newInvoice, ...prev]);
      setParts((prev) => prev.map((p) => { const c = cart.find((x) => x.part.id === p.id); return c ? { ...p, stock: Math.max(0, p.stock - c.qty) } : p; }));
      if (selCustomer !== "walk-in") {
        setCustomers((prev) => prev.map((c) => c.id === selCustomer ? { ...c, total_bought: (c.total_bought || 0) + finalTotal, last_visit: today() } : c));
      }
      // Create journal entries for sale
      const saleJournals = createSaleJournal(newInvoice);
      if (saleJournals.length > 0) {
        const batchValid = validateBatch(saleJournals);
        if (batchValid.valid) {
          setJournal((prev) => [...prev, ...saleJournals]);
          setAccounts((prev) => applyJournalToAccounts(saleJournals, prev));
        } else {
          addToast("تحذير: خطأ في توازن القيد المحاسبي", "warning");
        }
      }
      addToast(`تم إنشاء فاتورة #${newInvoice.id} بمبلغ ${fmt(finalTotal)}`, "success");
      setPrintInvoice(newInvoice);
      if (isSupabaseConfigured()) syncInvoice(newInvoice).catch(() => {});
      setCart([]); setDiscount(0); setSellPaymentMethod("نقدي"); setSelCustomer("walk-in");
    };

    const checkoutBuy = () => {
      if (buyCart.length === 0) return;
      const newPurchase: Purchase = {
        id: newId("PUR"), date: today(),
        supplier: selSupplier || "مورد عام", supplier_name: selSupplier || "مورد عام",
        items: buyCart.map((c) => ({ part_id: c.part.id, name: c.part.name_ar, qty: c.qty, cost: c.buyPrice })),
        subtotal: buyCartTotal, vat: settings.vat_enabled ? buyCartTotal * settings.vat_rate : 0, total: settings.vat_enabled ? buyCartTotal * (1 + settings.vat_rate) : buyCartTotal,
        status: "مكتمل",
      };
      setPurchases((prev) => [newPurchase, ...prev]);
      setParts((prev) => prev.map((p) => { const c = buyCart.find((x) => x.part.id === p.id); return c ? { ...p, stock: p.stock + c.qty, cost: c.buyPrice } : p; }));
      // Create journal entries for purchase
      const purchaseJournals = createPurchaseJournal(newPurchase);
      if (purchaseJournals.length > 0) {
        const batchValid = validateBatch(purchaseJournals);
        if (batchValid.valid) {
          setJournal((prev) => [...prev, ...purchaseJournals]);
          setAccounts((prev) => applyJournalToAccounts(purchaseJournals, prev));
        } else {
          addToast("تحذير: خطأ في توازن قيد الشراء", "warning");
        }
      }
      addToast(`تم تسجيل مشتريات #${newPurchase.id} بمبلغ ${fmt(newPurchase.total)}`, "success");
      setBuyCart([]);
    };

    const handleAdjustStock = (partId: string, newStock: number) => {
      setParts((prev) => prev.map((p) => p.id === partId ? { ...p, stock: Math.max(0, newStock) } : p));
    };

    return (
      <div className="space-y-4" dir="rtl">
        {/* POS Tabs — clean single row */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { key: "sell" as const, label: "بيع", icon: ShoppingCart },
            { key: "buy" as const, label: "شراء", icon: Truck },
            { key: "adjust" as const, label: "تسوية مخزون", icon: SlidersHorizontal },
          ].map((t) => (
            <button key={t.key} onClick={() => setPosTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${posTab === t.key ? "bg-amber-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {posTab === "sell" && (
          <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="w-full pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500" />
                </div>
                <Select value={catFilter} onChange={setCatFilter} options={productCategories.map((c) => ({ value: c, label: c }))} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="glass-liquid rounded-xl p-3 text-right transition-all hover:shadow-2xl hover:scale-[1.02] hover:border-amber-500/30 active:scale-95 relative">
                    {p.stock <= 0 && <span className="absolute top-1 left-1 text-[8px] bg-rose-500 text-white px-1 rounded font-bold">نفذ</span>}
                    <p className="text-xs font-mono text-slate-500">{p.id}</p>
                    <p className="text-sm font-bold text-slate-100 mt-1 line-clamp-1">{p.name_ar}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-black text-emerald-400">{fmt(p.price)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.stock <= p.min_stock ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400"}`}>{p.stock}</span>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && <div className="col-span-full text-center py-8 text-slate-500 text-sm">لا توجد قطع</div>}
              </div>
            </div>
            <div className="hidden lg:block space-y-4">
              <GlassCard title={`السلة (${cart.reduce((s, c) => s + c.qty, 0)})`} icon={ShoppingCart}>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 glass-liquid rounded-lg">
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-200 truncate">{c.part.name_ar}</p><p className="text-[10px] text-slate-400">{fmt(c.part.price)} × {c.qty}</p></div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCart((prev) => prev.map((x, xi) => xi === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="w-6 h-6 rounded bg-slate-700/50 text-slate-300 flex items-center justify-center text-xs">-</button>
                        <span className="text-xs font-bold text-slate-200 w-5 text-center">{c.qty}</span>
                        <button onClick={() => setCart((prev) => prev.map((x, xi) => xi === i ? { ...x, qty: x.qty + 1 } : x))} className="w-6 h-6 rounded bg-slate-700/50 text-slate-300 flex items-center justify-center text-xs">+</button>
                        <button onClick={() => setCart((prev) => prev.filter((_, xi) => xi !== i))} className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center mr-1"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && <div className="text-center py-4 text-slate-500 text-xs">السلة فارغة</div>}
                </div>
                <div className="space-y-2 mt-3 pt-3 border-t border-white/10">
                  <Select label="العميل" value={selCustomer} onChange={setSelCustomer} options={[{ value: "walk-in", label: "عميل نقدي" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
                  <Input label="الخصم" value={discount} onChange={(v) => setDiscount(Number(v))} type="number" min={0} />
                  <div className="flex justify-between text-xs text-slate-400"><span>المجموع:</span><span>{fmt(cartTotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-xs text-rose-400"><span>الخصم:</span><span>-{fmt(discount)}</span></div>}
                  <div className="flex justify-between text-xs text-blue-400"><span>الضريبة ({(settings.vat_rate * 100).toFixed(0)}%):</span><span>{fmt(vatAmt)}</span></div>
                  <div className="flex justify-between text-sm font-black text-slate-100"><span>الإجمالي:</span><span>{fmt(finalTotal)}</span></div>
                  <div className="flex gap-1 flex-wrap">
                    {(["نقدي", "مدى", "فيزا", "تحويل"] as const).map((m) => (
                      <button key={m} onClick={() => setSellPaymentMethod(m)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ${sellPaymentMethod === m ? "bg-sky-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <Btn onClick={checkout} disabled={cart.length === 0} className="w-full" icon={Receipt}>إصدار الفاتورة</Btn>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Mobile Floating Cart Button */}
          {cart.length > 0 && (
            <button onClick={() => setCartOpen(true)}
              className="fixed bottom-4 left-4 z-50 w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center lg:hidden animate-bounce">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">{cart.reduce((s, c) => s + c.qty, 0)}</span>
            </button>
          )}

          {/* Mobile Cart Bottom Drawer */}
          {cartOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setCartOpen(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900/98 rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-amber-400" />
                    السلة ({cart.reduce((s, c) => s + c.qty, 0)})
                  </h3>
                  <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 glass-liquid rounded-lg">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs font-medium text-slate-200 truncate">{c.part.name_ar}</p>
                        <p className="text-[10px] text-slate-400">{fmt(c.part.price)} × {c.qty} = {fmt(c.part.price * c.qty)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setCart((prev) => prev.map((x, xi) => xi === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="w-7 h-7 rounded-lg bg-slate-700/50 text-slate-300 flex items-center justify-center text-sm font-bold active:bg-slate-600">-</button>
                        <span className="text-xs font-bold text-slate-200 w-4 text-center">{c.qty}</span>
                        <button onClick={() => setCart((prev) => prev.map((x, xi) => xi === i ? { ...x, qty: x.qty + 1 } : x))} className="w-7 h-7 rounded-lg bg-slate-700/50 text-slate-300 flex items-center justify-center text-sm font-bold active:bg-slate-600">+</button>
                        <button onClick={() => setCart((prev) => prev.filter((_, xi) => xi !== i))} className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center mr-1"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs text-slate-400"><span>المجموع:</span><span>{fmt(cartTotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-xs text-rose-400"><span>الخصم:</span><span>-{fmt(discount)}</span></div>}
                  <div className="flex justify-between text-xs text-blue-400"><span>الضريبة ({(settings.vat_rate * 100).toFixed(0)}%):</span><span>{fmt(vatAmt)}</span></div>
                  <div className="flex justify-between text-base font-black text-amber-400"><span>الإجمالي:</span><span>{fmt(finalTotal)}</span></div>
                  <div className="flex gap-2">
                    {(["نقدي", "مدى", "فيزا", "تحويل"] as const).map((m) => (
                      <button key={m} onClick={() => setSellPaymentMethod(m)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${sellPaymentMethod === m ? "bg-sky-500 text-white shadow" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>{m}</button>
                    ))}
                  </div>
                  <Btn onClick={() => { checkout(); setCartOpen(false); }} disabled={cart.length === 0} className="w-full" icon={Receipt}>إصدار الفاتورة</Btn>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {posTab === "buy" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="w-full pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500" />
                </div>
                <Select value={selCat} onChange={setSelCat} options={productCategories.map((c) => ({ value: c, label: c }))} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => addToBuyCart(p)} className="glass-liquid rounded-xl p-3 text-right transition-all hover:shadow-2xl hover:scale-[1.02]">
                    <p className="text-xs font-mono text-slate-500">{p.id}</p>
                    <p className="text-sm font-bold text-slate-100 mt-1 line-clamp-1">{p.name_ar}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-400">تكلفة: {fmt(p.cost || 0)}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">{p.stock}</span>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && <div className="col-span-full text-center py-8 text-slate-500 text-sm">لا توجد قطع</div>}
              </div>
            </div>
            <div className="space-y-4">
              <GlassCard title="سلة الشراء" icon={Truck}>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {buyCart.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 glass-liquid rounded-lg">
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-200 truncate">{c.part.name_ar}</p>
                        <div className="flex items-center gap-2">
                          <input value={c.buyPrice} onChange={(e) => setBuyCart((prev) => prev.map((x, xi) => xi === i ? { ...x, buyPrice: Number(e.target.value) } : x))} type="number" min={0} step={0.01} className="w-20 px-1.5 py-0.5 rounded liquid-input text-[10px] text-slate-100" />
                          <span className="text-[10px] text-slate-400">× {c.qty}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setBuyCart((prev) => prev.map((x, xi) => xi === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="w-6 h-6 rounded bg-slate-700/50 text-slate-300 flex items-center justify-center text-xs">-</button>
                        <span className="text-xs font-bold text-slate-200 w-5 text-center">{c.qty}</span>
                        <button onClick={() => setBuyCart((prev) => prev.map((x, xi) => xi === i ? { ...x, qty: x.qty + 1 } : x))} className="w-6 h-6 rounded bg-slate-700/50 text-slate-300 flex items-center justify-center text-xs">+</button>
                        <button onClick={() => setBuyCart((prev) => prev.filter((_, xi) => xi !== i))} className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center mr-1"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  {buyCart.length === 0 && <div className="text-center py-4 text-slate-500 text-xs">السلة فارغة</div>}
                </div>
                <div className="space-y-2 mt-3 pt-3 border-t border-white/10">
                  <Select label="المورد" value={selSupplier} onChange={setSelSupplier} options={[{ value: "", label: "مورد عام" }, ...suppliers.map((s) => ({ value: s.name, label: s.name }))]} />
                  <div className="flex justify-between text-sm font-black text-slate-100"><span>الإجمالي:</span><span>{fmt(buyCartTotal)}</span></div>
                  <Btn onClick={checkoutBuy} disabled={buyCart.length === 0} className="w-full" variant="success" icon={Receipt}>تسجيل المشتريات</Btn>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {posTab === "adjust" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap flex-1">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="w-full pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500" />
                </div>
                <Select value={selCat} onChange={setSelCat} options={productCategories.map((c) => ({ value: c, label: c }))} />
              </div>
              <Btn size="sm" variant="success" onClick={() => {
                Object.entries(adjustInputs).forEach(([partId, newStock]) => {
                  handleAdjustStock(partId, newStock);
                });
                addToast("تم تطبيق جميع التسويات", "success");
              }} icon={CheckCircle2}>تطبيق الكل</Btn>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الرقم</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الاسم</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">المخزون الحالي</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">المخزون الجديد</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{p.id}</td>
                      <td className="px-3 py-2 font-medium text-slate-200">{p.name_ar}</td>
                      <td className="px-3 py-2 text-slate-300 font-bold">{fmtInt(p.stock)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} defaultValue={p.stock}
                          onChange={(e) => setAdjustInputs((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                          className="w-24 px-2 py-1 rounded liquid-input text-sm text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Btn size="sm" variant="outline" onClick={() => handleAdjustStock(p.id, adjustInputs[p.id] ?? p.stock)} icon={SlidersHorizontal}>تسوية</Btn>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500 text-sm">لا توجد قطع</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* POS simplified: sell, buy, adjust only */}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: CustomersView
  // ═══════════════════════════════════════════════════════════════

  function CustomersView() {
    const [search, setSearch] = useState("");
    const filteredCustomers = useMemo(() => {
      return customers.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
      });
    }, [customers, search]);

    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2"><Users className="w-6 h-6 text-amber-400" /> العملاء</h2>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="w-48 pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500" />
            </div>
            <Btn size="sm" onClick={() => setModal({ type: "customer" })} icon={Plus}>إضافة عميل</Btn>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => (
            <div key={c.id} className="glass-liquid rounded-2xl p-5 transition-all hover:shadow-2xl liquid-glow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-100">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{c.phone || "—"}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ type: "customer", data: c })} className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5 text-amber-400" /></button>
                  <button onClick={() => handleDeleteCustomer(c.id)} className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {c.phone || "—"}</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {c.address || "—"}</div>
                <div className="flex items-center gap-1.5"><UserCircle className="w-3.5 h-3.5 text-slate-500" /> {c.email || "—"}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-400">إجمالي المشتريات</span>
                <span className="text-sm font-bold text-emerald-400">{fmt(c.total_bought || 0)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400">آخر زيارة</span>
                <span className="text-xs text-slate-300">{c.last_visit || "—"}</span>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 text-sm">لا يوجد عملاء</div>}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: TransactionsView — MERGED purchases + expenses
  // ═══════════════════════════════════════════════════════════════

  function TransactionsView() {
    const [txTab, setTxTab] = useState<"all" | "purchases" | "expenses">("all");
    const [search, setSearch] = useState("");

    const filteredPurchases = useMemo(() => {
      if (!search) return purchases;
      return purchases.filter((p) => p.supplier?.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));
    }, [purchases, search]);

    const filteredExpenses = useMemo(() => {
      if (!search) return expenses;
      return expenses.filter((e) => e.description?.toLowerCase().includes(search.toLowerCase()) || e.category?.toLowerCase().includes(search.toLowerCase()));
    }, [expenses, search]);

    const totalPurchasesVal = purchases.reduce((s, p) => s + p.total, 0);
    const totalExpensesVal = expenses.reduce((s, e) => s + e.amount, 0);

    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-amber-400" /> المشتريات والمصروفات</h2>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" onClick={() => setPage("pos")} icon={Truck}>شراء جديد</Btn>
            <Btn size="sm" onClick={() => setModal({ type: "expense" })} icon={Plus}>إضافة مصروف</Btn>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass-liquid rounded-xl p-4 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-emerald-400" /></div>
              <div>
                <p className="text-xs text-slate-400">إجمالي المشتريات</p>
                <p className="text-lg font-black text-emerald-400">{fmt(totalPurchasesVal)}</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rounded-xl p-4 border border-rose-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center"><Receipt className="w-4 h-4 text-rose-400" /></div>
              <div>
                <p className="text-xs text-slate-400">إجمالي المصروفات</p>
                <p className="text-lg font-black text-rose-400">{fmt(totalExpensesVal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { key: "all" as const, label: "الكل", icon: List },
            { key: "purchases" as const, label: "المشتريات", icon: ShoppingCart },
            { key: "expenses" as const, label: "المصروفات", icon: Receipt },
          ].map((t) => (
            <button key={t.key} onClick={() => setTxTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${txTab === t.key ? "bg-amber-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="w-full pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500" />
        </div>

        {/* Purchases */}
        {(txTab === "all" || txTab === "purchases") && (
          <div>
            <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> فواتير الشراء</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">#</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">التاريخ</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">المورد</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الأصناف</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الإجمالي</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الحالة</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{p.id}</td>
                      <td className="px-3 py-2 text-slate-300">{p.date}</td>
                      <td className="px-3 py-2 text-slate-200">{p.supplier}</td>
                      <td className="px-3 py-2 text-slate-300">{p.items.length} صنف</td>
                      <td className="px-3 py-2 text-emerald-400 font-bold">{fmt(p.total)}</td>
                      <td className="px-3 py-2"><StatusPill status={p.status || "مكتمل"} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => setPrintInvoice({
                            id: p.id, date: p.date, customer: p.supplier,
                            items: p.items.map((it: any) => ({ name: it.name, qty: it.qty, price: it.unit_price || it.price || it.cost || 0, total: (it.unit_price || it.price || it.cost || 0) * it.qty })),
                            subtotal: p.subtotal || p.total, vat: p.vat || 0, total: p.total, payment: "شراء", type: "buy"
                          } as any)} className="w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 flex items-center justify-center transition-colors" title="طباعة"><Printer className="w-3.5 h-3.5 text-sky-400" /></button>
                          <button onClick={() => handleDeletePurchase(p.id)} className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPurchases.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500 text-sm">لا توجد مشتريات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses */}
        {(txTab === "all" || txTab === "expenses") && (
          <div>
            <h3 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-2"><Receipt className="w-4 h-4" /> المصروفات</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">#</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">التاريخ</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الوصف</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الفئة</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">المبلغ</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">الجهة</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{e.id}</td>
                      <td className="px-3 py-2 text-slate-300">{e.date}</td>
                      <td className="px-3 py-2 text-slate-200 font-medium">{e.description}</td>
                      <td className="px-3 py-2 text-slate-400">{e.category}</td>
                      <td className="px-3 py-2 text-rose-400 font-bold">{fmt(e.amount)}</td>
                      <td className="px-3 py-2 text-slate-400">{e.party || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => setPrintInvoice({
                            id: e.id, date: e.date, customer: e.party || e.category || "مصروف",
                            items: [{ name: e.description, qty: 1, price: e.amount, total: e.amount }],
                            subtotal: e.amount, vat: 0, total: e.amount, payment: "صرف", type: "expense"
                          } as any)} className="w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 flex items-center justify-center transition-colors" title="طباعة"><Printer className="w-3.5 h-3.5 text-sky-400" /></button>
                          <button onClick={() => setModal({ type: "expense", data: e })} className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5 text-amber-400" /></button>
                          <button onClick={() => handleDeleteExpense(e.id)} className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500 text-sm">لا توجد مصروفات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: AccountsView — 4 subtabs
  // ═══════════════════════════════════════════════════════════════

  function AccountsView() {
    const [accountTab, setAccountTab] = useState<"tree" | "ledger" | "auditor" | "analytics">("tree");

    return (
      <div className="space-y-4" dir="rtl">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2"><BookOpen className="w-6 h-6 text-amber-400" /> الحسابات</h2>
        {/* Subtabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl flex-wrap">
          {[
            { key: "tree" as const, label: "شجرة الحسابات", icon: List },
            { key: "ledger" as const, label: "الأستاذ", icon: BookOpen },
            { key: "auditor" as const, label: "المدقق المالي", icon: ShieldCheck },
            { key: "analytics" as const, label: "تحليلات راكان", icon: BarChart3 },
          ].map((t) => (
            <button key={t.key} onClick={() => setAccountTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all min-w-[120px] ${accountTab === t.key ? "bg-amber-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {accountTab === "tree" && <LedgerView accounts={accounts} />}
        {accountTab === "ledger" && <CustomerLedger invoices={invoices} purchases={purchases} expenses={expenses} customers={customers} suppliers={suppliers} />}
        {accountTab === "auditor" && <FinancialAuditor accounts={accounts} invoices={invoices} purchases={purchases} expenses={expenses} parts={parts} customers={customers} suppliers={suppliers} />}
        {accountTab === "analytics" && <RakanAnalytics parts={parts} invoices={invoices} purchases={purchases} expenses={expenses} priceHistory={priceHistory} accounts={accounts} settings={settings} />}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: LedgerView
  // ═══════════════════════════════════════════════════════════════

  function LedgerView({ accounts: ledgerAccounts }: { accounts: Account[] }) {
    const assets = ledgerAccounts.filter((a) => a.code.startsWith("1"));
    const liabilities = ledgerAccounts.filter((a) => a.code.startsWith("2"));
    const equity = ledgerAccounts.filter((a) => a.code.startsWith("3"));
    const revenue = ledgerAccounts.filter((a) => a.code.startsWith("4"));
    const costs = ledgerAccounts.filter((a) => a.code.startsWith("5"));

    const totalAssets = assets.reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalEquity = equity.reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalRevenue = revenue.reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalCosts = costs.reduce((s, a) => s + (a.balance ?? 0), 0);

    const section = (title: string, items: Account[], color: string) => (
      <div className="glass-liquid rounded-2xl p-4">
        <h3 className={`font-bold text-sm mb-3 ${color}`}>{title}</h3>
        <div className="space-y-1.5">
          {items.map((a) => (
            <div key={a.code} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{a.code}</span>
                <span className="text-sm text-slate-200">{a.name}</span>
              </div>
              <span className={`text-sm font-bold ${(a.balance ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmt(a.balance ?? 0)}</span>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-slate-500 text-center py-2">—</p>}
        </div>
        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between">
          <span className="text-xs text-slate-400">الإجمالي</span>
          <span className={`text-sm font-black ${color}`}>{fmt(items.reduce((s, a) => s + (a.balance ?? 0), 0))}</span>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-liquid rounded-xl p-3 text-center border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400">الأصول</p>
            <p className="text-lg font-black text-emerald-300">{fmt(totalAssets)}</p>
          </div>
          <div className="glass-liquid rounded-xl p-3 text-center border border-rose-500/20">
            <p className="text-[10px] text-rose-400">الخصوم</p>
            <p className="text-lg font-black text-rose-300">{fmt(totalLiabilities)}</p>
          </div>
          <div className="glass-liquid rounded-xl p-3 text-center border border-sky-500/20">
            <p className="text-[10px] text-sky-400">حقوق الملكية</p>
            <p className="text-lg font-black text-sky-300">{fmt(totalEquity)}</p>
          </div>
          <div className="glass-liquid rounded-xl p-3 text-center border border-amber-500/20">
            <p className="text-[10px] text-amber-400">الربح الصافي</p>
            <p className="text-lg font-black text-amber-300">{fmt(totalRevenue - totalCosts)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {section("الأصول", assets, "text-emerald-400")}
          {section("الخصوم", liabilities, "text-rose-400")}
          {section("حقوق الملكية", equity, "text-sky-400")}
          {section("الإيرادات", revenue, "text-amber-400")}
          {section("التكاليف", costs, "text-violet-400")}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Handler: Seed Data (at App level so modals can access it)
  // ═══════════════════════════════════════════════════════════════

  const handleSeedData = () => {
    // Remove init flag so seed data is treated as "first visit" on next load
    localStorage.removeItem(INIT_KEY);
    const seedParts = [...MITSUBISHI_PARTS, ...INVOICE_PARTS];
    const seedSuppliers = SEED_SUPPLIERS;
    const seedCustomers = SEED_CUSTOMERS;
    const seedInvoices = SEED_INVOICES;
    const seedPurchases = SEED_PURCHASES;
    const seedExpenses = SEED_EXPENSES;
    const seedAccounts = SEED_ACCOUNTS;
    const seedSettings = DEFAULT_SETTINGS;
    setParts(seedParts);
    setSuppliers(seedSuppliers);
    setCustomers(seedCustomers);
    setInvoices(seedInvoices);
    setPurchases(seedPurchases);
    setExpenses(seedExpenses);
    setAccounts(seedAccounts);
    setSettings(seedSettings);
    // Save immediately to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      parts: seedParts, suppliers: seedSuppliers, customers: seedCustomers,
      invoices: seedInvoices, purchases: seedPurchases, expenses: seedExpenses,
      accounts: seedAccounts, settings: seedSettings,
    }));
    addToast("تم تحميل البيانات التجريبية بنجاح", "success");
    setResetConfirm(0);
  };

  const handleLogin = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.success) {
      const profile = result.data?.user || result.data?.profile;
      const role = profile?.role || "admin";
      setUser(profile || { email });
      setUserRole(role as UserRole);
      cacheRole(role as UserRole);
      setAuthOpen(false);
      addToast(`تم تسجيل الدخول بنجاح${role ? ` (دور: ${role})` : ""}`, "success");
      return { success: true };
    }
    return { success: false, error: result.error || "فشل تسجيل الدخول" };
  };

  const handleRegister = async (data: RegisterData) => {
    const result = await signUp(data.email, data.password, data.fullName, data.role);
    if (result.success) {
      setAuthOpen(false);
      addToast("تم إنشاء الحساب بنجاح — يمكنك الآن تسجيل الدخول", "success");
      return { success: true };
    }
    return { success: false, error: result.error || "فشل إنشاء الحساب" };
  };

  const handleLogout = async () => {
    await signOut();
    // The onAuthChange listener will clear user/userRole via the SIGNED_OUT event,
    // but we clear here too for immediate UI response.
    setUser(null);
    setUserRole(null);
    addToast("تم تسجيل الخروج — سجل الدخول كـ admin@partspro.com / admin123", "info");
  };

  // ═══════════════════════════════════════════════════════════════
  // VIEW: SettingsView
  // ═══════════════════════════════════════════════════════════════

  function SettingsView() {
    const handleImportExcel = async () => {
      try {
        const XLSX = await import("xlsx");
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls,.csv";
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          if (jsonData.length < 2) { addToast("الملف فارغ", "error"); return; }
          const headers = jsonData[0].map((h: any) => String(h).trim());
          const rows = jsonData.slice(1).map((row: any[]) => {
            const obj: any = {};
            headers.forEach((h: string, i: number) => { obj[h] = row[i] ?? ""; });
            return {
              id: obj.id || obj["رقم القطعة"] || obj["الرقم"] || newId("SKU"),
              oem: obj.oem || obj["رقم OEM"] || obj["OEM"] || "",
              name_ar: obj.name_ar || obj["الاسم"] || obj["اسم"] || obj["الاسم بالعربي"] || "",
              brand: obj.brand || obj["الماركة"] || obj["ماركة"] || "عام",
              category: obj.category || obj["الفئة"] || obj["فئة"] || "عام",
              model: obj.model || obj["الموديل"] || obj["موديل"] || "",
              stock: Number(obj.stock || obj["الكمية"] || obj["كمية"] || 0),
              min_stock: Number(obj.min_stock || obj["الحد الأدنى"] || obj["حد أدنى"] || 2),
              location: obj.location || obj["الموقع"] || obj["موقع"] || "",
              cost: Number(obj.cost || obj["التكلفة"] || obj["تكلفة"] || 0),
              price: Number(obj.price || obj["السعر"] || obj["سعر"] || 0),
              wholesale: Number(obj.wholesale || obj["سعر الجملة"] || obj["الجملة"] || 0),
            } as Part;
          }).filter((p: Part) => p.name_ar);
          setParts((prev) => [...prev, ...rows]);
          addToast(`تم استيراد ${rows.length} قطعة من Excel`, "success");
        };
        input.click();
      } catch {
        addToast("فشل الاستيراد - تأكد من تثبيت مكتبة xlsx", "error");
      }
    };

    return (
      <div className="space-y-5" dir="rtl">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2"><Cog className="w-6 h-6 text-amber-400" /> الإعدادات</h2>

        <RuntimeConfigSettings onSaved={() => { try { window.dispatchEvent(new Event(RUNTIME_CONFIG_EVENT)); } catch {} }} />

        <DataManagementPanel addToast={addToast} onChange={() => { try { window.location.reload(); } catch {} }} />

        <GlassCard title="معلومات المتجر" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="اسم المتجر" value={settings.company_name} onChange={(v) => setSettings((s) => ({ ...s, company_name: v }))} />
            <Input label="عنوان المتجر" value={settings.address} onChange={(v) => setSettings((s) => ({ ...s, address: v }))} />
            <Input label="رقم الهاتف" value={settings.phone} onChange={(v) => setSettings((s) => ({ ...s, phone: v }))} />
            <Input label="السجل التجاري" value={settings.cr_number} onChange={(v) => setSettings((s) => ({ ...s, cr_number: v }))} />
          </div>
        </GlassCard>

        <GlassCard title="إعدادات الضريبة" icon={DollarSign}>
          <div className="flex items-center gap-4 flex-wrap">
            <Toggle label="تفعيل VAT" checked={settings.vat_enabled} onChange={(v) => setSettings((s) => ({ ...s, vat_enabled: v }))} />
            <div className="flex-1 min-w-[150px]">
              <Input label="نسبة VAT" value={settings.vat_rate} onChange={(v) => setSettings((s) => ({ ...s, vat_rate: Number(v) }))} type="number" min={0} max={1} step={0.01} />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input label="رقم VAT" value={settings.vat_number} onChange={(v) => setSettings((s) => ({ ...s, vat_number: v }))} />
            </div>
          </div>
        </GlassCard>

        <GlassCard title="إعدادات الفاتورة" icon={Receipt}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="تذييل الفاتورة" value={settings.invoice_footer} onChange={(v) => setSettings((s) => ({ ...s, invoice_footer: v }))} placeholder="تظهر أسفل كل فاتورة" />
            <Input label="القالب الافتراضي" value={settings.default_template} onChange={(v) => setSettings((s) => ({ ...s, default_template: v }))} placeholder="اسم القالب الافتراضي" />
          </div>
        </GlassCard>

        <GlassCard title="مزامنة Supabase" icon={RefreshCw}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : supabaseStatus === "tables_missing" ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" : "bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]"}`} />
              <span className="text-sm text-slate-300">
                {supabaseStatus === "connected" ? "متصل بـ Supabase" :
                 supabaseStatus === "tables_missing" ? "جداول Supabase غير موجودة" :
                 supabaseStatus === "checking" ? "جاري التحقق..." :
                 "غير متصل بـ Supabase"}
              </span>
            </div>
            {supabaseStatus === "tables_missing" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-300 font-bold mb-1">جداول قاعدة البيانات غير موجودة</p>
                <p className="text-[11px] text-slate-400 mb-2">انسخ هذا SQL إلى محرر SQL في Supabase:</p>
                <pre className="bg-slate-900 rounded-lg p-3 text-[10px] text-slate-300 overflow-x-auto max-h-40">{MIGRATION_SQL}</pre>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Btn variant="outline" size="sm" onClick={() => {
                if (!isSupabaseConfigured()) { addToast("لم يتم تكوين Supabase", "error"); return; }
                setSyncing(true);
                syncAllToSupabase({ parts, suppliers, customers, invoices, purchases, expenses, accounts, settings })
                  .then(() => addToast("تمت المزامنة بنجاح", "success"))
                  .catch(() => addToast("فشلت المزامنة", "error"))
                  .finally(() => setSyncing(false));
              }} disabled={syncing || supabaseStatus !== "connected"} icon={syncing ? RefreshCw : Upload}>{syncing ? "جاري المزامنة..." : "مزامنة يدوية"}</Btn>
              <Btn variant="secondary" size="sm" onClick={() => {
                if (!isSupabaseConfigured()) { addToast("لم يتم تكوين Supabase", "error"); return; }
                setSyncing(true);
                fetchAllFromSupabase().then((result) => {
                  if (result.parts && result.parts.length > 0) setParts(result.parts);
                  if (result.suppliers && result.suppliers.length > 0) setSuppliers(result.suppliers);
                  if (result.customers && result.customers.length > 0) setCustomers(result.customers);
                  if (result.invoices && result.invoices.length > 0) setInvoices(result.invoices);
                  if (result.purchases && result.purchases.length > 0) setPurchases(result.purchases);
                  if (result.expenses && result.expenses.length > 0) setExpenses(result.expenses);
                  if (result.accounts && result.accounts.length > 0) setAccounts(result.accounts);
                  if (result.settings) setSettings(result.settings);
                  addToast("تم جلب البيانات من Supabase", "success");
                }).catch(() => addToast("فشل الجلب من Supabase", "error")).finally(() => setSyncing(false));
              }} disabled={syncing || supabaseStatus !== "connected"} icon={Download}>جلب البيانات</Btn>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="إدارة البيانات" icon={AlertTriangle}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              حذف جميع البيانات يشمل: الفواتير، المشتريات، المصروفات، القطع، الموردين، والعملاء.
              لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <Btn variant="outline" size="sm" onClick={handleImportExcel} icon={Upload}>استيراد Excel</Btn>
              <Btn variant="danger" size="sm" onClick={() => setResetConfirm(1)} icon={Trash2}>حذف جميع البيانات</Btn>
              <Btn variant="outline" size="sm" onClick={() => setResetConfirm(4)} icon={RotateCcw}>إعادة تحميل البيانات التجريبية</Btn>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="حساب المدير" icon={ShieldCheck}>
          <div className="space-y-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-xs text-amber-400 font-bold mb-2">بيانات حساب المدير الافتراضي:</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">البريد:</span>
                  <span className="text-slate-200 mr-1">{getDefaultAdmin().email}</span>
                </div>
                <div>
                  <span className="text-slate-500">كلمة المرور:</span>
                  <span className="text-slate-200 mr-1">{getDefaultAdmin().password}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  import("./services/auth").then(({ resetDefaultAdmin }) => {
                    resetDefaultAdmin();
                    addToast("تم إعادة تعيين كلمة مرور المدير إلى: admin123", "success");
                  });
                }}
                icon={KeyRound}
              >
                إعادة تعيين كلمة المرور
              </Btn>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `البريد: ${getDefaultAdmin().email} | كلمة المرور: ${getDefaultAdmin().password}`
                  );
                  addToast("تم نسخ بيانات الدخول", "success");
                }}
              >
                نسخ البيانات
              </Btn>
            </div>
            <p className="text-[10px] text-slate-500">
              يمكنك تسجيل الدخول بهذا الحساب أو إنشاء حسابات جديدة من صفحة تسجيل الدخول.
            </p>
          </div>
        </GlassCard>

        <GlassCard title="المعلومات" icon={Code}>
          <div className="space-y-2 text-xs text-slate-400">
            <p>الإصدار: 3.1 Liquid Design</p>
            <p>المطور: ركان للذكاء الاصطناعي</p>
            <p>التقنيات: React, TypeScript, Tailwind CSS, Supabase</p>
            <p>الميزات: POS, مخزون, فواتير, حسابات, تحليلات, مزامنة سحابية</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Supabase Status Badge (inline helper)
  // ═══════════════════════════════════════════════════════════════

  function SupabaseStatusBadge() {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm border transition-all duration-300"
        style={{
          background: supabaseStatus === "connected" ? "rgba(52,211,153,0.1)" : supabaseStatus === "tables_missing" ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)",
          borderColor: supabaseStatus === "connected" ? "rgba(52,211,153,0.2)" : supabaseStatus === "tables_missing" ? "rgba(251,191,36,0.2)" : "rgba(248,113,113,0.2)",
          color: supabaseStatus === "connected" ? "#34d399" : supabaseStatus === "tables_missing" ? "#fbbf24" : "#f87171",
        }}>
        <div className={`w-1.5 h-1.5 rounded-full ${supabaseStatus === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : supabaseStatus === "tables_missing" ? "bg-amber-400" : "bg-rose-400"}`} />
        {supabaseStatus === "connected" ? "Supabase" : supabaseStatus === "tables_missing" ? "جداول ناقصة" : "غير متصل"}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen liquid-bg text-slate-100" dir="rtl">
      {/* ═══ Reset Confirm: Restore Demo Data (4) ═══ */}
      <Modal open={resetConfirm === 4} onClose={() => setResetConfirm(0)} title="إعادة تحميل البيانات التجريبية">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">سيتم استبدال جميع البيانات الحالية بالبيانات التجريبية الافتراضية. لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setResetConfirm(0)}>إلغاء</Btn>
            <Btn variant="danger" onClick={handleSeedData} icon={RotateCcw}>إعادة التحميل</Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ Reset Confirm: Data Management (1) — Delete All Data ═══ */}
      <Modal open={resetConfirm === 1} onClose={() => setResetConfirm(0)} title="حذف جميع البيانات">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">سيتم حذف جميع البيانات بشكل نهي. لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setResetConfirm(0)}>إلغاء</Btn>
            <Btn variant="danger" onClick={handleClearAllData} icon={Trash2}>حذف الكل</Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ Delete Confirmation Modal ═══ */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="تأكيد الحذف">
        {deleteConfirm && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              هل أنت متأكد من حذف{" "}
              <strong className="text-amber-400">
                {deleteConfirm.type === "part" ? "القطعة" :
                 deleteConfirm.type === "supplier" ? "المورد" :
                 deleteConfirm.type === "customer" ? "العميل" :
                 deleteConfirm.type === "expense" ? "المصروف" :
                 deleteConfirm.type === "invoice" ? "الفاتورة" :
                 deleteConfirm.type === "purchase" ? "فاتورة الشراء" : "العنصر"}
              </strong>
              {" "}"{deleteConfirm.name}"؟
            </p>
            {(deleteConfirm.type === "invoice" || deleteConfirm.type === "purchase") && (
              <p className="text-xs text-amber-300">
                {deleteConfirm.type === "invoice"
                  ? "سيتم إرجاع كميات القطع المباعة إلى المخزون."
                  : "سيتم خصم كميات القطع المشتراة من المخزون."}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setDeleteConfirm(null)}>إلغاء</Btn>
              <Btn variant="danger" onClick={confirmDelete} icon={Trash2}>حذف</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Toast Container ═══ */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ═══ Part Modal ═══ */}
      <Modal open={modal?.type === "part"} onClose={() => setModal(null)} title={modal?.data ? "تعديل قطعة" : "إضافة قطعة جديدة"} maxWidth="max-w-2xl">
        <PartForm part={modal?.data || null} onSave={handleSavePart} onCancel={() => setModal(null)} />
      </Modal>

      {/* ═══ Supplier Modal ═══ */}
      <Modal open={modal?.type === "supplier"} onClose={() => setModal(null)} title={modal?.data ? "تعديل مورد" : "إضافة مورد جديد"}>
        <SupplierForm supplier={modal?.data || null} onSave={handleSaveSupplier} onCancel={() => setModal(null)} />
      </Modal>

      {/* ═══ Customer Modal ═══ */}
      <Modal open={modal?.type === "customer"} onClose={() => setModal(null)} title={modal?.data ? "تعديل عميل" : "إضافة عميل جديد"}>
        <CustomerForm customer={modal?.data || null} onSave={handleSaveCustomer} onCancel={() => setModal(null)} />
      </Modal>

      {/* ═══ Expense Modal ═══ */}
      <Modal open={modal?.type === "expense"} onClose={() => setModal(null)} title={modal?.data ? "تعديل مصروف" : "إضافة مصروف جديد"}>
        <ExpenseForm expense={modal?.data || null} onSave={handleSaveExpense} onCancel={() => setModal(null)} />
      </Modal>

      {/* ═══ Import Modal ═══ */}
      <Modal open={modal?.type === "import"} onClose={() => setModal(null)} title="استيراد من ملف" maxWidth="max-w-2xl">
        <FileImportPanel onImport={handleImportParts} onClose={() => setModal(null)} />
      </Modal>

      {/* ═══ Layout: Top Bar + Main + Bottom Nav ═══ */}
      <div className="flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 glass-liquid border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-100">Parts Pro</h1>
              <p className="text-[9px] text-slate-500">v3 Liquid</p>
            </div>
          </div>
          <h2 className="text-base font-bold text-slate-100 hidden sm:block">
            {navItems.find((n) => n.key === page)?.label || "Parts Pro"}
          </h2>
          <div className="flex items-center gap-2">
            <OnlineIndicator />
            <SupabaseStatusBadge />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 hidden sm:inline">{userRole === "admin" ? "مدير" : userRole === "manager" ? "مشرف" : userRole === "cashier" ? "أمين صندوق" : userRole === "viewer" ? "مشاهد" : ""}</span>
                <span className="text-xs text-slate-400 hidden sm:inline">{user.email || "مستخدم"}</span>
                <button onClick={handleLogout} className="w-8 h-8 rounded-lg hover:bg-rose-500/20 flex items-center justify-center transition-colors" title="تسجيل الخروج">
                  <LogOut className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors">
                تسجيل الدخول
              </button>
            )}
            <button onClick={() => setModal({ type: "part" })} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors" title="إضافة قطعة">
              <Plus className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto pb-32">
            {!isSupabaseRuntimeReady() && page !== "settings" && (
              <div
                className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-center justify-between gap-3"
                dir="rtl"
              >
                <div className="flex items-center gap-2 text-amber-200 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>إعدادات قاعدة البيانات غير مكتملة — اذهب إلى الإعدادات</span>
                </div>
                <button
                  onClick={() => setPage("settings")}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold"
                >
                  فتح الإعدادات
                </button>
              </div>
            )}
            {page === "dashboard" && <DashboardView />}
            {page === "inventory" && <InventoryView />}
            {page === "pos" && <POSView />}
            {page === "customers" && <CustomersView />}
            {page === "transactions" && <TransactionsView />}
            {page === "accounts" && <AccountsView />}
            {page === "settings" && <SettingsView />}
          </div>
        
        </main>

        {/* ═══ Bottom Navigation Bar ═══ */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 glass-liquid border-t border-white/10"
          style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex overflow-x-auto scrollbar-hide">
            {navItems.filter((item) => canViewPage(item.key)).map((item) => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-3 min-w-[80px] flex-shrink-0 transition-all duration-200 ${
                  page === item.key
                    ? "text-amber-400 border-t-[3px] border-amber-400 bg-amber-500/10"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-2 -left-2.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* ═══ Invoice Preview ═══ */}
      {printInvoice && (
        <InvoicePreview
          invoice={{
            id: printInvoice.id,
            date: printInvoice.date,
            customer: printInvoice.customer,
            type: (printInvoice as any).type || "sell",
            items: printInvoice.items.map(item => ({
              name: item.name,
              qty: item.qty,
              price: item.price,
              total: item.qty * item.price
            })),
            subtotal: printInvoice.subtotal,
            vat: printInvoice.vat,
            total: printInvoice.total,
            payment: printInvoice.payment
          }}
          onClose={() => setPrintInvoice(null)}
        />
      )}

      {/* ═══ Auth Modal ═══ */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onForgotPassword={async (_email) => {
          void _email;
          return { success: false, error: "قيد التطوير" };
        }}
      />

      {/* ═══ Modals ═══ */}
      <Modal open={modal?.type === "part"} onClose={() => setModal(null)} title={modal?.data?.id ? "تعديل قطعة" : "إضافة قطعة"}>
        <PartForm part={modal?.data} onSave={handleSavePart} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === "supplier"} onClose={() => setModal(null)} title={modal?.data?.id ? "تعديل مورد" : "إضافة مورد"}>
        <SupplierForm supplier={modal?.data} onSave={handleSaveSupplier} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === "customer"} onClose={() => setModal(null)} title={modal?.data?.id ? "تعديل عميل" : "إضافة عميل"}>
        <CustomerForm customer={modal?.data} onSave={handleSaveCustomer} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === "expense"} onClose={() => setModal(null)} title={modal?.data?.id ? "تعديل مصروف" : "إضافة مصروف"}>
        <ExpenseForm expense={modal?.data} onSave={handleSaveExpense} onCancel={() => setModal(null)} />
      </Modal>

      {/* ═══ Delete Confirmation Modal ═══ */}
      <Modal open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title={deleteConfirm?.type === "part" ? "حذف قطعة" : deleteConfirm?.type === "supplier" ? "حذف مورد" : deleteConfirm?.type === "customer" ? "حذف عميل" : "حذف"}>
        <div className="space-y-3">
          <p className="text-sm text-slate-300">هل أنت متأكد من حذف <strong className="text-slate-100">{deleteConfirm?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.</p>
          {deleteConfirm?.type === "invoice" && <p className="text-xs text-amber-400">سيتم إرجاع القطع إلى المخزون</p>}
          {deleteConfirm?.type === "purchase" && <p className="text-xs text-amber-400">سيتم خصم القطع من المخزون</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteConfirm(null)}>إلغاء</Btn>
            <Btn variant="danger" onClick={confirmDelete} icon={Trash2}>حذف</Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ Toast Container ═══ */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ═══ J.A.R.V.I.S ═══ */}
      <JarvisChat ctx={{ page, parts, invoices, purchases, expenses, customers, suppliers, accounts, journal }} />
    </div>
  );
}