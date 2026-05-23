import { useState, useMemo } from "react";
import {
  Droplets, Plus, Pencil, Trash2, X, Search, Car,
  AlertTriangle, CheckCircle2, Clock, Wrench,
} from "lucide-react";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
export interface LiquidType {
  id: string;
  name: string;
  category: string;
  brand: string;
  capacity: number;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  location: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  owner: string;
  phone: string;
  currentKm: number;
  lastOilChangeKm: number;
  lastOilChangeDate: string;
  oilType: string;
  notes: string;
}

export interface LiquidTransaction {
  id: string;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
  liquidId: string;
  liquidName: string;
  category: string;
  qty: number;
  price: number;
  total: number;
  kmAtService: number;
  worker: string;
  notes: string;
}

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n: number) {
  return n.toLocaleString("ar-SA");
}
function today() {
  return new Date().toLocaleDateString("ar-SA");
}
function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 5)}`;
}

// ═══════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════
export const SEED_LIQUIDS: LiquidType[] = [
  { id: "LQ-001", name: "زيت محرك 5W-30 fully synthetic", category: "زيت محرك", brand: "Shell Helix Ultra", capacity: 4, stock: 24, minStock: 6, cost: 45, price: 65, location: "رف A1" },
  { id: "LQ-002", name: "زيت محرك 10W-40 semi synthetic", category: "زيت محرك", brand: "Castrol GTX", capacity: 4, stock: 18, minStock: 5, cost: 35, price: 50, location: "رف A2" },
  { id: "LQ-003", name: "زيت محرك 0W-20 fully synthetic", category: "زيت محرك", brand: "Mobil 1", capacity: 4, stock: 12, minStock: 4, cost: 55, price: 80, location: "رف A3" },
  { id: "LQ-004", name: "زيت جير أوتوماتيك ATF", category: "زيت جير", brand: "Toyota ATF-WS", capacity: 1, stock: 15, minStock: 5, cost: 25, price: 40, location: "رف B1" },
  { id: "LQ-005", name: "زيت جير أوتوماتيك CVT", category: "زيت جير", brand: "Nissan NS-3", capacity: 1, stock: 10, minStock: 3, cost: 30, price: 48, location: "رف B2" },
  { id: "LQ-006", name: "سائل فرامل DOT4", category: "سائل فرامل", brand: "Bosch", capacity: 0.5, stock: 30, minStock: 8, cost: 12, price: 20, location: "رف C1" },
  { id: "LQ-007", name: "ماء راديتر أحمر concentrate", category: "تبريد", brand: "Prestone", capacity: 4, stock: 20, minStock: 6, cost: 30, price: 45, location: "رف C2" },
  { id: "LQ-008", name: "غاز تكييف R-134a", category: "تكييف", brand: "Dupont", capacity: 0.5, stock: 8, minStock: 3, cost: 20, price: 35, location: "رف D1" },
  { id: "LQ-009", name: "زيت دفرنس 80W-90", category: "زيت دفرنس", brand: "Mobil", capacity: 1, stock: 14, minStock: 4, cost: 28, price: 42, location: "رف B3" },
  { id: "LQ-010", name: "سائل غسيل زجاج", category: "غسيل", brand: "Sonax", capacity: 4, stock: 16, minStock: 4, cost: 15, price: 25, location: "رف E1" },
];

export const SEED_VEHICLES: Vehicle[] = [
  { id: "VH-001", plate: "أ ب ت 1234", make: "Toyota", model: "Camry", year: 2020, owner: "أحمد محمد", phone: "0501234567", currentKm: 45000, lastOilChangeKm: 40000, lastOilChangeDate: "2026-03-15", oilType: "LQ-001", notes: "" },
  { id: "VH-002", plate: "ب ج د 5678", make: "Nissan", model: "Patrol", year: 2022, owner: "خالد العتيبي", phone: "0559876543", currentKm: 28000, lastOilChangeKm: 25000, lastOilChangeDate: "2026-02-20", oilType: "LQ-003", notes: "" },
  { id: "VH-003", plate: "ج ح خ 9012", make: "Hyundai", model: "Sonata", year: 2019, owner: "سالم الزهراني", phone: "0561112233", currentKm: 78000, lastOilChangeKm: 75000, lastOilChangeDate: "2026-01-10", oilType: "LQ-002", notes: "" },
  { id: "VH-004", plate: "د ذ ر 3456", make: "Lexus", model: "LX570", year: 2023, owner: "فهد القحطاني", phone: "0573344556", currentKm: 15000, lastOilChangeKm: 10000, lastOilChangeDate: "2026-04-01", oilType: "LQ-001", notes: "" },
  { id: "VH-005", plate: "ز س ش 7890", make: "Toyota", model: "Hilux", year: 2021, owner: "مطلق السبيعي", phone: "0587766554", currentKm: 62000, lastOilChangeKm: 58000, lastOilChangeDate: "2026-04-20", oilType: "LQ-002", notes: "" },
];

export const SEED_LIQUID_TXNS: LiquidTransaction[] = [
  { id: "LX-001", date: "2026-04-20", vehicleId: "VH-005", vehiclePlate: "ز س ش 7890", liquidId: "LQ-002", liquidName: "زيت محرك 10W-40 semi synthetic", category: "زيت محرك", qty: 2, price: 50, total: 100, kmAtService: 58000, worker: "فني أحمد", notes: "تغيير دوري" },
  { id: "LX-002", date: "2026-04-15", vehicleId: "VH-001", vehiclePlate: "أ ب ت 1234", liquidId: "LQ-001", liquidName: "زيت محرك 5W-30 fully synthetic", category: "زيت محرك", qty: 1, price: 65, total: 65, kmAtService: 42000, worker: "فني خالد", notes: "" },
  { id: "LX-003", date: "2026-04-10", vehicleId: "VH-002", vehiclePlate: "ب ج د 5678", liquidId: "LQ-005", liquidName: "زيت جير أوتوماتيك CVT", category: "زيت جير", qty: 8, price: 48, total: 384, kmAtService: 26000, worker: "فني أحمد", notes: "تغيير زيت جير" },
  { id: "LX-004", date: "2026-04-05", vehicleId: "VH-003", vehiclePlate: "ج ح خ 9012", liquidId: "LQ-007", liquidName: "ماء راديتر أحمر concentrate", category: "تبريد", qty: 1, price: 45, total: 45, kmAtService: 76000, worker: "فني سامي", notes: "تبديل تبريد" },
  { id: "LX-005", date: "2026-03-28", vehicleId: "VH-004", vehiclePlate: "د ذ ر 3456", liquidId: "LQ-006", liquidName: "سائل فرامل DOT4", category: "سائل فرامل", qty: 2, price: 20, total: 40, kmAtService: 12000, worker: "فني خالد", notes: "صيانة فرامل" },
];

const CATEGORIES = ["زيت محرك", "زيت جير", "زيت دفرنس", "سائل فرامل", "تبريد", "تكييف", "غسيل"];
const OIL_INTERVAL_KM = 5000;

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
interface Props {
  liquids: LiquidType[];
  setLiquids: React.Dispatch<React.SetStateAction<LiquidType[]>>;
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  transactions: LiquidTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<LiquidTransaction[]>>;
  onAddToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function LiquidSystem({ liquids, setLiquids, vehicles, setVehicles, transactions, setTransactions, onAddToast }: Props) {
  const [tab, setTab] = useState<"stock" | "dispense" | "history" | "vehicles" | "alerts">("stock");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);

  // ── Dispense form state ──
  const [selVehicle, setSelVehicle] = useState("");
  const [selLiquid, setSelLiquid] = useState("");
  const [dispQty, setDispQty] = useState(1);
  const [dispKm, setDispKm] = useState("");
  const [dispWorker, setDispWorker] = useState("");
  const [dispNotes, setDispNotes] = useState("");

  const lowStock = useMemo(() => liquids.filter((l) => l.stock <= l.minStock), [liquids]);

  const filteredLiquids = useMemo(() => {
    return liquids.filter((l) => {
      const matchSearch = !search || l.name.includes(search) || l.brand.includes(search) || l.id.includes(search);
      const matchCat = catFilter === "الكل" || l.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [liquids, search, catFilter]);

  const vehicleAlerts = useMemo(() => {
    return vehicles.map((v) => {
      const kmSinceChange = v.currentKm - v.lastOilChangeKm;
      const daysSinceChange = Math.floor((new Date(today()).getTime() - new Date(v.lastOilChangeDate).getTime()) / (1000 * 60 * 60 * 24));
      const needsChange = kmSinceChange >= OIL_INTERVAL_KM || daysSinceChange >= 90;
      const overdueKm = Math.max(0, kmSinceChange - OIL_INTERVAL_KM);
      return { ...v, kmSinceChange, daysSinceChange, needsChange, overdueKm };
    }).filter((v) => v.needsChange);
  }, [vehicles]);

  const totalSalesValue = useMemo(() => transactions.reduce((s, t) => s + t.total, 0), [transactions]);

  const handleDispense = () => {
    if (!selVehicle || !selLiquid) { onAddToast("اختر المركبة والسائل", "error"); return; }
    const v = vehicles.find((x) => x.id === selVehicle);
    const l = liquids.find((x) => x.id === selLiquid);
    if (!v || !l) return;
    if (l.stock < dispQty) { onAddToast(`المخزون لا يكفي! متوفر: ${l.stock}`, "error"); return; }

    const txn: LiquidTransaction = {
      id: newId("LX"),
      date: today(),
      vehicleId: v.id, vehiclePlate: v.plate,
      liquidId: l.id, liquidName: l.name, category: l.category,
      qty: dispQty, price: l.price, total: l.price * dispQty,
      kmAtService: Number(dispKm) || v.currentKm,
      worker: dispWorker || "غير محدد", notes: dispNotes,
    };
    setTransactions((prev) => [txn, ...prev]);
    setLiquids((prev) => prev.map((x) => x.id === l.id ? { ...x, stock: x.stock - dispQty } : x));
    setVehicles((prev) => prev.map((x) => x.id === v.id ? { ...x, lastOilChangeKm: Number(dispKm) || v.currentKm, lastOilChangeDate: today(), oilType: l.id } : x));
    onAddToast(`تم صرف ${l.name} ×${dispQty} للمركبة ${v.plate}`, "success");
    setSelVehicle(""); setSelLiquid(""); setDispQty(1); setDispKm(""); setDispWorker(""); setDispNotes("");
  };

  const handleDeleteLiquid = (id: string) => {
    if (transactions.some((t) => t.liquidId === id)) { onAddToast("لا يمكن الحذف - يوجد عمليات صرف مرتبطة", "error"); return; }
    setLiquids((prev) => prev.filter((l) => l.id !== id));
    onAddToast("تم حذف السائل", "success");
  };

  // ═══ RENDER ═══
  return (
    <div className="space-y-4" dir="rtl">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1"><Droplets className="w-4 h-4" /><span className="text-xs font-bold opacity-80">السوائل</span></div>
          <p className="text-xl font-black">{fmtInt(liquids.length)}</p><p className="text-[10px] opacity-80">نوع سائل</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1"><Car className="w-4 h-4" /><span className="text-xs font-bold opacity-80">المركبات</span></div>
          <p className="text-xl font-black">{fmtInt(vehicles.length)}</p><p className="text-[10px] opacity-80">مركبة مسجلة</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4" /><span className="text-xs font-bold opacity-80">إجمالي الصرف</span></div>
          <p className="text-xl font-black">{fmt(totalSalesValue)}</p><p className="text-[10px] opacity-80">ر.س</p>
        </div>
        <div className={`rounded-xl p-3 text-white shadow-lg ${lowStock.length > 0 ? "bg-gradient-to-br from-rose-500 to-rose-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-xs font-bold opacity-80">منخفض المخزون</span></div>
          <p className="text-xl font-black">{fmtInt(lowStock.length)}</p><p className="text-[10px] opacity-80">سائل يحتاج تعبئة</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
        {[
          { key: "stock" as const, label: "مخزون السوائل", icon: Droplets },
          { key: "dispense" as const, label: "صرف سائل", icon: Wrench },
          { key: "history" as const, label: "تاريخ الصرف", icon: Clock },
          { key: "vehicles" as const, label: "المركبات", icon: Car },
          { key: "alerts" as const, label: "تنبيهات الصيانة", icon: AlertTriangle },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? "bg-blue-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: STOCK ── */}
      {tab === "stock" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البراند أو الرقم..."
                  className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition-colors" />
              </div>
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400">
              <option value="الكل">كل الأنواع</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setModal({ type: "liquid" })}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> سائل جديد
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLiquids.map((l) => {
              const isLow = l.stock <= l.minStock;
              const percent = Math.min(100, (l.stock / (l.minStock * 4)) * 100);
              return (
                <div key={l.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${isLow ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-[10px] text-slate-400">{l.id}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ type: "liquid", data: l })} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"><Pencil className="w-3 h-3 text-slate-600" /></button>
                      <button onClick={() => handleDeleteLiquid(l.id)} className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center hover:bg-rose-100"><Trash2 className="w-3 h-3 text-rose-500" /></button>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 mb-1">{l.name}</h4>
                  <p className="text-xs text-slate-500 mb-2">{l.brand} · {l.capacity}L · {l.location}</p>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500">المخزون: <strong className={isLow ? "text-rose-600" : "text-emerald-600"}>{l.stock}</strong> / {l.minStock} حد أدنى</span>
                    <span className="font-bold text-amber-600">{fmt(l.price)} ر.س</span>
                  </div>
                  {/* Stock bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isLow ? "bg-rose-500" : percent > 75 ? "bg-emerald-500" : percent > 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {filteredLiquids.length === 0 && <div className="text-center text-slate-400 py-12">لا توجد نتائج</div>}
        </div>
      )}

      {/* ── TAB: DISPENSE ── */}
      {tab === "dispense" && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-500" /> صرف سائل جديد</h3>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">المركبة</label>
              <select value={selVehicle} onChange={(e) => setSelVehicle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400">
                <option value="">اختر المركبة...</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model} — {v.owner}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">نوع السائل</label>
              <select value={selLiquid} onChange={(e) => setSelLiquid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400">
                <option value="">اختر السائل...</option>
                {liquids.filter((l) => l.stock > 0).map((l) => <option key={l.id} value={l.id}>{l.name} — مخزون: {l.stock} — {fmt(l.price)} ر.س</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الكمية (علبة)</label>
                <input type="number" min={1} value={dispQty} onChange={(e) => setDispQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">عداد المركبة (كم)</label>
                <input type="number" value={dispKm} onChange={(e) => setDispKm(e.target.value)} placeholder={selVehicle ? String(vehicles.find((v) => v.id === selVehicle)?.currentKm || "") : ""}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الفني</label>
              <input type="text" value={dispWorker} onChange={(e) => setDispWorker(e.target.value)} placeholder="اسم الفني..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات</label>
              <textarea value={dispNotes} onChange={(e) => setDispNotes(e.target.value)} rows={2} placeholder="أي ملاحظات..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            </div>

            {/* Preview */}
            {selVehicle && selLiquid && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                <p className="font-bold text-blue-800 mb-1">معاينة:</p>
                <p className="text-blue-600">{vehicles.find((v) => v.id === selVehicle)?.plate} ← {liquids.find((l) => l.id === selLiquid)?.name} ×{dispQty} = {fmt((liquids.find((l) => l.id === selLiquid)?.price || 0) * dispQty)} ر.س</p>
              </div>
            )}

            <button onClick={handleDispense} disabled={!selVehicle || !selLiquid}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm transition-colors">
              تأكيد الصرف
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center text-slate-400 py-12">لا يوجد سجل صرف</div>
          ) : (
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-500">التاريخ</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-500">المركبة</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-500">السائل</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-slate-500">الكمية</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-slate-500">العداد</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-slate-500">السعر</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">الإجمالي</th>
                </tr></thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-600">{t.date}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{t.vehiclePlate}</td>
                      <td className="px-3 py-2.5"><span className="text-xs text-slate-500">{t.category}</span><br/><span className="font-medium text-slate-700">{t.liquidName}</span></td>
                      <td className="px-3 py-2.5 text-center font-bold">{t.qty}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{fmtInt(t.kmAtService)}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{fmt(t.price)}</td>
                      <td className="px-3 py-2.5 text-left font-bold text-blue-600">{fmt(t.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex justify-between mb-1"><span className="font-mono text-[10px] text-slate-400">{t.id}</span><span className="text-xs text-slate-500">{t.date}</span></div>
                <p className="font-bold text-sm text-slate-800">{t.vehiclePlate}</p>
                <p className="text-xs text-slate-600">{t.liquidName} ×{t.qty}</p>
                <div className="flex justify-between mt-1"><span className="text-xs text-slate-400">{fmtInt(t.kmAtService)} كم</span><span className="font-bold text-blue-600">{fmt(t.total)}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: VEHICLES ── */}
      {tab === "vehicles" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setModal({ type: "vehicle" })}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> مركبة جديدة
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map((v) => {
              const kmSince = v.currentKm - v.lastOilChangeKm;
              const needsOil = kmSince >= OIL_INTERVAL_KM;
              return (
                <div key={v.id} className={`rounded-xl border p-4 ${needsOil ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{v.plate}</h4>
                      <p className="text-xs text-slate-500">{v.make} {v.model} {v.year}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ type: "vehicle", data: v })} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"><Pencil className="w-3 h-3 text-slate-600" /></button>
                    </div>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <p>المالك: {v.owner} · {v.phone}</p>
                    <p>العداد: {fmtInt(v.currentKm)} كم</p>
                    <p>آخر تغيير زيت: {v.lastOilChangeDate} ({fmtInt(kmSince)} كم مضت)</p>
                    <p>نوع الزيت: {liquids.find((l) => l.id === v.oilType)?.name || "غير محدد"}</p>
                  </div>
                  {needsOil && (
                    <div className="mt-2 px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> يحتاج تغيير زيت! (تجاوز {OIL_INTERVAL_KM} كم)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: ALERTS ── */}
      {tab === "alerts" && (
        <div className="space-y-3">
          {vehicleAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">كل المركبات محدثة!</p>
              <p className="text-xs text-slate-400">لا يوجد مركبات تحتاج تغيير سائل</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-amber-600 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {vehicleAlerts.length} مركبة تحتاج صيانة دورية
              </p>
              {vehicleAlerts.map((v) => (
                <div key={v.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-amber-800">{v.plate} — {v.make} {v.model}</h4>
                      <p className="text-xs text-amber-600">المالك: {v.owner} · {v.phone}</p>
                    </div>
                    <span className="px-2 py-1 bg-amber-200 text-amber-700 rounded-lg text-xs font-bold">{fmtInt(v.kmSinceChange)} كم</span>
                  </div>
                  <div className="mt-2 text-xs text-amber-700 space-y-1">
                    <p>آخر تغيير: {v.lastOilChangeDate} (منذ {v.daysSinceChange} يوم)</p>
                    <p>العداد الحالي: {fmtInt(v.currentKm)} كم · المطلوب: {fmtInt(v.lastOilChangeKm + OIL_INTERVAL_KM)} كم</p>
                    {v.overdueKm > 0 && <p className="font-bold text-rose-600">تجاوز بـ {fmtInt(v.overdueKm)} كم!</p>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      {modal?.type === "liquid" && (
        <LiquidModal liquid={modal.data} onSave={(l) => {
          setLiquids((prev) => {
            const idx = prev.findIndex((x) => x.id === l.id);
            if (idx >= 0) { const c = [...prev]; c[idx] = l; return c; }
            return [...prev, l];
          });
          onAddToast(modal.data ? "تم تحديث السائل" : "تم إضافة السائل", "success");
          setModal(null);
        }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "vehicle" && (
        <VehicleModal vehicle={modal.data} onSave={(v) => {
          setVehicles((prev) => {
            const idx = prev.findIndex((x) => x.id === v.id);
            if (idx >= 0) { const c = [...prev]; c[idx] = v; return c; }
            return [...prev, v];
          });
          onAddToast(modal.data ? "تم تحديث المركبة" : "تم إضافة المركبة", "success");
          setModal(null);
        }} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// LIQUID MODAL
// ═══════════════════════════════════════════
function LiquidModal({ liquid, onSave, onClose }: { liquid?: LiquidType; onSave: (l: LiquidType) => void; onClose: () => void }) {
  const [form, setForm] = useState<LiquidType>(liquid || {
    id: newId("LQ"), name: "", category: CATEGORIES[0], brand: "",
    capacity: 1, stock: 0, minStock: 5, cost: 0, price: 0, location: "",
  });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-bold text-lg">{liquid ? "تعديل سائل" : "سائل جديد"}</h3><button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">الاسم</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">النوع</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="text-xs font-bold text-slate-500">البراند</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">السعة (L)</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">المخزون</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">حد أدنى</label><input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">التكلفة</label><input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">السعر</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">الموقع</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
        </div>
        <button onClick={() => onSave(form)} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm">حفظ</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// VEHICLE MODAL
// ═══════════════════════════════════════════
function VehicleModal({ vehicle, onSave, onClose }: { vehicle?: Vehicle; onSave: (v: Vehicle) => void; onClose: () => void }) {
  const [form, setForm] = useState<Vehicle>(vehicle || {
    id: newId("VH"), plate: "", make: "", model: "", year: new Date().getFullYear(),
    owner: "", phone: "", currentKm: 0, lastOilChangeKm: 0, lastOilChangeDate: today(),
    oilType: "", notes: "",
  });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-bold text-lg">{vehicle ? "تعديل مركبة" : "مركبة جديدة"}</h3><button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">رقم اللوحة</label><input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">الماركة</label><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">الموديل</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">السنة</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-bold text-slate-500">العداد (كم)</label><input type="number" value={form.currentKm} onChange={(e) => setForm({ ...form, currentKm: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">المالك</label><input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">الهاتف</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
        </div>
        <button onClick={() => onSave(form)} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm">حفظ</button>
      </div>
    </div>
  );
}
