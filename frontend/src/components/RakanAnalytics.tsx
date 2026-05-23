import { useMemo, useState } from "react";
import {
  Receipt, DollarSign, AlertTriangle,
  ArrowUp, ArrowDown, BarChart3, PieChart,
  Wallet, Boxes, History, Sparkles,
  CreditCard, AlertCircle, LayoutDashboard, BrainCircuit,
  Tag
} from "lucide-react";
import type {
  Part, Invoice, Purchase, Expense, Account,
  PriceHistory, AppSettings
} from "../data/seed";
import { fmt, fmtInt } from "../lib/utils";

// ═══════════════════════════════════════════════════════════
// RAKAN ANALYTICS — Liquid Design (No Recharts — HTML/CSS Charts)
// ═══════════════════════════════════════════════════════════

interface RakanAnalyticsProps {
  parts: Part[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  priceHistory: PriceHistory[];
  accounts: Account[];
  settings: AppSettings;
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

/** GlassCard — Liquid Compact */
function GlassCard({ children, className = "", title, icon: Icon, action }: {
  children: React.ReactNode; className?: string; title?: string;
  icon?: React.ElementType; action?: React.ReactNode;
}) {
  return (
    <div className={`glass-liquid rounded-xl transition-all duration-500 hover:shadow-2xl hover:border-amber-500/20 ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            {Icon && <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center"><Icon className="w-3 h-3 text-amber-400" /></div>}
            {title && <h3 className="font-bold text-slate-100 text-xs">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

/** SectionTitle — Liquid Compact */
function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-slate-100">{title}</h2>
        {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Tab button — Liquid Compact */
function TabBtn({ label, icon: Icon, active, onClick }: { label: string; icon: React.ElementType; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
      active ? "liquid-btn text-white shadow-md" : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-white/5"
    }`}>
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {label}
    </button>
  );
}

/** ProgressList — Sorted text list with mini bars (replaces DonutChart) */
function ProgressList({ data, totalLabel }: { data: { name: string; value: number }[]; totalLabel?: string }) {
  if (data.length === 0 || data.every(d => d.value === 0)) return <div className="text-center py-8 text-sm text-slate-500">لا توجد بيانات</div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
      {sorted.map((d, i) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">{d.name}</span>
              <span className="text-slate-400">{fmt(d.value)} <span className="text-slate-500">({pct.toFixed(0)}%)</span></span>
            </div>
            <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        );
      })}
      <div className="pt-1.5 border-t border-white/5 text-center">
        <span className="text-[10px] text-slate-500">{totalLabel || "الإجمالي"}: </span>
        <span className="text-[11px] text-slate-300 font-bold">{fmt(total)}</span>
      </div>
    </div>
  );
}

/** ComparisonCards — Day cards with arrows + summary (replaces BarChartHTML) */
function ComparisonCards({ data, title }: { data: { label: string; value: number; color?: string }[]; title?: string }) {
  if (data.length === 0) return <div className="text-center py-8 text-sm text-slate-500">لا توجد بيانات</div>;

  const maxItem = data.reduce((m, d) => d.value > m.value ? d : m, data[0]);
  const minItem = data.reduce((m, d) => d.value < m.value ? d : m, data[0]);

  return (
    <div className="space-y-3">
      {title && <p className="text-[10px] text-slate-500 text-center">{title}</p>}

      {/* Summary */}
      <div className="glass-liquid rounded-xl p-2.5 text-center">
        <p className="text-[10px] text-slate-400">
          الأعلى: <strong className="text-emerald-400">{maxItem.label}</strong> ·
          الأقل: <strong className="text-rose-400">{minItem.label}</strong>
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {data.map((d, i) => {
          const prev = i > 0 ? data[i - 1].value : d.value;
          const change = prev !== 0 ? ((d.value - prev) / Math.abs(prev)) * 100 : 0;
          const isUp = d.value >= prev;
          const isBest = d.label === maxItem.label;

          return (
            <div key={i} className={`glass-liquid rounded-xl p-2.5 text-center transition-all hover:scale-[1.02] ${isBest ? "border-emerald-500/30" : ""}`}>
              <p className="text-[9px] text-slate-500">{d.label}</p>
              <p className="text-sm font-black mt-0.5" style={{ color: d.color || "#e2e8f0" }}>{fmt(d.value)}</p>
              {i > 0 && (
                <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {isUp ? "↑" : "↓"} {Math.abs(change).toFixed(0)}%
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

/** Trend Badge */
function TrendBadge({ val, upGood }: { val: number; upGood?: boolean }) {
  const isUp = val > 0;
  const isGood = upGood !== false ? isUp : !isUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${isGood ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}{Math.abs(val).toFixed(1)}%
    </span>
  );
}

const f = (n: number) => `${fmt(n)} ر.س`;

export default function RakanAnalytics({ parts, invoices, purchases, expenses, priceHistory }: RakanAnalyticsProps) {
  const [tab, setTab] = useState<"overview" | "smart" | "expenses" | "prices">("overview");

  // ── Computed data ──
  const rakanRevenue = useMemo(() => invoices.reduce((s, inv) => s + inv.subtotal, 0), [invoices]);
  const totalPurchases = useMemo(() => purchases.reduce((s, p) => s + p.total, 0), [purchases]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const profit = rakanRevenue - totalPurchases - totalExpenses;
  const inventoryCost = useMemo(() => parts.reduce((s, p) => s + p.stock * p.cost, 0), [parts]);
  const inventoryValue = useMemo(() => parts.reduce((s, p) => s + p.stock * p.price, 0), [parts]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

  const cmRev = useMemo(() => invoices.filter(inv => inv.date.startsWith(currentMonth)).reduce((s, inv) => s + inv.subtotal, 0), [invoices, currentMonth]);
  const pmRev = useMemo(() => invoices.filter(inv => inv.date.startsWith(prevMonth)).reduce((s, inv) => s + inv.subtotal, 0), [invoices, prevMonth]);
  const cmExp = useMemo(() => expenses.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0), [expenses, currentMonth]);
  const pmExp = useMemo(() => expenses.filter(e => e.date.startsWith(prevMonth)).reduce((s, e) => s + e.amount, 0), [expenses, prevMonth]);
  const cmProfit = cmRev - cmExp;
  const pmProfit = pmRev - pmExp;
  const revChange = pmRev > 0 ? ((cmRev - pmRev) / pmRev * 100) : 0;
  const expChange = pmExp > 0 ? ((cmExp - pmExp) / pmExp * 100) : 0;
  const profitChange = pmProfit !== 0 ? ((cmProfit - pmProfit) / Math.abs(pmProfit) * 100) : 0;

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyProfitData = useMemo(() => {
    const months = Array.from(new Set([...invoices.map(inv => inv.date.slice(0, 7)), ...expenses.map(e => e.date.slice(0, 7))])).sort();
    return months.map(m => {
      const rev = invoices.filter(inv => inv.date.startsWith(m)).reduce((s, inv) => s + inv.subtotal, 0);
      const exp = expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
      const pur = purchases.filter(pr => pr.date.startsWith(m)).reduce((s, pr) => s + pr.total, 0);
      return { month: m, revenue: rev, expenses: exp, purchases: pur, profit: rev - exp - pur };
    });
  }, [invoices, expenses, purchases]);

  const inventoryByCategory = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    parts.forEach(p => { if (!map[p.category]) map[p.category] = { count: 0, value: 0 }; map[p.category].count++; map[p.category].value += p.stock * p.cost; });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [parts]);

  const backorders = useMemo(() => parts.filter(p => p.stock === 0).slice(0, 10), [parts]);
  const soldPartIds = useMemo(() => new Set(invoices.flatMap(inv => inv.items.map(i => i.part_id))), [invoices]);
  const stagnantParts = useMemo(() => parts.filter(p => !soldPartIds.has(p.id) && p.stock > 0).slice(0, 10), [parts, soldPartIds]);

  const smartPricing = useMemo(() => {
    const counts: Record<string, number> = {};
    purchases.forEach(p => p.items.forEach(item => { counts[item.part_id] = (counts[item.part_id] || 0) + 1; }));
    return parts.filter(p => (counts[p.id] || 0) >= 1).slice(0, 15).map(p => {
      const margin = p.cost > 0 && p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0;
      const suggested = p.cost * 1.67;
      return { ...p, margin, suggested, changePct: p.price > 0 ? ((suggested - p.price) / p.price * 100) : 0 };
    });
  }, [parts, purchases]);

  const priceMovements = useMemo(() => {
    const changes: Record<string, any[]> = {};
    priceHistory.forEach(ph => {
      if (!changes[ph.part_id]) changes[ph.part_id] = [];
      const chg = ph.old_cost > 0 ? ((ph.new_cost - ph.old_cost) / ph.old_cost * 100) : 0;
      changes[ph.part_id].push({ partName: ph.part_name, type: ph.type, from: ph.old_cost, to: ph.new_cost, changePct: chg, source: ph.source, date: ph.date });
    });
    return Object.values(changes).flat().filter(p => Math.abs(p.changePct) > 0.1).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 15);
  }, [priceHistory]);

  // ── Overview Tab ──
  const OverviewTab = () => (
    <div className="space-y-4 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <GlassCard title="الإيرادات" icon={DollarSign}>
          <p className="text-lg sm:text-xl font-black text-slate-100">{f(rakanRevenue)}</p>
          <div className="flex items-center gap-1 mt-1"><TrendBadge val={revChange} /></div>
        </GlassCard>
        <GlassCard title="المصروفات" icon={Receipt}>
          <p className="text-lg sm:text-xl font-black text-slate-100">{f(totalExpenses)}</p>
          <div className="flex items-center gap-1 mt-1"><TrendBadge val={expChange} upGood={false} /></div>
        </GlassCard>
        <GlassCard title="صافي الربح" icon={Wallet}>
          <p className={`text-lg sm:text-xl font-black ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{f(profit)}</p>
          <div className="flex items-center gap-1 mt-1"><TrendBadge val={profitChange} /></div>
        </GlassCard>
        <GlassCard title="قيمة المخزون" icon={Boxes}>
          <p className="text-lg sm:text-xl font-black text-slate-100">{f(inventoryValue)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{parts.length} صنف · {f(inventoryCost)}</p>
        </GlassCard>
      </div>

      {/* Inventory + Backorders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard title="معمارية المخزون" icon={PieChart}>
          <ProgressList data={inventoryByCategory.map(d => ({ name: d.name, value: d.value }))} totalLabel="قيمة المخزون" />
        </GlassCard>
        <GlassCard title="نبضة المخزون" icon={AlertTriangle}>
          <div className="text-center py-4">
            <p className="text-4xl font-black text-rose-400">{fmtInt(backorders.length)}</p>
            <p className="text-xs text-slate-400 mt-1">قطعة ناقصة</p>
            {backorders.length > 0 && (
              <div className="mt-3 text-left space-y-1 max-h-32 overflow-y-auto">
                {backorders.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[10px] px-2 py-1.5 bg-rose-500/10 rounded-lg border border-rose-500/10">
                    <span className="text-slate-300 truncate">{p.name_ar}</span><span className="text-rose-400 font-bold font-mono">{p.oem}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Monthly Profit Bar Chart */}
      <GlassCard title="الربحية الشهرية" icon={BarChart3}>
        <ComparisonCards data={monthlyProfitData.slice(-6).map(m => ({ label: m.month, value: m.profit, color: m.profit >= 0 ? "#10b981" : "#ef4444" }))} title="الربحية الشهرية" />
      </GlassCard>
    </div>
  );

  // ── Smart Tab ──
  const SmartTab = () => (
    <div className="space-y-4 animate-fade-in">
      <SectionTitle icon={BrainCircuit} title="التحليل الذكي" subtitle="تسعير وتوصيات" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard title="تسعير ذكي" icon={Sparkles}>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {smartPricing.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between text-[10px] sm:text-xs px-2 py-2 bg-slate-800/30 rounded-lg">
                <div className="flex-1 min-w-0"><p className="font-bold text-slate-200 truncate">{p.name_ar}</p><p className="text-slate-500">هامش {p.margin.toFixed(0)}%</p></div>
                <div className="text-left mr-2"><p className="text-slate-400">{f(p.price)} → <span className="text-amber-400 font-bold">{f(p.suggested)}</span></p></div>
              </div>
            ))}
            {smartPricing.length === 0 && <p className="text-center text-slate-500 py-4 text-xs">لا توجد بيانات كافية</p>}
          </div>
        </GlassCard>
        <GlassCard title="قطع رااكدة" icon={AlertCircle}>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {stagnantParts.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between text-[10px] sm:text-xs px-2 py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <span className="text-slate-300 truncate">{p.name_ar}</span><span className="text-amber-400 font-bold">{p.stock}</span>
              </div>
            ))}
            {stagnantParts.length === 0 && <p className="text-center text-slate-500 py-4 text-xs">لا توجد قطع راكدة</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );

  // ── Expenses Tab ──
  const ExpensesTab = () => (
    <div className="space-y-4 animate-fade-in">
      <SectionTitle icon={CreditCard} title="تحليل المصروفات" subtitle="تفصيل المصاريف" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard title="حسب الفئة" icon={PieChart}>
          <ProgressList data={expensesByCategory} totalLabel="إجمالي المصروفات" />
        </GlassCard>
        <GlassCard title="شهرياً" icon={BarChart3}>
          <ComparisonCards data={monthlyProfitData.slice(-6).map(m => ({ label: m.month, value: m.expenses, color: "#f59e0b" }))} title="المصروفات الشهرية" />
        </GlassCard>
      </div>
    </div>
  );

  // ── Prices Tab ──
  const PricesTab = () => (
    <div className="space-y-4 animate-fade-in">
      <SectionTitle icon={Tag} title="تحليل الأسعار" subtitle="حركات التسعير" />
      <GlassCard title="حركات التسعير" icon={History}>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {priceMovements.slice(0, 12).map((pm, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] sm:text-xs px-2 py-2 bg-slate-800/30 rounded-lg">
              <div className="flex-1 min-w-0"><p className="font-bold text-slate-200 truncate">{pm.partName}</p><p className="text-slate-500">{pm.source}</p></div>
              <div className="text-left mr-2">
                <p className="text-slate-400">{fmt(pm.from)} → {fmt(pm.to)}</p>
                <p className={`font-bold ${pm.changePct > 0 ? "text-emerald-400" : "text-rose-400"}`}>{pm.changePct > 0 ? "+" : ""}{pm.changePct.toFixed(0)}%</p>
              </div>
            </div>
          ))}
          {priceMovements.length === 0 && <p className="text-center text-slate-500 py-4 text-xs">لا توجد حركات سعر</p>}
        </div>
      </GlassCard>
    </div>
  );

  // ── Main Render ──
  return (
    <div className="space-y-3" dir="rtl">
      <SectionTitle icon={LayoutDashboard} title="تحليلات راكان" subtitle="تحليلات مالية متكاملة" />

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <TabBtn label="نظرة عامة" icon={BarChart3} active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabBtn label="ذكي" icon={BrainCircuit} active={tab === "smart"} onClick={() => setTab("smart")} />
        <TabBtn label="مصروفات" icon={CreditCard} active={tab === "expenses"} onClick={() => setTab("expenses")} />
        <TabBtn label="أسعار" icon={Tag} active={tab === "prices"} onClick={() => setTab("prices")} />
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "smart" && <SmartTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "prices" && <PricesTab />}
    </div>
  );
}
