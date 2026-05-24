// TransactionsCards.tsx — cards-based replacement for the old table TransactionsView.
// Pulled from update zip (transactions_cards.tsx) and parameterized for prop-driven use.
import { useState, useMemo } from "react";
import {
  Search, ShoppingCart, Receipt, ClipboardList, TrendingUp, TrendingDown,
  DollarSign, Pencil, Trash2, Printer, BarChart3, Building2, List,
  Calendar, Package, User, Truck, Plus,
} from "lucide-react";
import { fmt, fmtInt } from "../lib/format";

interface Purchase {
  id: string; date: string; supplier?: string; supplier_name?: string;
  items?: any[]; subtotal?: number; vat?: number; total: number; status?: string;
}
interface Expense {
  id: string; date: string; category: string; description?: string;
  amount: number; vendor?: string; payment?: string;
}

interface Props {
  purchases: Purchase[];
  expenses: Expense[];
  onDeletePurchase?: (id: string) => void;
  onDeleteExpense?: (id: string) => void;
  onEditPurchase?: (p: Purchase) => void;
  onEditExpense?: (e: Expense) => void;
  onAddExpense?: () => void;
  onAddPurchase?: () => void;
  onNavigate?: (page: string) => void;
  Btn: any;
  StatusPill: any;
}

export default function TransactionsCards({
  purchases, expenses,
  onDeletePurchase, onDeleteExpense,
  onEditPurchase, onEditExpense,
  onAddExpense, onAddPurchase,
  onNavigate,
  Btn, StatusPill,
}: Props) {
  // Internal aliases so the original transactions_cards.tsx body keeps working.
  const setModal = (m: { type: string; data?: any }) => {
    if (m.type === "expense") {
      if (m.data) onEditExpense?.(m.data);
      else onAddExpense?.();
    } else if (m.type === "purchase") {
      if (m.data) onEditPurchase?.(m.data);
      else onAddPurchase?.();
    }
  };
  const setPage = (p: string) => onNavigate?.(p);

  const handleDelete = (kind: "purchase" | "expense", id: string) => {
    if (kind === "purchase") onDeletePurchase?.(id);
    else onDeleteExpense?.(id);
  };
  // Aliases the embedded body expects:
  const handleDeletePurchase = (id: string) => onDeletePurchase?.(id);
  const handleDeleteExpense = (id: string) => onDeleteExpense?.(id);
  const handleEditPurchase = onEditPurchase || (() => {});
  const handleEditExpense = onEditExpense || (() => {});
  // Printer button — open a browser print dialog of the current view as a
  // lightweight fallback until a dedicated PDF generator lands in Phase 5.
  const setPrintInvoice = (_payload: any) => {
    try { window.print(); } catch {}
  };

    const [txTab, setTxTab] = useState<"all" | "purchases" | "expenses">("all");
    const [search, setSearch] = useState("");
    const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);

    const filteredPurchases = useMemo(() => {
      if (!search) return purchases;
      return purchases.filter((p) =>
        p.supplier?.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier_name?.toLowerCase().includes(search.toLowerCase())
      );
    }, [purchases, search]);

    const filteredExpenses = useMemo(() => {
      if (!search) return expenses;
      return expenses.filter((e) =>
        e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase())
      );
    }, [expenses, search]);

    const totalPurchasesVal = purchases.reduce((s, p) => s + p.total, 0);
    const totalExpensesVal = expenses.reduce((s, e) => s + e.amount, 0);
    const purchaseCount = purchases.length;
    const expenseCount = expenses.length;
    const avgPurchase = purchaseCount > 0 ? totalPurchasesVal / purchaseCount : 0;
    const largestInvoice = purchases.reduce((max, p) => (p.total > max.total ? p : max), purchases[0] || { total: 0 });

    /* ── month-over-month trends ── */
    const getYM = (d: string) => d?.slice(0, 7) ?? "";
    const now = new Date();
    const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const curPurchases = purchases.filter((p) => getYM(p.date) === curYM).reduce((s, p) => s + p.total, 0);
    const prevPurchases = purchases.filter((p) => getYM(p.date) === prevYM).reduce((s, p) => s + p.total, 0);
    const purchaseTrend = prevPurchases > 0 ? ((curPurchases - prevPurchases) / prevPurchases) * 100 : 0;

    const curExpenses = expenses.filter((e) => getYM(e.date) === curYM).reduce((s, e) => s + e.amount, 0);
    const prevExpenses = expenses.filter((e) => getYM(e.date) === prevYM).reduce((s, e) => s + e.amount, 0);
    const expenseTrend = prevExpenses > 0 ? ((curExpenses - prevExpenses) / prevExpenses) * 100 : 0;

    /* ── category colour helper ── */
    const categoryColors: Record<string, string> = {
      "إيجار": "bg-violet-500/15 text-violet-300 border-violet-500/25",
      "رواتب": "bg-sky-500/15 text-sky-300 border-sky-500/25",
      "مرافق": "bg-amber-500/15 text-amber-300 border-amber-500/25",
      "صيانة": "bg-orange-500/15 text-orange-300 border-orange-500/25",
      "نقل": "bg-teal-500/15 text-teal-300 border-teal-500/25",
      "تسويق": "bg-pink-500/15 text-pink-300 border-pink-500/25",
      "ضرائب": "bg-rose-500/15 text-rose-300 border-rose-500/25",
      "مستلزمات": "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
      "مصاريف إدارية": "bg-slate-500/15 text-slate-300 border-slate-500/25",
    };
    const getCategoryCls = (cat: string) => categoryColors[cat] || "bg-slate-500/15 text-slate-300 border-slate-500/25";

    return (
      <div className="space-y-4" dir="rtl">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" /> المشتريات والمصروفات
          </h2>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" onClick={() => setPage("pos")} icon={Truck}>شراء جديد</Btn>
            <Btn size="sm" onClick={() => setModal({ type: "expense" })} icon={Plus}>إضافة مصروف</Btn>
          </div>
        </div>

        {/* ═══════════════ Stats Cards Row ═══════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Total Purchases */}
          <div className="glass-liquid rounded-xl p-4 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <ShoppingCart className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              {purchaseTrend !== 0 && (
                <span className={`flex items-center gap-0.5 text-[10px] font-bold ${purchaseTrend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {purchaseTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(purchaseTrend).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-1">إجمالي المشتريات</p>
            <p className="text-base font-black text-emerald-400 leading-tight">{fmt(totalPurchasesVal)}</p>
          </div>

          {/* Total Expenses */}
          <div className="glass-liquid rounded-xl p-4 border border-rose-500/15 hover:border-rose-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 flex items-center justify-center">
                <Receipt className="w-4.5 h-4.5 text-rose-400" />
              </div>
              {expenseTrend !== 0 && (
                <span className={`flex items-center gap-0.5 text-[10px] font-bold ${expenseTrend >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {expenseTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(expenseTrend).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-1">إجمالي المصروفات</p>
            <p className="text-base font-black text-rose-400 leading-tight">{fmt(totalExpensesVal)}</p>
          </div>

          {/* Purchase Count */}
          <div className="glass-liquid rounded-xl p-4 border border-sky-500/15 hover:border-sky-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <Package className="w-4.5 h-4.5 text-sky-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-1">عدد فواتير الشراء</p>
            <p className="text-base font-black text-sky-400 leading-tight">{fmtInt(purchaseCount)}</p>
          </div>

          {/* Expense Count */}
          <div className="glass-liquid rounded-xl p-4 border border-amber-500/15 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <List className="w-4.5 h-4.5 text-amber-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-1">عدد المصروفات</p>
            <p className="text-base font-black text-amber-400 leading-tight">{fmtInt(expenseCount)}</p>
          </div>

          {/* Average Purchase */}
          <div className="glass-liquid rounded-xl p-4 border border-violet-500/15 hover:border-violet-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5 text-violet-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-1">متوسط قيمة الشراء</p>
            <p className="text-base font-black text-violet-400 leading-tight">{fmt(avgPurchase)}</p>
          </div>

          {/* Largest Invoice */}
          <div className="glass-liquid rounded-xl p-4 border border-orange-500/15 hover:border-orange-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5 text-orange-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-1">أكبر فاتورة</p>
            <p className="text-base font-black text-orange-400 leading-tight">{fmt(largestInvoice?.total || 0)}</p>
          </div>
        </div>

        {/* ═══════════════ Tabs ═══════════════ */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { key: "all" as const, label: "الكل", icon: List },
            { key: "purchases" as const, label: "المشتريات", icon: ShoppingCart },
            { key: "expenses" as const, label: "المصروفات", icon: Receipt },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTxTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                txTab === t.key
                  ? "bg-amber-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ Search ═══════════════ */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المورد، رقم الفاتورة، الوصف، الفئة..."
            className="w-full pr-10 pl-3 py-2.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* ═══════════════════════════════════════════════════════
            PURCHASE CARDS
        ═══════════════════════════════════════════════════════ */}
        {(txTab === "all" || txTab === "purchases") && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> فواتير الشراء
              </h3>
              <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                {filteredPurchases.length} فاتورة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPurchases.map((p) => (
                <div
                  key={p.id}
                  className="glass-liquid rounded-xl border border-white/10 hover:border-emerald-500/25 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md">
                          #{p.id}
                        </span>
                        <StatusPill status={p.status || "مكتمل"} />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {p.date}
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500">المورد</p>
                        <p className="text-sm font-bold text-slate-200 truncate">
                          {p.supplier_name || p.supplier || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Items count + Total row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span>{p.items?.length || 0} صنف</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500">الإجمالي</p>
                        <p className="text-lg font-black text-emerald-400">{fmt(p.total)}</p>
                      </div>
                    </div>

                    {/* VAT + Subtotal if present */}
                    {(p.vat > 0 || p.subtotal > 0) && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
                        {p.subtotal > 0 && (
                          <span className="text-slate-500">
                            قبل الضريبة: <span className="text-slate-300 font-semibold">{fmt(p.subtotal)}</span>
                          </span>
                        )}
                        {p.vat > 0 && (
                          <span className="text-slate-500">
                            الضريبة: <span className="text-amber-300 font-semibold">{fmt(p.vat)}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() =>
                          setPrintInvoice({
                            id: p.id,
                            date: p.date,
                            customer: p.supplier,
                            items: p.items.map((it: any) => ({
                              name: it.name,
                              qty: it.qty,
                              price: it.unit_price || it.price || it.cost || 0,
                              total: (it.unit_price || it.price || it.cost || 0) * it.qty,
                            })),
                            subtotal: p.subtotal || p.total,
                            vat: p.vat || 0,
                            total: p.total,
                            payment: "شراء",
                            type: "buy",
                          } as any)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold transition-colors"
                        title="طباعة"
                      >
                        <Printer className="w-3.5 h-3.5" /> طباعة
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(p.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable items list */}
                  {p.items && p.items.length > 0 && (
                    <div className="border-t border-white/5">
                      <button
                        onClick={() =>
                          setExpandedPurchase(expandedPurchase === p.id ? null : p.id)
                        }
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="font-semibold">تفاصيل الأصناف ({p.items.length})</span>
                        {expandedPurchase === p.id ? (
                          <span className="text-[10px]">▲ إخفاء</span>
                        ) : (
                          <span className="text-[10px]">▼ عرض</span>
                        )}
                      </button>
                      {expandedPurchase === p.id && (
                        <div className="px-4 pb-3 space-y-1.5">
                          {p.items.map((it: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-300 truncate">{it.name}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 mr-2">
                                <span className="text-slate-500">
                                  {it.qty}x {fmt(it.unit_price || it.price || it.cost || 0)}
                                </span>
                                <span className="font-bold text-emerald-400">
                                  {fmt((it.unit_price || it.price || it.cost || 0) * it.qty)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredPurchases.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm glass-liquid rounded-xl border border-white/10">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p>لا توجد فواتير شراء</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            EXPENSE CARDS
        ═══════════════════════════════════════════════════════ */}
        {(txTab === "all" || txTab === "expenses") && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> المصروفات
              </h3>
              <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                {filteredExpenses.length} مصروف
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredExpenses.map((e) => (
                <div
                  key={e.id}
                  className="glass-liquid rounded-xl border border-white/10 hover:border-rose-500/25 transition-all overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header: ID + Date */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md">
                        #{e.id}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {e.date}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-bold text-slate-100 mb-2 leading-relaxed">
                      {e.description}
                    </p>

                    {/* Category badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border backdrop-blur-sm ${getCategoryCls(e.category)}`}>
                        {e.category}
                      </span>
                    </div>

                    {/* Party if exists */}
                    {e.party && (
                      <div className="flex items-center gap-1.5 mb-3 text-[11px] text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{e.party}</span>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-slate-500">المبلغ</span>
                      <p className="text-lg font-black text-rose-400">{fmt(e.amount)}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() =>
                          setPrintInvoice({
                            id: e.id,
                            date: e.date,
                            customer: e.party || e.category || "مصروف",
                            items: [
                              {
                                name: e.description,
                                qty: 1,
                                price: e.amount,
                                total: e.amount,
                              },
                            ],
                            subtotal: e.amount,
                            vat: 0,
                            total: e.amount,
                            payment: "صرف",
                            type: "expense",
                          } as any)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold transition-colors"
                        title="طباعة"
                      >
                        <Printer className="w-3.5 h-3.5" /> طباعة
                      </button>
                      <button
                        onClick={() => setModal({ type: "expense", data: e })}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm glass-liquid rounded-xl border border-white/10">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p>لا توجد مصروفات</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
}
