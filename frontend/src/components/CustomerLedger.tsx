import { useState, useMemo } from "react";
import {
  BookOpen, ArrowDownLeft, ArrowUpRight, Receipt, ShoppingCart,
  DollarSign, User, Building2, X, Save, Search, Filter
} from "lucide-react";
import type { Invoice, Purchase, Customer, Supplier, Expense } from "../data/seed";
import { fmt, today, newId } from "../lib/utils";

// ═══════════════════════════════════════════════════════════
// CUSTOMER / SUPPLIER LEDGER — سجل حركات مالية
// ═══════════════════════════════════════════════════════════

interface CustomerLedgerProps {
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  onUpdateCustomer?: (c: Customer) => void;
  onUpdateSupplier?: (s: Supplier) => void;
  onAddPayment?: (entry: LedgerEntry) => void;
}

export interface LedgerEntry {
  id: string;
  date: string;
  partyId: string;
  partyName: string;
  partyType: "customer" | "supplier";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refType: "فاتورة" | "شراء" | "دفعة" | "مصروف" | "تسوية";
  refId: string;
}

/** GlassCard */
function GlassCard({ children, className = "", title, icon: Icon, action }: {
  children: React.ReactNode; className?: string; title?: string;
  icon?: React.ElementType; action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg shadow-slate-200/40 transition-all duration-300 hover:shadow-xl ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-amber-600" />}
            {title && <h3 className="font-bold text-slate-800 text-base">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Btn */
function Btn({ children, variant = "primary", size = "md", className = "", onClick, disabled = false, icon: Icon }: {
  children?: React.ReactNode; variant?: "primary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg"; className?: string; onClick?: () => void;
  disabled?: boolean; icon?: React.ElementType;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeCls = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";
  const varCls = variant === "primary" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200/50"
    : variant === "ghost" ? "bg-transparent hover:bg-slate-100 text-slate-700"
    : variant === "danger" ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-200/50"
    : variant === "success" ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200/50"
    : "border-2 border-amber-500 text-amber-600 hover:bg-amber-50";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizeCls} ${varCls} ${className}`}>
      {Icon && <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}

/** Input */
function Input({ label, value, onChange, placeholder = "", type = "text", className = "" }: {
  label?: string; value: string | number; onChange: (v: string) => void; placeholder?: string;
  type?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-semibold text-slate-600">{label}</label>}
      <input
        type={type} value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all w-full"
      />
    </div>
  );
}

/** RefIcon */
function RefIcon({ type }: { type: string }) {
  if (type === "فاتورة") return <Receipt className="w-3.5 h-3.5 text-sky-600" />;
  if (type === "شراء") return <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />;
  if (type === "دفعة" || type === "تسوية") return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
  return <ArrowDownLeft className="w-3.5 h-3.5 text-slate-500" />;
}

export default function CustomerLedger({
  invoices, purchases, customers, suppliers, onUpdateCustomer, onUpdateSupplier
}: CustomerLedgerProps) {
  const [partyFilter, setPartyFilter] = useState<"all" | "customer" | "supplier">("all");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDirection, setPaymentDirection] = useState<"receive" | "pay">("receive");
  const [extraEntries, setExtraEntries] = useState<LedgerEntry[]>([]);

  // Build unified party list
  const allParties = useMemo(() => {
    const c = customers.map(c => ({ id: c.id, name: c.name, type: "customer" as const, balance: c.balance, phone: c.phone }));
    const s = suppliers.map(sp => ({ id: sp.id, name: sp.name, type: "supplier" as const, balance: sp.balance, phone: sp.phone }));
    if (partyFilter === "customer") return c;
    if (partyFilter === "supplier") return s;
    return [...c, ...s];
  }, [customers, suppliers, partyFilter]);

  // Build ledger entries for selected party
  const partyEntries = useMemo(() => {
    if (!selectedPartyId) return [];
    const selectedParty = allParties.find(p => p.id === selectedPartyId);
    if (!selectedParty) return [];

    const entries: LedgerEntry[] = [];

    if (selectedParty.type === "customer") {
      // Invoices for this customer
      invoices
        .filter(inv => inv.customer === selectedParty.name)
        .forEach(inv => {
          entries.push({
            id: inv.id, date: inv.date, partyId: selectedParty.id,
            partyName: selectedParty.name, partyType: "customer",
            description: `فاتورة مبيعات - ${inv.items.length} صنف (${inv.payment})`,
            debit: inv.total, credit: 0, balance: 0,
            refType: "فاتورة", refId: inv.id
          });
        });
    } else {
      // Purchases for this supplier
      purchases
        .filter(pur => pur.supplier === selectedParty.id)
        .forEach(pur => {
          entries.push({
            id: pur.id, date: pur.date, partyId: selectedParty.id,
            partyName: selectedParty.name, partyType: "supplier",
            description: `أمر شراء - ${pur.items.length} صنف`,
            debit: 0, credit: pur.total, balance: 0,
            refType: "شراء", refId: pur.id
          });
        });
    }

    // Add manual payment entries
    extraEntries
      .filter(e => e.partyId === selectedPartyId)
      .forEach(e => entries.push(e));

    // Sort by date (newest first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compute running balance (chronological from oldest)
    const chronological = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = 0;
    chronological.forEach(e => {
      if (selectedParty.type === "customer") {
        runningBalance += e.debit - e.credit;
      } else {
        runningBalance += e.credit - e.debit;
      }
      e.balance = runningBalance;
    });

    // Return newest first
    return entries;
  }, [selectedPartyId, invoices, purchases, extraEntries, allParties]);

  // Filter parties by search
  const filteredParties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allParties;
    return allParties.filter(p => p.name.toLowerCase().includes(q) || p.phone?.includes(q));
  }, [allParties, search]);

  const selectedParty = allParties.find(p => p.id === selectedPartyId);
  const currentBalance = partyEntries.length > 0 ? partyEntries[0].balance : (selectedParty?.balance || 0);

  const handlePayment = () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0 || !selectedParty) return;

    const isCustomer = selectedParty.type === "customer";
    const entry: LedgerEntry = {
      id: newId("PMT"),
      date: today(),
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyType: isCustomer ? "customer" : "supplier",
      description: paymentDirection === "receive"
        ? `تسوية - استلام دفعة${paymentNote ? ": " + paymentNote : ""}`
        : `تسوية - دفع مبلغ${paymentNote ? ": " + paymentNote : ""}`,
      debit: isCustomer ? (paymentDirection === "receive" ? 0 : amount) : (paymentDirection === "pay" ? 0 : amount),
      credit: isCustomer ? (paymentDirection === "receive" ? amount : 0) : (paymentDirection === "pay" ? amount : 0),
      balance: 0,
      refType: "تسوية",
      refId: "",
    };

    setExtraEntries(prev => [...prev, entry]);

    // Update customer/supplier balance
    if (isCustomer && onUpdateCustomer) {
      const customer = customers.find(c => c.id === selectedParty.id);
      if (customer) {
        const newBalance = paymentDirection === "receive"
          ? Math.max(0, customer.balance - amount)
          : customer.balance + amount;
        onUpdateCustomer({ ...customer, balance: newBalance });
      }
    } else if (!isCustomer && onUpdateSupplier) {
      const supplier = suppliers.find(s => s.id === selectedParty.id);
      if (supplier) {
        const newBalance = paymentDirection === "pay"
          ? Math.max(0, supplier.balance - amount)
          : supplier.balance + amount;
        onUpdateSupplier({ ...supplier, balance: newBalance });
      }
    }

    setPaymentAmount("");
    setPaymentNote("");
    setShowPaymentModal(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
          <BookOpen className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">سجل الحركات المالية</h2>
          <p className="text-xs text-slate-500">كشف حساب العملاء والموردين مع إمكانية التسوية</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button onClick={() => { setPartyFilter("all"); setSelectedPartyId(""); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${partyFilter === "all" ? "bg-amber-500 text-white shadow-md" : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200"}`}>
          الكل
        </button>
        <button onClick={() => { setPartyFilter("customer"); setSelectedPartyId(""); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${partyFilter === "customer" ? "bg-sky-500 text-white shadow-md" : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200"}`}>
          <User className="w-3.5 h-3.5" /> العملاء
        </button>
        <button onClick={() => { setPartyFilter("supplier"); setSelectedPartyId(""); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${partyFilter === "supplier" ? "bg-emerald-500 text-white shadow-md" : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200"}`}>
          <Building2 className="w-3.5 h-3.5" /> الموردين
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PARTY LIST */}
        <div className="lg:col-span-1">
          <GlassCard title="اختر طرف" icon={Filter}
            action={<span className="text-xs text-slate-400">{filteredParties.length} طرف</span>}>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف..."
                  className="w-full pr-10 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {filteredParties.map(p => {
                const isSelected = selectedPartyId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartyId(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all ${isSelected
                      ? p.type === "customer" ? "bg-sky-50 border border-sky-200" : "bg-emerald-50 border border-emerald-200"
                      : "hover:bg-slate-50 border border-transparent"
                      }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${p.type === "customer" ? "bg-sky-100" : "bg-emerald-100"}`}>
                      {p.type === "customer" ? <User className="w-4 h-4 text-sky-600" /> : <Building2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.phone}</p>
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-bold ${(p.balance || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {fmt(p.balance || 0)}
                      </p>
                    </div>
                  </button>
                );
              })}
              {filteredParties.length === 0 && (
                <p className="text-center text-slate-400 py-8 text-sm">لا يوجد نتائج</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* LEDGER */}
        <div className="lg:col-span-2 space-y-4">
          {selectedParty ? (
            <>
              {/* Party Header */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-5 transition-all hover:shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${selectedParty.type === "customer" ? "bg-sky-100" : "bg-emerald-100"}`}>
                      {selectedParty.type === "customer" ? <User className="w-5 h-5 text-sky-600" /> : <Building2 className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{selectedParty.name}</h3>
                      <p className="text-xs text-slate-400">{selectedParty.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl text-center ${currentBalance > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
                      <p className="text-xs text-slate-500">{selectedParty.type === "customer" ? "المبلغ المستحق" : "المبلغ المستحق للمورد"}</p>
                      <p className={`text-lg font-extrabold ${currentBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{fmt(Math.abs(currentBalance))}</p>
                    </div>
                    <Btn onClick={() => setShowPaymentModal(true)} icon={DollarSign} size="sm">
                      تسوية
                    </Btn>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <GlassCard title="الحركات" icon={BookOpen}
                action={<span className="text-xs text-slate-400">{partyEntries.length} عملية</span>}>
                {partyEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs">التاريخ</th>
                          <th className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs">النوع</th>
                          <th className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs">الوصف</th>
                          <th className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs">مدين</th>
                          <th className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs">دائن</th>
                          <th className="px-3 py-2.5 text-right font-bold text-slate-600 text-xs">الرصيد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partyEntries.map((entry, idx) => (
                          <tr key={`${entry.id}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">{entry.date}</td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                                <RefIcon type={entry.refType} /> {entry.refType}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 text-xs max-w-[200px] truncate">{entry.description}</td>
                            <td className="px-3 py-2.5">
                              {entry.debit > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                                  <ArrowUpRight className="w-3 h-3" /> {fmt(entry.debit)}
                                </span>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              {entry.credit > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                  <ArrowDownLeft className="w-3 h-3" /> {fmt(entry.credit)}
                                </span>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`text-xs font-bold ${entry.balance > 0 ? "text-amber-700" : entry.balance < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                {fmt(Math.abs(entry.balance))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد حركات مسجلة</p>
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-bold text-slate-600 mb-2">اختر طرفاً لعرض سجله</p>
              <p className="text-sm text-slate-400">اختر عميل أو مورد من القائمة لعرض كشف حسابه</p>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">تسوية - {selectedParty.name}</h2>
              <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Direction Toggle */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
                <button
                  onClick={() => setPaymentDirection("receive")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentDirection === "receive" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                >
                  {selectedParty.type === "customer" ? "استلام" : "استلام من المورد"}
                </button>
                <button
                  onClick={() => setPaymentDirection("pay")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentDirection === "pay" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                >
                  {selectedParty.type === "customer" ? "دفع للعميل" : "دفع"}
                </button>
              </div>

              <Input
                label="المبلغ"
                value={paymentAmount}
                onChange={setPaymentAmount}
                type="number"
                placeholder="0.00"
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">ملاحظة (اختياري)</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="مثال: دفعة نقدية..."
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all w-full resize-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setShowPaymentModal(false)}>إلغاء</Btn>
              <Btn onClick={handlePayment} disabled={!paymentAmount || Number(paymentAmount) <= 0} icon={Save}>
                حفظ
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
