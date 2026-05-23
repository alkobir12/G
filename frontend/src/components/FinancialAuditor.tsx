import { useMemo } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, AlertTriangle, XCircle,
  Calculator, BookOpen, TrendingUp, Wallet, Building2, Users, Boxes
} from "lucide-react";
import type { Account, Invoice, Purchase, Expense, Part, Customer, Supplier } from "../data/seed";
import { fmt } from "../lib/utils";

// ═══════════════════════════════════════════════════════════
// FINANCIAL AUDITOR — مدقق مالي تفاعلي
// ═══════════════════════════════════════════════════════════

interface FinancialAuditorProps {
  accounts: Account[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  parts: Part[];
  customers: Customer[];
  suppliers: Supplier[];
}

/** GlassCard */
function GlassCard({ children, className = "", title, icon: Icon, action, status }: {
  children: React.ReactNode; className?: string; title?: string;
  icon?: React.ElementType; action?: React.ReactNode; status?: "ok" | "warn" | "error" | "neutral";
}) {
  const statusBorder = status === "ok" ? "border-emerald-200" : status === "warn" ? "border-amber-200" : status === "error" ? "border-rose-200" : "border-white/60";
  const statusBg = status === "ok" ? "bg-emerald-50/50" : status === "warn" ? "bg-amber-50/50" : status === "error" ? "bg-rose-50/50" : "bg-white/70";
  return (
    <div className={`${statusBg} backdrop-blur-md rounded-2xl border ${statusBorder} shadow-lg shadow-slate-200/40 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${status === "ok" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : status === "error" ? "text-rose-600" : "text-amber-600"}`} />}
            {title && <h3 className="font-bold text-slate-800 text-base">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/** AuditStatusIcon */
function AuditStatusIcon({ status, size = "md" }: { status: "ok" | "warn" | "error"; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (status === "ok") return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (status === "warn") return <AlertTriangle className={`${cls} text-amber-500`} />;
  return <XCircle className={`${cls} text-rose-500`} />;
}

/** Status Badge */
function StatusBadge({ status, label }: { status: "ok" | "warn" | "error"; label: string }) {
  const cls = status === "ok" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : status === "warn" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-rose-100 text-rose-700 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${cls}`}>
      <AuditStatusIcon status={status} size="sm" /> {label}
    </span>
  );
}

export default function FinancialAuditor({
  accounts, invoices, purchases, expenses, parts, customers, suppliers
}: FinancialAuditorProps) {

  // ═══════════════════════════════════════════════════════════
  // COMPUTED AUDIT VALUES
  // ═══════════════════════════════════════════════════════════

  // Assets
  const totalAssets = useMemo(() => {
    return accounts
      .filter(a => a.type === "أصول" && a.parent !== null)
      .reduce((s, a) => s + (a.balance || 0), 0);
  }, [accounts]);

  // Liabilities
  const totalLiabilities = useMemo(() => {
    return accounts
      .filter(a => a.type === "خصوم" && a.parent !== null)
      .reduce((s, a) => s + (a.balance || 0), 0);
  }, [accounts]);

  // Equity
  const totalEquity = useMemo(() => {
    return accounts
      .filter(a => a.type === "حقوق ملكية" && a.parent !== null)
      .reduce((s, a) => s + (a.balance || 0), 0);
  }, [accounts]);

  // Accounting Equation: Assets = Liabilities + Equity
  const equationDiff = totalAssets - (totalLiabilities + totalEquity);
  const equationStatus: "ok" | "warn" | "error" = Math.abs(equationDiff) < 0.01 ? "ok" : Math.abs(equationDiff) < 100 ? "warn" : "error";

  // Revenue from invoices
  const computedRevenue = useMemo(() => invoices.reduce((s, i) => s + i.subtotal, 0), [invoices]);
  const revenueAccount = accounts.find(a => a.code === "4100");
  const revenueDiff = (revenueAccount?.balance || 0) - computedRevenue;
  const revenueStatus: "ok" | "warn" | "error" = Math.abs(revenueDiff) < 0.01 ? "ok" : Math.abs(revenueDiff) < 50 ? "warn" : "error";

  // Expenses check
  const computedExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const expenseAccountsTotal = useMemo(() =>
    accounts.filter(a => a.type === "مصروفات" && a.parent !== null && a.code !== "5000")
      .reduce((s, a) => s + (a.balance || 0), 0), [accounts]);
  const expenseDiff = expenseAccountsTotal - computedExpenses;
  const expenseStatus: "ok" | "warn" | "error" = Math.abs(expenseDiff) < 0.01 ? "ok" : Math.abs(expenseDiff) < 50 ? "warn" : "error";

  // Inventory balance check
  const computedInventoryValue = useMemo(() =>
    parts.reduce((s, p) => s + p.stock * p.cost, 0), [parts]);
  const inventoryAccount = accounts.find(a => a.code === "1200");
  const inventoryDiff = (inventoryAccount?.balance || 0) - computedInventoryValue;
  const inventoryStatus: "ok" | "warn" | "error" = Math.abs(inventoryDiff) < 0.01 ? "ok" : Math.abs(inventoryDiff) < 500 ? "warn" : "error";

  // Customer balances check
  const computedCustomerBalance = useMemo(() => customers.reduce((s, c) => s + c.balance, 0), [customers]);
  const customersAccount = accounts.find(a => a.code === "1300");
  const customerDiff = (customersAccount?.balance || 0) - computedCustomerBalance;
  const customerStatus: "ok" | "warn" | "error" = Math.abs(customerDiff) < 0.01 ? "ok" : Math.abs(customerDiff) < 50 ? "warn" : "error";

  // Supplier balances check
  const computedSupplierBalance = useMemo(() => suppliers.reduce((s, sp) => s + sp.balance, 0), [suppliers]);
  const suppliersAccount = accounts.find(a => a.code === "2100");
  const supplierDiff = (suppliersAccount?.balance || 0) - computedSupplierBalance;
  const supplierStatus: "ok" | "warn" | "error" = Math.abs(supplierDiff) < 0.01 ? "ok" : Math.abs(supplierDiff) < 50 ? "warn" : "error";

  // Cash check
  const computedCash = useMemo(() => {
    const cashSales = invoices.filter(i => i.payment === "نقدي" || i.payment === "مدى").reduce((s, i) => s + i.total, 0);
    const cashExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const cashPurchases = purchases.filter(p => p.status === "مدفوعة").reduce((s, p) => s + p.total, 0);
    return 50000 + cashSales - cashExpenses - cashPurchases; // starting with 50000
  }, [invoices, expenses, purchases]);
  const cashAccount = accounts.find(a => a.code === "1100");
  const cashDiff = (cashAccount?.balance || 0) - computedCash;
  const cashStatus: "ok" | "warn" | "error" = Math.abs(cashDiff) < 1000 ? "ok" : Math.abs(cashDiff) < 5000 ? "warn" : "error";

  // Overall score
  const checks = [equationStatus, revenueStatus, expenseStatus, inventoryStatus, customerStatus, supplierStatus, cashStatus];
  const okCount = checks.filter(c => c === "ok").length;
  const score = Math.round((okCount / checks.length) * 100);
  const overallStatus: "ok" | "warn" | "error" = score >= 90 ? "ok" : score >= 70 ? "warn" : "error";

  // Sub-accounts for display
  const assetAccounts = useMemo(() => accounts.filter(a => a.type === "أصول" && a.parent !== null), [accounts]);
  const liabilityAccounts = useMemo(() => accounts.filter(a => a.type === "خصوم" && a.parent !== null), [accounts]);
  const equityAccounts = useMemo(() => accounts.filter(a => a.type === "حقوق ملكية" && a.parent !== null), [accounts]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
          {overallStatus === "ok" ? <ShieldCheck className="w-7 h-7 text-emerald-600" />
            : overallStatus === "warn" ? <ShieldAlert className="w-7 h-7 text-amber-600" />
            : <ShieldX className="w-7 h-7 text-rose-600" />}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800">المدقق المالي</h2>
          <p className="text-xs text-slate-500">فحص سلامة البيانات والتحقق من توازن الحسابات</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-center ${overallStatus === "ok" ? "bg-emerald-100" : overallStatus === "warn" ? "bg-amber-100" : "bg-rose-100"}`}>
          <p className={`text-2xl font-extrabold ${overallStatus === "ok" ? "text-emerald-700" : overallStatus === "warn" ? "text-amber-700" : "text-rose-700"}`}>{score}%</p>
          <p className={`text-xs font-bold ${overallStatus === "ok" ? "text-emerald-600" : overallStatus === "warn" ? "text-amber-600" : "text-rose-600"}`}>صحة النظام</p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard title="إجمالي الأصول" icon={Wallet} status={equationStatus}>
          <p className="text-2xl font-extrabold text-slate-800">{fmt(totalAssets)} <span className="text-sm text-slate-400">ر.س</span></p>
          <div className="mt-3 space-y-1">
            {assetAccounts.slice(0, 4).map(a => (
              <div key={a.code} className="flex justify-between text-xs">
                <span className="text-slate-500">{a.name}</span>
                <span className="font-bold text-slate-700">{fmt(a.balance || 0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="إجمالي الخصوم" icon={Building2} status={supplierStatus}>
          <p className="text-2xl font-extrabold text-slate-800">{fmt(totalLiabilities)} <span className="text-sm text-slate-400">ر.س</span></p>
          <div className="mt-3 space-y-1">
            {liabilityAccounts.slice(0, 4).map(a => (
              <div key={a.code} className="flex justify-between text-xs">
                <span className="text-slate-500">{a.name}</span>
                <span className="font-bold text-slate-700">{fmt(a.balance || 0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="حقوق الملكية" icon={TrendingUp} status={equationStatus}>
          <p className="text-2xl font-extrabold text-slate-800">{fmt(totalEquity)} <span className="text-sm text-slate-400">ر.س</span></p>
          <div className="mt-3 space-y-1">
            {equityAccounts.map(a => (
              <div key={a.code} className="flex justify-between text-xs">
                <span className="text-slate-500">{a.name}</span>
                <span className="font-bold text-slate-700">{fmt(a.balance || 0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ACCOUNTING EQUATION */}
      <GlassCard title="المعادلة المحاسبية" icon={Calculator} status={equationStatus}>
        <div className="flex items-center justify-center gap-3 flex-wrap py-4">
          <div className={`px-4 py-3 rounded-xl text-center ${equationStatus === "ok" ? "bg-emerald-50 border border-emerald-200" : equationStatus === "warn" ? "bg-amber-50 border border-amber-200" : "bg-rose-50 border border-rose-200"}`}>
            <p className="text-xs text-slate-500">الأصول</p>
            <p className="text-lg font-extrabold text-slate-800">{fmt(totalAssets)}</p>
          </div>
          <span className="text-2xl font-bold text-slate-400">=</span>
          <div className="px-4 py-3 rounded-xl text-center bg-sky-50 border border-sky-200">
            <p className="text-xs text-slate-500">الخصوم</p>
            <p className="text-lg font-extrabold text-slate-800">{fmt(totalLiabilities)}</p>
          </div>
          <span className="text-2xl font-bold text-slate-400">+</span>
          <div className="px-4 py-3 rounded-xl text-center bg-violet-50 border border-violet-200">
            <p className="text-xs text-slate-500">حقوق الملكية</p>
            <p className="text-lg font-extrabold text-slate-800">{fmt(totalEquity)}</p>
          </div>
        </div>
        <div className="text-center">
          {equationStatus === "ok" ? (
            <p className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> المعادلة متوازنة (الفرق: {fmt(Math.abs(equationDiff))})
            </p>
          ) : (
            <p className="text-sm font-bold text-rose-600 flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4" /> فرق في المعادلة: {fmt(Math.abs(equationDiff))} ر.س
            </p>
          )}
        </div>
      </GlassCard>

      {/* DETAILED CHECKS */}
      <GlassCard title="فحوصات التوازن التفصيلية" icon={BookOpen}>
        <div className="space-y-3">
          {/* Revenue Check */}
          <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-white/50">
            <StatusBadge status={revenueStatus} label={revenueStatus === "ok" ? "مطابق" : revenueStatus === "warn" ? "تنبيه" : "خطأ"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">مطابقة الإيرادات</p>
              <p className="text-xs text-slate-500">حساب الإيرادات ({fmt(revenueAccount?.balance || 0)}) مقابل فواتير المبيعات ({fmt(computedRevenue)})</p>
            </div>
            <span className={`text-xs font-bold ${Math.abs(revenueDiff) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>الفرق: {fmt(Math.abs(revenueDiff))}</span>
          </div>

          {/* Expense Check */}
          <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-white/50">
            <StatusBadge status={expenseStatus} label={expenseStatus === "ok" ? "مطابق" : expenseStatus === "warn" ? "تنبيه" : "خطأ"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">مطابقة المصروفات</p>
              <p className="text-xs text-slate-500">حسابات المصروفات ({fmt(expenseAccountsTotal)}) مقAgainst سجل المصروفات ({fmt(computedExpenses)})</p>
            </div>
            <span className={`text-xs font-bold ${Math.abs(expenseDiff) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>الفرق: {fmt(Math.abs(expenseDiff))}</span>
          </div>

          {/* Inventory Check */}
          <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-white/50">
            <StatusBadge status={inventoryStatus} label={inventoryStatus === "ok" ? "مطابق" : inventoryStatus === "warn" ? "تنبيه" : "خطأ"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">توازن المخزون</p>
              <p className="text-xs text-slate-500">حساب المخزون ({fmt(inventoryAccount?.balance || 0)}) مقابل القطع الفعلية ({fmt(computedInventoryValue)})</p>
            </div>
            <span className={`text-xs font-bold ${Math.abs(inventoryDiff) < 500 ? "text-emerald-600" : "text-rose-600"}`}>الفرق: {fmt(Math.abs(inventoryDiff))}</span>
          </div>

          {/* Customer Check */}
          <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-white/50">
            <StatusBadge status={customerStatus} label={customerStatus === "ok" ? "مطابق" : customerStatus === "warn" ? "تنبيه" : "خطأ"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">أرصدة العملاء</p>
              <p className="text-xs text-slate-500">حساب العملاء ({fmt(customersAccount?.balance || 0)}) مقAgainst أرصدة العملاء ({fmt(computedCustomerBalance)})</p>
            </div>
            <span className={`text-xs font-bold ${Math.abs(customerDiff) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>الفرق: {fmt(Math.abs(customerDiff))}</span>
          </div>

          {/* Supplier Check */}
          <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-white/50">
            <StatusBadge status={supplierStatus} label={supplierStatus === "ok" ? "مطابق" : supplierStatus === "warn" ? "تنبيه" : "خطأ"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">أرصدة الموردين</p>
              <p className="text-xs text-slate-500">حساب الموردين ({fmt(suppliersAccount?.balance || 0)}) مقابل أرصدة الموردين ({fmt(computedSupplierBalance)})</p>
            </div>
            <span className={`text-xs font-bold ${Math.abs(supplierDiff) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>الفرق: {fmt(Math.abs(supplierDiff))}</span>
          </div>

          {/* Cash Check */}
          <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-white/50">
            <StatusBadge status={cashStatus} label={cashStatus === "ok" ? "مطابق" : cashStatus === "warn" ? "تنبيه" : "خطأ"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">النقدية والبنوك</p>
              <p className="text-xs text-slate-500">حساب النقدية ({fmt(cashAccount?.balance || 0)}) - تقدير من العمليات ({fmt(computedCash)})</p>
            </div>
            <span className={`text-xs font-bold ${Math.abs(cashDiff) < 1000 ? "text-emerald-600" : "text-rose-600"}`}>الفرق: {fmt(Math.abs(cashDiff))}</span>
          </div>
        </div>
      </GlassCard>

      {/* SUB-LEDGER SUMMARIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard title="تفاصيل الأصول" icon={Boxes} status="neutral">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {assetAccounts.map(a => (
              <div key={a.code} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{a.code}</span>
                  <span className="text-xs font-medium text-slate-700">{a.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{fmt(a.balance || 0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="تفاصيل الخصوم" icon={Users} status="neutral">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {liabilityAccounts.map(a => (
              <div key={a.code} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{a.code}</span>
                  <span className="text-xs font-medium text-slate-700">{a.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{fmt(a.balance || 0)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
