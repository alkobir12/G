// LowStockBadge — header notification badge showing low-stock items.
import { useState, useMemo } from "react";
import { Bell, Package, AlertTriangle, X } from "lucide-react";

interface Part {
  id: string;
  name_ar: string;
  stock: number;
  min_stock: number;
  category?: string;
}

interface Props {
  parts: Part[];
  onClick?: (partId: string) => void;
}

export default function LowStockBadge({ parts, onClick }: Props) {
  const [open, setOpen] = useState(false);
  const lowStock = useMemo(
    () => parts.filter((p) => p.stock <= p.min_stock).sort((a, b) => a.stock - b.stock),
    [parts]
  );
  const count = lowStock.length;
  if (count === 0) {
    return null;
  }
  return (
    <div className="relative" dir="rtl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
        title={`${count} قطعة بمخزون منخفض`}
      >
        <Bell className="w-5 h-5 text-amber-300" />
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-80 max-h-[420px] overflow-auto z-50 rounded-2xl border border-amber-400/30 bg-slate-900/95 backdrop-blur shadow-2xl p-3">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" /> مخزون منخفض ({count})
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {lowStock.slice(0, 20).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                  onClick={() => { onClick?.(p.id); setOpen(false); }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-100 truncate">{p.name_ar}</div>
                    <div className="text-[10px] text-slate-500">{p.category}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Package className="w-3 h-3 text-rose-300" />
                    <span className={p.stock === 0 ? "text-rose-300" : "text-amber-300"}>
                      {p.stock} / {p.min_stock}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); /* TODO: place order */ }}
                    className="mr-2 px-2 py-1 rounded text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold"
                  >
                    اطلب الآن
                  </button>
                </li>
              ))}
              {count > 20 && (
                <li className="text-center text-[11px] text-slate-500 pt-2">
                  ‏+{count - 20} إضافي‏ — افتح صفحة المخزون للعرض الكامل
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
