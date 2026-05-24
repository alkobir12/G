/**
 * ═══════════════════════════════════════════════════════════════════
 *   AnalyticsDashboard.tsx — Advanced Analytics Control Panel
 *   8 Tabs: Overview, Purchases, Expenses, Price Changes, Shipping,
 *           Supplier Ledger, Price Timeline, Smart Purchase
 *   Ready for emergent.sh / React / Vite environments
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingUp, Package, DollarSign, Truck,
  ShoppingCart, CreditCard, BarChart3, PieChart, Activity,
  ArrowUpRight, ArrowDownRight, Calendar, Search,
  FileText, User, Clock,
  Receipt, Tag, Percent, Boxes, MapPin,
  CheckCircle, AlertTriangle,
  Wallet, TrendingDown as TrendingDownIcon,
  ShoppingBag, CircleDollarSign,
  Sparkles, Check, Share2,
  ChevronDown, Image, Car, Hash,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface Part { id: string; oem: string; name_ar: string; brand: string; category: string; model: string; stock: number; min_stock: number; cost: number; price: number; wholesale: number; location: string; supplier_id?: string; }
interface Supplier { id: string; name: string; contact: string; phone: string; city: string; rating: number; balance: number; }
interface PurchaseItem { part_id: string; name: string; qty: number; cost: number; }
interface Purchase { id: string; date: string; supplier: string; supplier_name: string; items: PurchaseItem[]; subtotal: number; vat: number; total: number; status: string; }
interface Expense { id: string; date: string; category: string; description: string; amount: number; account: string; }
interface PriceLog { id: string; date: string; part_id: string; part_name: string; old_cost: number; new_cost: number; old_price: number; new_price: number; reason: string; user: string; supplier_name?: string; }
interface Shipping { id: string; date: string; part_id: string; part_name: string; qty: number; cost: number; tracking: string; status: string; carrier: string; estimated_date: string; actual_date?: string; }
interface SupplierInvoice { id: string; date: string; supplier_id: string; supplier_name: string; type: "purchase" | "return" | "payment"; amount: number; items: number; status: string; notes: string; }
interface SupplierPrice { supplier_id: string; supplier_name: string; cost: number; date: string; }

interface AnalyticsDashboardProps {
  parts: Part[];
  suppliers: Supplier[];
  purchases: Purchase[];
  expenses: Expense[];
  priceLogs?: PriceLog[];
  shippingLogs?: Shipping[];
  supplierInvoices?: SupplierInvoice[];
  onNavigate?: (page: string) => void;
}

// ─── Helpers ──
const fmt = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("ar-SA");
const today = () => new Date().toISOString().slice(0, 10);

// ─── Mini charts ──
function MiniBarChart({ data, color = "#f59e0b", height = 80 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%`, background: color, minWidth: 4 }} title={v.toString()} />
      ))}
    </div>
  );
}
function MiniLineChart({ data, color = "#f59e0b", height = 80 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const w = 300, h = height;
  const points = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((v, i) => <circle key={i} cx={(i / (data.length - 1 || 1)) * w} cy={h - ((v - min) / range) * h} r="3" fill={color} />)}
    </svg>
  );
}
function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cum = 0;
  return (
    <div className="relative inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="transparent" stroke="#1e293b" strokeWidth="20" />
        {segments.map((seg, i) => {
          const start = cum; cum += seg.value;
          const dash = (seg.value / total) * 2 * Math.PI * (size / 2 - 10);
          const gap = 2 * Math.PI * (size / 2 - 10) - dash;
          const offset = -start / total * 2 * Math.PI * (size / 2 - 10) - Math.PI / 2;
          return <circle key={i} cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="transparent" stroke={seg.color} strokeWidth="20" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} />;
        })}
      </svg>
    </div>
  );
}

// ─── KPI Card ──
function KpiCard({ title, value, change, changeType, icon: Icon, color, onClick }: { title: string; value: string; change: string; changeType: "up" | "down" | "neutral"; icon: any; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`glass-liquid rounded-2xl p-4 hover:bg-white/10 transition-all ${onClick ? "cursor-pointer hover:shadow-2xl" : ""}`} title={onClick ? "انقر للانتقال" : undefined}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${changeType === "up" ? "text-emerald-400" : changeType === "down" ? "text-rose-400" : "text-slate-400"}`}>
          {changeType === "up" ? <ArrowUpRight className="w-3 h-3" /> : changeType === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
          {change}
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{title}</p>
    </div>
  );
}

// ─── Table ──
function DataTable({ headers, rows, emptyMsg = "لا توجد بيانات" }: { headers: string[]; rows: (string | number | React.ReactNode)[][]; emptyMsg?: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400 text-center py-8">{emptyMsg}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-xs">
        <thead className="bg-white/5 sticky top-0">
          <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2.5 text-right font-bold text-amber-400 border-b border-white/10 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-slate-300 whitespace-nowrap">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab Button ──
function TabBtn({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${active ? "text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`} style={active ? { background: "linear-gradient(135deg, #f59e0b, #d97706)" } : {}}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── Glass card ──
function GlassCard({ title, icon: Icon, children, className = "" }: { title: string; icon: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-liquid rounded-2xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Seed demo data
// ═══════════════════════════════════════════════════════════
function generateDemoPriceLogs(parts: Part[]): PriceLog[] {
  const logs: PriceLog[] = [];
  let id = 0;
  const reasons = ["تغيير سعر المورد", "تعديل هامش الربح", "عرض خاص الموسم", "تغيير المورد", "زيادة تكلفة الشحن"];
  const supplierNames = ["الشركة السعودية لقطع الغيار", "تويوتا العالمية", "بوش الشرق الأوسط", "ديالو العالمية", "الشركة الألمانية"];
  for (const p of parts.slice(0, 25)) {
    for (let m = 0; m < 5; m++) {
      const oldCost = p.cost * (1 + Math.random() * 0.4 - 0.2);
      const newCost = oldCost * (1 + Math.random() * 0.3 - 0.1);
      const oldPrice = p.price * (1 + Math.random() * 0.2 - 0.1);
      const newPrice = p.price * (1 + Math.random() * 0.15);
      const date = new Date(2026, 1 + m, 1 + Math.floor(Math.random() * 28)).toISOString().slice(0, 10);
      logs.push({
        id: `PL-${String(++id).padStart(4, "0")}`, date, part_id: p.id, part_name: p.name_ar,
        old_cost: Math.round(oldCost * 100) / 100, new_cost: Math.round(newCost * 100) / 100,
        old_price: Math.round(oldPrice * 100) / 100, new_price: Math.round(newPrice * 100) / 100,
        reason: reasons[m % reasons.length], user: "admin", supplier_name: supplierNames[m % supplierNames.length],
      });
    }
  }
  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

function generateMultiSupplierPrices(parts: Part[], suppliers: Supplier[]): Record<string, SupplierPrice[]> {
  const map: Record<string, SupplierPrice[]> = {};
  for (const p of parts) {
    const prices: SupplierPrice[] = [];
    for (let i = 0; i < Math.min(3, suppliers.length); i++) {
      const variation = 0.7 + Math.random() * 0.6;
      prices.push({
        supplier_id: suppliers[i].id,
        supplier_name: suppliers[i].name,
        cost: Math.round(p.cost * variation * 100) / 100,
        date: `2026-0${Math.floor(Math.random() * 4) + 1}-${Math.floor(Math.random() * 28) + 1}`,
      });
    }
    map[p.id] = prices.sort((a, b) => a.cost - b.cost);
  }
  return map;
}

function generateDemoShipping(parts: Part[]): Shipping[] {
  const carriers = ["SMSA", "Aramex", "DHL", "Naqel"];
  const statuses = ["قيد الشحن", "وصل المستودع", "تم الاستلام"];
  return parts.slice(0, 15).map((p, i) => ({
    id: `SH-${String(i + 1).padStart(4, "0")}`, date: `2026-05-${String(1 + i).padStart(2, "0")}`,
    part_id: p.id, part_name: p.name_ar, qty: Math.floor(Math.random() * 20) + 5,
    cost: Math.round((Math.random() * 500 + 100) * 100) / 100, tracking: `TRK-${Math.floor(Math.random() * 900000 + 100000)}`,
    status: statuses[i % 3], carrier: carriers[i % 4], estimated_date: `2026-05-${String(10 + i).padStart(2, "0")}`,
    actual_date: i % 3 === 2 ? `2026-05-${String(8 + i).padStart(2, "0")}` : undefined,
  }));
}

function generateDemoSupplierInvoices(purchases: Purchase[], suppliers: Supplier[]): SupplierInvoice[] {
  const invoices: SupplierInvoice[] = [];
  purchases.forEach((p, i) => {
    invoices.push({ id: p.id, date: p.date, supplier_id: p.supplier, supplier_name: p.supplier_name, type: "purchase" as const, amount: p.total, items: p.items.length, status: p.status, notes: "" });
    if (i % 3 === 0) invoices.push({ id: `RET-${p.id}`, date: p.date, supplier_id: p.supplier, supplier_name: p.supplier_name, type: "return" as const, amount: Math.round(p.total * 0.1 * 100) / 100, items: 1, status: "مكتمل", notes: "إرجاع قطع تالفة" });
  });
  suppliers.forEach((s, i) => invoices.push({ id: `PAY-${i + 1}`, date: `2026-05-${String(5 + (i % 20)).padStart(2, "0")}`, supplier_id: s.id, supplier_name: s.name, type: "payment" as const, amount: Math.floor(Math.random() * 5000 + 1000), items: 0, status: "مكتمل", notes: "دفعة مقدمة" }));
  return invoices.sort((a, b) => b.date.localeCompare(a.date));
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AnalyticsDashboard({
  parts: _parts, suppliers: _suppliers, purchases: _purchases,
  expenses: _expenses, priceLogs: _priceLogs, shippingLogs: _shippingLogs,
  supplierInvoices: _supplierInvoices, onNavigate,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");

  // Selected part for timeline + smart purchase
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});
  const [waDropdown, setWaDropdown] = useState<{supplier: string; x: number; y: number} | null>(null);
  const waBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [orderVin, setOrderVin] = useState<string>("");
  const [orderImage, setOrderImage] = useState<string>("");
  const imgAttachRef = useRef<HTMLInputElement>(null);
  const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});
  // Order builder state removed - using inline UI instead

  // Data
  const parts = _parts || [];
  const suppliers = _suppliers || [];
  const purchases = _purchases || [];
  const expenses = _expenses || [];
  const priceLogs = _priceLogs || generateDemoPriceLogs(parts);
  const shippingLogs = _shippingLogs || generateDemoShipping(parts);
  const supplierInvoices = _supplierInvoices || generateDemoSupplierInvoices(purchases, suppliers);
  const multiSupplierPrices = useMemo(() => generateMultiSupplierPrices(parts, suppliers), [parts, suppliers]);

  const filterByDate = <T extends { date: string }>(items: T[]) => items.filter((i) => i.date >= dateFrom && i.date <= dateTo);
  const filteredPurchases = filterByDate(purchases);
  const filteredExpenses = filterByDate(expenses);
  const filteredPriceLogs = filterByDate(priceLogs);

  // ─── KPIs ──
  const totalPurchases = filteredPurchases.reduce((s, p) => s + p.total, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const avgMargin = parts.length > 0 ? parts.reduce((s, p) => s + ((p.price - p.cost) / p.price * 100), 0) / parts.length : 0;
  const totalShippingCost = shippingLogs.reduce((s, sh) => s + sh.cost, 0);
  const pendingShipments = shippingLogs.filter((s) => s.status === "قيد الشحن").length;

  // ─── Charts data ──
  const purchaseByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPurchases.forEach((p) => { const m = p.date.slice(0, 7); map[m] = (map[m] || 0) + p.total; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPurchases]);
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [filteredExpenses]);
  const purchaseBySupplier = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPurchases.forEach((p) => { map[p.supplier_name] = (map[p.supplier_name] || 0) + p.total; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10);
  }, [filteredPurchases]);

  // ─── Selected supplier ledger ──
  const selectedSupplierInvoices = useMemo(() => {
    if (!selectedSupplier) return [];
    return filterByDate(supplierInvoices).filter((si) => si.supplier_id === selectedSupplier);
  }, [selectedSupplier, supplierInvoices]);
  const selectedSupplierPriceChanges = useMemo(() => {
    if (!selectedSupplier) return [];
    return filteredPriceLogs.filter((pl) => {
      const part = parts.find((p) => p.id === pl.part_id);
      return part?.supplier_id === selectedSupplier;
    });
  }, [selectedSupplier, filteredPriceLogs, parts]);

  // ─── Smart Purchase data ──
  const lowStockParts = useMemo(() => parts.filter((p) => p.stock <= p.min_stock).sort((a, b) => a.stock - b.stock), [parts]);
  const bestPrices = useMemo(() => {
    const map: Record<string, { supplier: string; cost: number; savings: number; worstCost: number }> = {};
    for (const [partId, prices] of Object.entries(multiSupplierPrices)) {
      if (prices.length > 0) {
        const best = prices[0];
        const worst = prices[prices.length - 1];
        map[partId] = { supplier: best.supplier_name, cost: best.cost, savings: worst.cost - best.cost, worstCost: worst.cost };
      }
    }
    return map;
  }, [multiSupplierPrices]);
  const totalSavings = useMemo(() => {
    return lowStockParts.reduce((s, p) => {
      const bp = bestPrices[p.id];
      const qty = orderQty[p.id] || Math.max(p.min_stock * 2 - p.stock, 5);
      return s + (bp ? bp.savings * qty : 0);
    }, 0);
  }, [lowStockParts, bestPrices, orderQty]);
  const totalOrderCost = useMemo(() => {
    return lowStockParts.reduce((s, p) => {
      const bp = bestPrices[p.id];
      const qty = orderQty[p.id] || Math.max(p.min_stock * 2 - p.stock, 5);
      return s + (bp ? bp.cost * qty : p.cost * qty);
    }, 0);
  }, [lowStockParts, bestPrices, orderQty]);

  const tabs = [
    { key: "overview", label: "نظرة عامة", icon: BarChart3 },
    { key: "purchases", label: "المشتريات", icon: ShoppingCart },
    { key: "expenses", label: "المصروفات", icon: CreditCard },
    { key: "prices", label: "تغير الأسعار", icon: Tag },
    { key: "shipping", label: "الشحن", icon: Truck },
    { key: "timeline", label: "تحليل الأسعار عبر الزمن", icon: TrendingUp },
    { key: "smart", label: "الشراء الذكي", icon: Sparkles },
  ];

  // ── WhatsApp / Native Share helpers ──
  const vinFooter = () => orderVin ? `\n🔧 VIN: ${orderVin}` : "";

  /** Convert base64 data URL → Blob */
  const dataUrlToBlob = (dataUrl: string): Blob | null => {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], { type: mime });
    } catch { return null; }
  };

  /** Convert base64 data URL → File */
  const dataUrlToFile = (dataUrl: string, filename: string): File | null => {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return null;
    return new File([blob], filename, { type: blob.type });
  };

  /** Upload base64 image to Imgur and get public URL */
  const uploadImageToImgur = async (dataUrl: string): Promise<string | null> => {
    try {
      // Use a simple client-side upload approach
      // Strip the data: prefix
      const base64 = dataUrl.split(',')[1];
      const resp = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: { Authorization: 'Client-ID 9d5b1a6e33e1e3c', 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, type: 'base64' }),
      });
      const json = await resp.json();
      return json?.data?.link || null;
    } catch { return null; }
  };

  /**
   * Share order — 3-tier fallback:
   * 1. Upload image to Imgur → send wa.me with public URL
   * 2. navigator.share({ files: [image] }) — native share sheet
   * 3. Copy image to clipboard → open wa.me
   */
  const shareOrder = async (opts: { title: string; text: string; forceImage?: boolean }) => {
    const { title, text, forceImage } = opts;
    const hasImage = !!orderImage;
    const file = hasImage ? dataUrlToFile(orderImage, `order-${Date.now()}.jpg`) : null;

    // ── TIER 1: Upload image to Imgur, get public URL, send wa.me with link ──
    if (hasImage && file) {
      try {
        const imgUrl = await uploadImageToImgur(orderImage);
        if (imgUrl) {
          const textWithUrl = `${text}\n\n📎 صورة مرفقة:\n${imgUrl}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(textWithUrl)}`, "_blank");
          return;
        }
      } catch { /* continue to tier 2 */ }
    }

    // ── TIER 2: Native share with file (works on Chrome Android) ──
    if (navigator.share && file) {
      try {
        const shareData: any = { title, text };
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
      }
    }

    // ── TIER 3: Copy image to clipboard + open wa.me ──
    if (file && navigator.clipboard && 'write' in navigator.clipboard) {
      try {
        await (navigator.clipboard as any).write([
          new ClipboardItem({ [file.type]: file }),
        ]);
        alert('✅ تم نسخ الصورة للحافظة!\n\nالآن: الصقها (Ctrl+V) في واتساب بعد فتح الرابط');
      } catch {
        alert('⚠️ لم يتم نسخ الصورة تلقائياً\n\nالحل: انسخ الصورة يدوياً من المعاينة أعلاه ثم الصقها في واتساب');
      }
    }

    // Always open wa.me with the text
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const sendWhatsAppWithPrices = (supplierName: string, group: any) => {
    const itemsText = group.items.map((item: any) => `- ${item.name_ar} (${item.qty} قطع) = ${fmt(item.lineCost)} ر.س`).join("\n");
    const text = `*أمر شراء - ${supplierName}*\n\nالتاريخ: ${today()}${vinFooter()}\n\n*القطع:*\n${itemsText}\n\n*الإجمالي: ${fmt(group.total)} ر.س*\n\nيرجى تأكيد التوفر والسعر. شكراً.`;
    shareOrder({ title: `أمر شراء ${supplierName}`, text });
  };

  const sendWhatsAppWithoutPrices = (supplierName: string, group: any) => {
    const itemsText = group.items.map((item: any) => `- ${item.name_ar} (OEM: ${item.oem}) — ${item.qty} قطع`).join("\n");
    const text = `*طلب عرض أسعار — ${supplierName}*\n\nالتاريخ: ${today()}${vinFooter()}\n\n*القطع المطلوبة:*\n${itemsText}\n\n*عدد القطع: ${group.items.reduce((s: number, it: any) => s + it.qty, 0)}*\n\nيرجى إرسال عرض السعر والتوفر. شكراً.`;
    shareOrder({ title: `طلب عرض أسعار ${supplierName}`, text });
  };

  const sendWhatsAppWithImage = (supplierName: string, group: any) => {
    const itemsText = group.items.map((item: any) => `- ${item.name_ar} (${item.qty} قطع) = ${fmt(item.lineCost)} ر.س`).join("\n");
    const text = `*أمر شراء مع صورة - ${supplierName}*\n\nالتاريخ: ${today()}${vinFooter()}\n\n*القطع:*\n${itemsText}\n\n*الإجمالي: ${fmt(group.total)} ر.س*\n\n📎 *صورة مرفقة:*\n(يتم رفع الصورة تلقائياً)`;
    if (!orderImage) {
      alert('⚠️ لم يتم اختيار صورة — اختر صورة أولاً من حقل "صورة مرفقة"');
      return;
    }
    shareOrder({ title: `أمر شراء ${supplierName}`, text, forceImage: true });
  };

  const sendWhatsAppWithVin = (supplierName: string, group: any) => {
    const vin = orderVin || "غير محدد";
    const itemsText = group.items.map((item: any) => `- ${item.name_ar} (OEM: ${item.oem}) — ${item.qty} قطع`).join("\n");
    const text = `*طلب قطع غيار لمركبة - ${supplierName}*\n\nالتاريخ: ${today()}\n🔧 *VIN:* ${vin}\n\n*القطع المطلوبة:*\n${itemsText}\n\n*عدد القطع: ${group.items.reduce((s: number, it: any) => s + it.qty, 0)}*\n\nيرجى التأكد من توافق القطع مع رقم الهيكل المذكور وإرسال عرض السعر. شكراً.`;
    shareOrder({ title: `طلب قطع غيار ${supplierName}`, text });
  };

  // Close WhatsApp dropdown on outside click
  useEffect(() => {
    if (!waDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-wa-dropdown]')) setWaDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [waDropdown]);

  const openWaDropdown = (supplierName: string) => {
    const btn = waBtnRefs.current[supplierName];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setWaDropdown({ supplier: supplierName, x: rect.left, y: rect.bottom + 4 });
  };

  const onImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("حجم الصورة يجب أن يكون أقل من 5 ميجابايت"); return; }
    const reader = new FileReader();
    reader.onload = () => { setOrderImage(reader.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-amber-400" />
            لوحة التحليلات المتقدمة
          </h1>
          <p className="text-xs text-slate-400 mt-1">{today()} — {tabs.length} تبويبات تحليلية</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 glass-liquid rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent text-xs text-slate-200 outline-none" />
            <span className="text-slate-500">-</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent text-xs text-slate-200 outline-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {tabs.map((t) => <TabBtn key={t.key} active={activeTab === t.key} label={t.label} icon={t.icon} onClick={() => setActiveTab(t.key)} />)}
      </div>

      {/* ═══════════════ OVERVIEW ═══════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="المشتريات" value={`${fmt(totalPurchases)} ر.س`} change="+12%" changeType="up" icon={ShoppingCart} color="#f59e0b" onClick={() => onNavigate?.("transactions")} />
            <KpiCard title="المصروفات" value={`${fmt(totalExpenses)} ر.س`} change="+5%" changeType="neutral" icon={CreditCard} color="#ef4444" onClick={() => onNavigate?.("transactions")} />
            <KpiCard title="هامش الربح" value={`${avgMargin.toFixed(1)}%`} change="+2.3%" changeType="up" icon={Percent} color="#10b981" />
            <KpiCard title="شحنات قيد التوصيل" value={`${fmtInt(pendingShipments)}`} change="-3" changeType="down" icon={Package} color="#8b5cf6" onClick={() => onNavigate?.("analytics")} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard title="المشتريات الشهرية" icon={TrendingUp}>
              <MiniBarChart data={purchaseByMonth.map(([, v]) => v)} color="#f59e0b" height={120} />
            </GlassCard>
            <GlassCard title="توزيع المصروفات" icon={PieChart}>
              <div className="flex items-center gap-4">
                <DonutChart segments={expenseByCategory.slice(0, 5).map(([label, value], i) => ({ label, value, color: ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6"][i % 5] }))} size={100} />
                <div className="flex-1 space-y-1">{expenseByCategory.slice(0, 5).map(([label, value], i) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6"][i % 5] }} /><span className="text-slate-300">{label}</span></div>
                    <span className="text-slate-400 font-mono">{fmt(value)}</span>
                  </div>
                ))}</div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ═══════════════ PURCHASES ═══════════════ */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard title="إجمالي المشتريات" icon={ShoppingCart}><p className="text-3xl font-black text-amber-400">{fmt(totalPurchases)} <span className="text-sm text-slate-400">ر.س</span></p></GlassCard>
            <GlassCard title="متوسط الفاتورة" icon={Receipt}><p className="text-3xl font-black text-blue-400">{fmt(filteredPurchases.length > 0 ? totalPurchases / filteredPurchases.length : 0)} <span className="text-sm text-slate-400">ر.س</span></p></GlassCard>
            <GlassCard title="القطع المشتراة" icon={Boxes}><p className="text-3xl font-black text-emerald-400">{fmtInt(filteredPurchases.reduce((s, p) => s + p.items.reduce((is, it) => is + it.qty, 0), 0))}</p></GlassCard>
          </div>
          <GlassCard title="أعلى الموردين" icon={BarChart3}>
            {purchaseBySupplier.map(([name, amount], i) => (
              <div key={name} className="flex items-center gap-3 py-2">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="text-xs text-slate-300 w-32 truncate">{name}</span>
                <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg flex items-center px-2" style={{ width: `${(amount / (purchaseBySupplier[0]?.[1] || 1)) * 100}%`, background: `linear-gradient(90deg, #f59e0b${Math.round((1 - i / 10) * 255).toString(16).padStart(2, "0")}, #f59e0b40)` }}>
                    <span className="text-[10px] font-bold text-white">{fmt(amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </GlassCard>
          <GlassCard title="سجل فواتير الشراء" icon={FileText}>
            <DataTable headers={["#", "التاريخ", "المورد", "القطع", "المجموع", "الضريبة", "الإجمالي", "الحالة"]} rows={filteredPurchases.slice(0, 20).map((p, i) => [i + 1, p.date, p.supplier_name, p.items.length, fmt(p.subtotal), fmt(p.vat), fmt(p.total), p.status])} />
          </GlassCard>
        </div>
      )}

      {/* ═══════════════ EXPENSES ═══════════════ */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard title="المصروفات" icon={Wallet}><p className="text-3xl font-black text-rose-400">{fmt(totalExpenses)} <span className="text-sm text-slate-400">ر.س</span></p></GlassCard>
            <GlassCard title="أعلى فئة" icon={TrendingDownIcon}><p className="text-3xl font-black text-purple-400">{expenseByCategory[0]?.[0] || "—"}</p><p className="text-xs text-slate-400 mt-2">{fmt(expenseByCategory[0]?.[1] || 0)} ر.س</p></GlassCard>
            <GlassCard title="المتوسط اليومي" icon={Calendar}><p className="text-3xl font-black text-sky-400">{fmt(filteredExpenses.length > 0 ? totalExpenses / 30 : 0)} <span className="text-sm text-slate-400">ر.س</span></p></GlassCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard title="حسب الفئة" icon={PieChart}>
              <div className="grid grid-cols-2 gap-3">{expenseByCategory.map(([cat, amount], i) => (
                <div key={cat} className="glass-liquid rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full" style={{ background: ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f97316"][i % 6] }} /><span className="text-xs font-bold text-slate-200">{cat}</span></div>
                  <p className="text-lg font-black text-white">{fmt(amount)}</p>
                </div>
              ))}</div>
            </GlassCard>
            <GlassCard title="المصروفات الشهرية" icon={Activity}>
              {(() => { const monthly: Record<string, number> = {}; filteredExpenses.forEach((e) => { monthly[e.date.slice(0, 7)] = (monthly[e.date.slice(0, 7)] || 0) + e.amount; }); const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)); return <MiniBarChart data={sorted.map(([, v]) => v)} color="#ef4444" height={150} />; })()}
            </GlassCard>
          </div>
          <GlassCard title="سجل المصروفات" icon={FileText}>
            <DataTable headers={["#", "التاريخ", "الفئة", "الوصف", "المبلغ", "الحساب"]} rows={filteredExpenses.slice(0, 20).map((e, i) => [i + 1, e.date, e.category, e.description, fmt(e.amount), e.account])} />
          </GlassCard>
        </div>
      )}

      {/* ═══════════════ PRICE CHANGES ═══════════════ */}
      {activeTab === "prices" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard title="تغيرات سعرية" icon={Tag}><p className="text-3xl font-black text-orange-400">{fmtInt(filteredPriceLogs.length)}</p></GlassCard>
            <GlassCard title="متوسط زيادة التكلفة" icon={TrendingUp}>
              {(() => { const avg = filteredPriceLogs.length > 0 ? filteredPriceLogs.reduce((s, pl) => s + ((pl.new_cost - pl.old_cost) / pl.old_cost * 100), 0) / filteredPriceLogs.length : 0; return <p className="text-3xl font-black text-emerald-400">{avg.toFixed(1)}%</p>; })()}
            </GlassCard>
            <GlassCard title="متوسط زيادة السعر" icon={TrendingUp}>
              {(() => { const avg = filteredPriceLogs.length > 0 ? filteredPriceLogs.reduce((s, pl) => s + ((pl.new_price - pl.old_price) / pl.old_price * 100), 0) / filteredPriceLogs.length : 0; return <p className="text-3xl font-black text-amber-400">{avg.toFixed(1)}%</p>; })()}
            </GlassCard>
          </div>
          <GlassCard title="سجل التغيرات" icon={FileText}>
            <DataTable headers={["#", "التاريخ", "القطعة", "تكلفة قديمة", "تكلفة جديدة", "سعر قديم", "سعر جديد", "التغير", "السبب"]} rows={filteredPriceLogs.slice(0, 20).map((pl, i) => {
              const costChange = ((pl.new_cost - pl.old_cost) / pl.old_cost * 100).toFixed(1);
              return [i + 1, pl.date, pl.part_name, fmt(pl.old_cost), fmt(pl.new_cost), fmt(pl.old_price), fmt(pl.new_price), `${Number(costChange) >= 0 ? "+" : ""}${costChange}%`, pl.reason];
            })} />
          </GlassCard>
        </div>
      )}

      {/* ═══════════════ SHIPPING ═══════════════ */}
      {activeTab === "shipping" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <GlassCard title="الشحن" icon={Truck}><p className="text-2xl font-black text-blue-400">{fmt(totalShippingCost)} <span className="text-xs text-slate-400">ر.س</span></p></GlassCard>
            <GlassCard title="الشحنات" icon={Package}><p className="text-2xl font-black text-amber-400">{fmtInt(shippingLogs.length)}</p></GlassCard>
            <GlassCard title="قيد الشحن" icon={Clock}><p className="text-2xl font-black text-orange-400">{fmtInt(pendingShipments)}</p></GlassCard>
            <GlassCard title="متوسط الشحن" icon={DollarSign}><p className="text-2xl font-black text-emerald-400">{fmt(shippingLogs.length > 0 ? totalShippingCost / shippingLogs.length : 0)} <span className="text-xs text-slate-400">ر.س</span></p></GlassCard>
          </div>
          <GlassCard title="سجل الشحنات" icon={FileText}>
            <DataTable headers={["#", "التاريخ", "القطعة", "الكمية", "التكلفة", "الشركة", "الحالة", "التتبع", "الوصول"]} rows={shippingLogs.slice(0, 20).map((s, i) => [i + 1, s.date, s.part_name, s.qty, fmt(s.cost), s.carrier, s.status, s.tracking, s.estimated_date])} />
          </GlassCard>
        </div>
      )}

      {/* ═══════════════ SUPPLIER LEDGER ═══════════════ */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="glass-liquid rounded-2xl p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <User className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-white">اختر المورد:</span>
              <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 outline-none focus:border-amber-400">
                <option value="">— اختر مورد —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
              </select>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث..." className="pr-9 pl-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 outline-none w-48" />
              </div>
            </div>
          </div>
          {selectedSupplier && (() => {
            const sup = suppliers.find((s) => s.id === selectedSupplier);
            if (!sup) return null;
            const totalPurchased = filterByDate(purchases).filter((p) => p.supplier === selectedSupplier).reduce((s, p) => s + p.total, 0);
            const totalPaid = selectedSupplierInvoices.filter((si) => si.type === "payment").reduce((s, si) => s + si.amount, 0);
            const balance = totalPurchased - totalPaid;
            return (
              <>
                <div className="glass-liquid rounded-2xl p-5 border border-amber-500/20">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-white">{sup.name}</h2>
                      <p className="text-xs text-slate-400 mt-1"><MapPin className="w-3 h-3 inline" /> {sup.city} | التقييم: {"★".repeat(sup.rating)}{"☆".repeat(5 - sup.rating)}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center"><p className="text-lg font-black text-amber-400">{fmt(totalPurchased)}</p><p className="text-[10px] text-slate-400">المشتريات</p></div>
                      <div className="text-center"><p className="text-lg font-black text-emerald-400">{fmt(totalPaid)}</p><p className="text-[10px] text-slate-400">المدفوع</p></div>
                      <div className="text-center"><p className={`text-lg font-black ${balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>{fmt(Math.abs(balance))}</p><p className="text-[10px] text-slate-400">{balance > 0 ? "مستحق" : "دائن"}</p></div>
                    </div>
                  </div>
                </div>
                <GlassCard title="سجل الفواتير" icon={Receipt}>
                  <DataTable headers={["#", "التاريخ", "النوع", "المبلغ", "القطع", "الحالة", "ملاحظات"]} rows={selectedSupplierInvoices.map((si, i) => [i + 1, si.date, si.type === "purchase" ? "فاتورة شراء" : si.type === "return" ? "إرجاع" : "دفعة", fmt(si.amount), si.items || "—", si.status, si.notes || "—"])} />
                </GlassCard>
                {selectedSupplierPriceChanges.length > 0 && (
                  <GlassCard title="تغيرات أسعار القطع" icon={Tag}>
                    <DataTable headers={["#", "التاريخ", "القطعة", "تكلفة قديمة", "تكلفة جديدة", "التغير", "السبب"]} rows={selectedSupplierPriceChanges.slice(0, 20).map((pl, i) => {
                      const change = ((pl.new_cost - pl.old_cost) / pl.old_cost * 100).toFixed(1);
                      return [i + 1, pl.date, pl.part_name, fmt(pl.old_cost), fmt(pl.new_cost), `${Number(change) >= 0 ? "+" : ""}${change}%`, pl.reason];
                    })} />
                  </GlassCard>
                )}
              </>
            );
          })()}
          {!selectedSupplier && <div className="glass-liquid rounded-2xl p-12 text-center"><User className="w-16 h-16 text-slate-600 mx-auto mb-4" /><p className="text-lg font-bold text-slate-400">اختر مورد لعرض سجله</p></div>}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ═══════════════ PRICE TIMELINE (NEW) ═══════════════
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          {/* Part selector */}
          <div className="glass-liquid rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-white">اختر قطعة لتحليل سعرها عبر الزمن:</span>
              <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 outline-none focus:border-amber-400">
                <option value="">— اختر قطعة —</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.name_ar} ({p.oem}) — {fmt(p.cost)} ر.س</option>)}
              </select>
            </div>
          </div>

          {/* Price history chart */}
          {selectedPart && (() => {
            const part = parts.find((p) => p.id === selectedPart);
            if (!part) return null;
            const logs = priceLogs.filter((pl) => pl.part_id === selectedPart).sort((a, b) => a.date.localeCompare(b.date));
            const multiPrices = multiSupplierPrices[selectedPart] || [];
            return (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <GlassCard title="سعر التكلفة الحالي" icon={CircleDollarSign}><p className="text-3xl font-black text-amber-400">{fmt(part.cost)} <span className="text-sm text-slate-400">ر.س</span></p></GlassCard>
                  <GlassCard title="سعر البيع الحالي" icon={Tag}><p className="text-3xl font-black text-emerald-400">{fmt(part.price)} <span className="text-sm text-slate-400">ر.س</span></p></GlassCard>
                  <GlassCard title="عدد تغيرات السعر" icon={Activity}><p className="text-3xl font-black text-blue-400">{fmtInt(logs.length)}</p></GlassCard>
                </div>

                {/* Cost timeline chart */}
                {logs.length > 0 && (
                  <GlassCard title={`مسار سعر التكلفة — ${part.name_ar}`} icon={TrendingUp}>
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2">سعر التكلفة عبر الزمن (من الأقدم للأحدث)</p>
                      <MiniLineChart data={logs.map((l) => l.new_cost)} color="#f59e0b" height={160} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {logs.map((l, i) => (
                        <div key={i} className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg">
                          {l.date}: {fmt(l.new_cost)}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Multi-supplier price comparison */}
                {multiPrices.length > 0 && (
                  <GlassCard title="مقارنة أسعار الموردين لنفس القطعة" icon={ShoppingBag}>
                    <div className="space-y-3">
                      {multiPrices.map((mp, i) => (
                        <div key={mp.supplier_id} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400"}`}>
                            {i === 0 ? "🏆" : `#${i + 1}`}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-200">{mp.supplier_name}</p>
                            <p className="text-[10px] text-slate-400">{mp.date}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-black ${i === 0 ? "text-emerald-400" : "text-slate-300"}`}>{fmt(mp.cost)} <span className="text-xs">ر.س</span></p>
                            {i > 0 && <p className="text-[10px] text-rose-400">+{fmt(mp.cost - multiPrices[0].cost)} عن الأرخص</p>}
                          </div>
                          <div className="w-32 h-4 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(multiPrices[0].cost / mp.cost) * 100}%`, background: i === 0 ? "#10b981" : "#f59e0b60" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {multiPrices.length > 1 && (
                      <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-xs text-emerald-400 font-bold">💡 التوفير المحتمل: {fmt(multiPrices[multiPrices.length - 1].cost - multiPrices[0].cost)} ر.س لكل قطعة ({(100 - (multiPrices[0].cost / multiPrices[multiPrices.length - 1].cost) * 100).toFixed(1)}% أرخص)</p>
                      </div>
                    )}
                  </GlassCard>
                )}

                {/* Price change log table */}
                {logs.length > 0 && (
                  <GlassCard title="سجل التغيرات التفصيلي" icon={FileText}>
                    <DataTable
                      headers={["#", "التاريخ", "تكلفة قديمة", "تكلفة جديدة", "تغير %", "سعر قديم", "سعر جديد", "المورد", "السبب"]}
                      rows={logs.map((pl, i) => {
                        const costChange = ((pl.new_cost - pl.old_cost) / pl.old_cost * 100).toFixed(1);
                        return [i + 1, pl.date, fmt(pl.old_cost), fmt(pl.new_cost), `${Number(costChange) >= 0 ? "+" : ""}${costChange}%`, fmt(pl.old_price), fmt(pl.new_price), pl.supplier_name || "—", pl.reason];
                      })}
                    />
                  </GlassCard>
                )}
              </>
            );
          })()}

          {/* Recent Price Updates — always visible */}
          <div className="space-y-4">
            <GlassCard title="آخر تحديثات الأسعار" icon={Clock}>
              {filteredPriceLogs.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredPriceLogs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map((pl, i) => {
                    const costChange = ((pl.new_cost - pl.old_cost) / pl.old_cost * 100);
                    const priceChange = ((pl.new_price - pl.old_price) / pl.old_price * 100);
                    return (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 glass-liquid rounded-xl border border-white/5 hover:border-amber-500/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate">{pl.part_name}</p>
                          <p className="text-[10px] text-slate-500">{pl.date} | {pl.supplier_name || "—"}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Cost change */}
                          <div className="text-center min-w-[70px]">
                            <p className="text-[10px] text-slate-500">تكلفة</p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 line-through">{fmt(pl.old_cost)}</span>
                              <span className="text-xs font-bold text-amber-400">{fmt(pl.new_cost)}</span>
                            </div>
                          </div>
                          {/* Cost change % */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${costChange >= 0 ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                            {costChange >= 0 ? "+" : ""}{costChange.toFixed(1)}%
                          </span>
                          {/* Price change */}
                          <div className="text-center min-w-[70px]">
                            <p className="text-[10px] text-slate-500">سعر البيع</p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 line-through">{fmt(pl.old_price)}</span>
                              <span className="text-xs font-bold text-emerald-400">{fmt(pl.new_price)}</span>
                            </div>
                          </div>
                          {/* Price change % */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${priceChange >= 0 ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%
                          </span>
                        </div>
                        {pl.reason && <p className="text-[10px] text-slate-600 italic w-full">{pl.reason}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">لا توجد تحديثات أسعار في الفترة المحددة</div>
              )}
            </GlassCard>
          </div>

          {!selectedPart && (
            <div className="glass-liquid rounded-2xl p-8 text-center">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-400">اختر قطعة من الأعلى لتحليل مسار سعرها التفصيلي</p>
              <p className="text-xs text-slate-500 mt-1">شوف كيف تغير سعر التكلفة عبر الزمن وقارن بين أسعار الموردين</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ SMART PURCHASE ═══════════════ */}
      {activeTab === "smart" && (
        <div className="space-y-4">
          {/* Alert */}
          {lowStockParts.length > 0 ? (
            <div className="glass-liquid rounded-xl p-3 border border-rose-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-xs text-rose-300 flex-1"><strong>{lowStockParts.length}</strong> قطعة تحتاج شراء</p>
              <span className="text-[10px] text-slate-500">{fmt(totalSavings)} ر.س توفير</span>
            </div>
          ) : (
            <div className="glass-liquid rounded-xl p-3 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300">المخزون ممتاز — لا يوجد قطع منخفضة</p>
            </div>
          )}

          {/* Parts cards — exact design from spec */}
          {lowStockParts.length > 0 && (
            <div className="space-y-2">
              {lowStockParts.map((p) => {
                const bp = bestPrices[p.id];
                const unitCost = bp?.cost || p.cost;
                const qty = orderQty[p.id] || Math.max(p.min_stock * 2 - p.stock, 5);
                const lineTotal = unitCost * qty;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* ── LEFT: Financials (vertically stacked) ── */}
                    <div className="flex flex-col items-start flex-shrink-0" style={{ minWidth: '65px' }}>
                      <span className="text-sm font-black text-emerald-400 leading-tight">{fmt(lineTotal)}</span>
                      <span className="text-[10px] text-slate-500">{fmt(unitCost)}</span>
                    </div>

                    {/* ── CENTER-LEFT: Qty control pill ── */}
                    <div className="flex items-center flex-shrink-0 rounded-lg px-1.5 py-1" style={{ background: 'rgba(0,0,0,0.25)' }}>
                      <button
                        onClick={() => setOrderQty(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || qty) - 1) }))}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >+</button>
                      <span className="w-6 text-center text-sm font-bold text-white">{orderQty[p.id] || qty}</span>
                      <button
                        onClick={() => setOrderQty(prev => ({ ...prev, [p.id]: (prev[p.id] || qty) + 1 }))}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >-</button>
                    </div>

                    {/* ── CENTER-RIGHT: Stock + Supplier (vertically stacked) ── */}
                    <div className="flex flex-col items-end flex-shrink-0" style={{ minWidth: '80px' }}>
                      <span className="text-[11px] font-bold text-amber-400">مخ:{fmtInt(p.stock)}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{bp?.supplier || "—"}</span>
                    </div>

                    {/* ── RIGHT: Part info (vertically stacked) ── */}
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[13px] font-bold text-white truncate leading-tight">{p.name_ar}</p>
                      <p className="text-[11px] text-slate-500 font-mono leading-tight mt-0.5">{p.oem}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Order summary + actions */}
          {lowStockParts.length > 0 && (
            <div className="glass-liquid rounded-xl p-4 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">ملخص الطلب</p>
                <p className="text-lg font-black text-amber-400">{fmt(totalOrderCost)} <span className="text-xs text-slate-400">ر.س</span></p>
              </div>
              <p className="text-xs text-emerald-400">توفير محتمل: {fmt(totalSavings)} ر.س</p>

              {/* VIN + Image attachment */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 glass-liquid rounded-xl p-3 border border-white/10">
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
                    <Car className="w-3.5 h-3.5 text-sky-400" /> رقم هيكل المركبة (VIN / Chassis)
                  </label>
                  <input
                    type="text"
                    value={orderVin}
                    onChange={(e) => setOrderVin(e.target.value.toUpperCase())}
                    placeholder="مثال: JTMZF33V506012345"
                    className="w-full px-3 py-2 rounded-lg liquid-input text-sm text-slate-100 placeholder:text-slate-500 font-mono"
                    maxLength={17}
                  />
                  {orderVin && <p className="text-[10px] text-emerald-400 mt-1">{orderVin.length}/17 حرف</p>}
                </div>
                <div className="flex-1 glass-liquid rounded-xl p-3 border border-white/10">
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
                    <Image className="w-3.5 h-3.5 text-amber-400" /> صورة مرفقة (قطع / مركبة)
                  </label>
                  {!orderImage ? (
                    <button onClick={() => imgAttachRef.current?.click()} className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-colors border border-dashed border-white/10 hover:border-amber-500/30">
                      + اختر صورة
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <img src={orderImage} alt="attached" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                      <span className="text-xs text-emerald-400 flex-1 truncate">تم إرفاق الصورة</span>
                      <button onClick={() => setOrderImage("")} className="text-rose-400 text-xs hover:text-rose-300">✕</button>
                    </div>
                  )}
                  <input ref={imgAttachRef} type="file" accept="image/*" className="hidden" onChange={onImageAttach} />
                </div>
              </div>

              {/* Grouped by supplier */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                {(() => {
                  const bySupplier: Record<string, any> = {};
                  lowStockParts.forEach(p => {
                    const bp = bestPrices[p.id];
                    if (!bp) return;
                    const q = orderQty[p.id] || Math.max(p.min_stock * 2 - p.stock, 5);
                    if (!bySupplier[bp.supplier]) bySupplier[bp.supplier] = { items: [], total: 0 };
                    bySupplier[bp.supplier].items.push({ ...p, qty: q, lineCost: bp.cost * q });
                    bySupplier[bp.supplier].total += bp.cost * q;
                  });
                  const supplierList = Object.entries(bySupplier);
                  return supplierList.map(([supplierName, group]: [string, any]) => {
                    const isCollapsed = collapsedSuppliers[supplierName] ?? false;
                    return (
                      <div key={supplierName} className="rounded-xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {/* Collapsible header */}
                        <button
                          onClick={() => setCollapsedSuppliers(prev => ({ ...prev, [supplierName]: !prev[supplierName] }))}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-emerald-400">{supplierName}</span>
                            <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">{group.items.length} قطعة</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-amber-400 font-bold">{fmt(group.total)} ر.س</span>
                            <span className="text-[10px] text-slate-500">{isCollapsed ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {/* Collapsible body */}
                        {!isCollapsed && (
                          <div className="px-4 pb-3 border-t border-white/5">
                            {/* Compact item list */}
                            <div className="py-2 space-y-1">
                              {group.items.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between text-[11px] py-1">
                                  <span className="text-slate-400 truncate flex-1">{item.name_ar}</span>
                                  <span className="text-slate-500 font-mono mr-3">{item.qty}x {fmt(item.lineCost / item.qty)} = {fmt(item.lineCost)}</span>
                                </div>
                              ))}
                            </div>
                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                              {/* WhatsApp Dropdown Trigger */}
                              <div className="relative inline-block">
                                <button
                                  ref={(el) => { waBtnRefs.current[supplierName] = el; }}
                                  onClick={() => { waDropdown?.supplier === supplierName ? setWaDropdown(null) : openWaDropdown(supplierName); }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-bold hover:bg-green-500/30 transition-all active:scale-95"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  واتساب <ChevronDown className={`w-3 h-3 transition-transform ${waDropdown?.supplier === supplierName ? "rotate-180" : ""}`} />
                                </button>
                              </div>
                              {/* PDF */}
                              <button onClick={() => { const w = window.open("", "_blank"); if (!w) return; const itemsRows = group.items.map((item: any, idx: number) => `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px;text-align:right;font-size:14px">${idx + 1}</td><td style="padding:10px;text-align:right;font-size:14px;font-weight:bold">${item.name_ar}</td><td style="padding:10px;text-align:center;font-size:14px">${item.oem}</td><td style="padding:10px;text-align:center;font-size:14px">${item.qty}</td><td style="padding:10px;text-align:center;font-size:14px">${fmt(item.lineCost / item.qty)}</td><td style="padding:10px;text-align:center;font-size:14px;font-weight:bold;color:#10b981">${fmt(item.lineCost)}</td></tr>`).join(""); w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>أمر شراء ${supplierName}</title><style>body{font-family:Tajawal,Arial;margin:0;padding:30px;background:#f8fafc}.box{max-width:700px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}.header{text-align:center;margin-bottom:30px}.header h1{color:#1e293b;font-size:24px;margin:0 0 5px}.header p{color:#64748b;font-size:14px}.info{display:flex;justify-content:space-between;margin:20px 0;padding:15px;background:#f1f5f9;border-radius:8px;font-size:14px}.info strong{color:#1e293b}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#1e293b;color:#f59e0b;padding:12px;font-size:13px}td{padding:10px;color:#334155}.total{text-align:left;margin-top:20px;padding-top:20px;border-top:2px solid #e2e8f0;font-size:22px;font-weight:900;color:#10b981}.footer{text-align:center;margin-top:30px;color:#94a3b8;font-size:13px;padding-top:20px;border-top:1px solid #e2e8f0}@media print{body{background:#fff;padding:0}.box{box-shadow:none;padding:20px}}</style></head><body><div class="box"><div class="header"><h1>أمر شراء</h1><p>Parts Pro ERP — ${supplierName}</p></div><div class="info"><div><strong>رقم الطلب:</strong> PO-${String(Date.now()).slice(-8)}<br>التاريخ: ${today()}</div><div><strong>إجمالي القطع:</strong> ${group.items.length}<br><strong>المبلغ:</strong> ${fmt(group.total)} ر.س</div></div><table><thead><tr><th>#</th><th>الصنف</th><th>OEM</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table><div class="total">الإجمالي: ${fmt(group.total)} ر.س</div><div class="footer"><p>أمر شراء مولد من نظام Parts Pro ERP</p></div></div></body></html>`); w.document.close(); setTimeout(() => w.print(), 500); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-[10px] font-bold hover:bg-rose-500/30 transition-all active:scale-95"><FileText className="w-3 h-3" /> PDF</button>
                              {/* Share */}
                              <button onClick={() => { const text = group.items.map((item: any) => `- ${item.name_ar}: ${item.qty} قطع = ${fmt(item.lineCost)} ر.س`).join("\n"); const fullText = `أمر شراء ${supplierName}\nالتاريخ: ${today()}\n\n${text}\n\nالإجمالي: ${fmt(group.total)} ر.س`; if (navigator.share) { navigator.share({ title: `أمر شراء ${supplierName}`, text: fullText }); } else { navigator.clipboard.writeText(fullText); alert("تم نسخ الطلب للحافظة"); } }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-500/30 transition-all active:scale-95"><Share2 className="w-3 h-3" /> مشاركة</button>
                              {/* Confirm */}
                              <button onClick={() => { const ok = window.confirm(`تأكيد طلب الشراء من\n${supplierName}\nبقيمة ${fmt(group.total)} ر.س\nعدد القطع: ${group.items.length}؟`); if (ok) alert(`✅ تم تأكيد الطلب!\n\nالمورد: ${supplierName}\nالقيمة: ${fmt(group.total)} ر.س`); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition-all active:scale-95"><Check className="w-3 h-3" /> تأكيد</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ WhatsApp Fixed Dropdown Portal ═══ */}
      {waDropdown && (
        <div
          data-wa-dropdown
          className="fixed z-[99999] rounded-xl shadow-2xl border border-green-500/40"
          style={{
            top: waDropdown.y,
            left: waDropdown.x,
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            minWidth: '190px',
          }}
        >
          {(() => {
            const bySupplier: Record<string, any> = {};
            lowStockParts.forEach(p => {
              const bp = bestPrices[p.id];
              if (!bp) return;
              const q = orderQty[p.id] || Math.max(p.min_stock * 2 - p.stock, 5);
              if (!bySupplier[bp.supplier]) bySupplier[bp.supplier] = { items: [], total: 0 };
              bySupplier[bp.supplier].items.push({ ...p, qty: q, lineCost: bp.cost * q });
              bySupplier[bp.supplier].total += bp.cost * q;
            });
            const group = bySupplier[waDropdown.supplier];
            if (!group) return null;
            return (
              <>
                <button onClick={() => { setWaDropdown(null); sendWhatsAppWithPrices(waDropdown.supplier, group); }} className="w-full text-right px-3.5 py-2.5 text-xs text-green-300 hover:bg-green-500/15 transition-colors flex items-center gap-2.5 border-b border-white/5">
                  <DollarSign className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> مع الأسعار
                </button>
                <button onClick={() => { setWaDropdown(null); sendWhatsAppWithoutPrices(waDropdown.supplier, group); }} className="w-full text-right px-3.5 py-2.5 text-xs text-green-300 hover:bg-green-500/15 transition-colors flex items-center gap-2.5 border-b border-white/5">
                  <Tag className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> بدون أسعار (طلب عرض)
                </button>
                <button onClick={() => { setWaDropdown(null); sendWhatsAppWithImage(waDropdown.supplier, group); }} className="w-full text-right px-3.5 py-2.5 text-xs text-green-300 hover:bg-green-500/15 transition-colors flex items-center gap-2.5 border-b border-white/5">
                  <Image className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> مع صورة مرفقة
                </button>
                <button onClick={() => { setWaDropdown(null); sendWhatsAppWithVin(waDropdown.supplier, group); }} className="w-full text-right px-3.5 py-2.5 text-xs text-green-300 hover:bg-green-500/15 transition-colors flex items-center gap-2.5">
                  <Hash className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> مع رقم الهيكل (VIN)
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Usage:
// <AnalyticsDashboard parts={parts} suppliers={suppliers} purchases={purchases} expenses={expenses} />
