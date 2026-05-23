import { useState, useCallback } from "react";
import { X, Printer, Download, CheckCircle, Share2 } from "lucide-react";

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export type DocType = "sell" | "buy" | "adjust" | "expense";

const DOC_LABELS: Record<DocType, string> = {
  sell: "فاتورة مبيعات",
  buy: "أمر شراء",
  adjust: "تسوية مخزون",
  expense: "سند صرف",
};

const DOC_COLORS: Record<DocType, string> = {
  sell: "bg-amber-500",
  buy: "bg-emerald-600",
  adjust: "bg-purple-600",
  expense: "bg-rose-600",
};

interface InvoiceData {
  id: string;
  date: string;
  customer: string;
  type: DocType;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  total: number;
  payment: string;
}

interface Props {
  invoice: InvoiceData | null;
  onClose: () => void;
}

export default function InvoicePreview({ invoice, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!invoice) return null;

  const colorClass = DOC_COLORS[invoice.type] || "bg-amber-500";
  const label = DOC_LABELS[invoice.type] || "فاتورة";
  const counterLabel =
    invoice.type === "buy"
      ? "المورد"
      : invoice.type === "expense"
        ? "المستفيد"
        : "العميل";

  // ── PRINT (window.print with scoped CSS) ──
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>${invoice.id}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #fff;
    color: #1e293b;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    background: ${invoice.type === "sell" ? "#f59e0b" : invoice.type === "buy" ? "#059669" : invoice.type === "adjust" ? "#9333ea" : "#dc2626"};
    color: white;
    padding: 20px;
    border-radius: 12px 12px 0 0;
    text-align: right;
  }
  .header h1 { font-size: 22px; font-weight: 900; }
  .header p { font-size: 12px; opacity: 0.8; }
  .info {
    border: 1px solid #e2e8f0;
    border-top: none;
    padding: 16px 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .info .label { font-size: 11px; color: #94a3b8; }
  .info .value { font-size: 14px; font-weight: 700; color: #1e293b; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0;
  }
  th, td {
    padding: 10px;
    text-align: right;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #64748b;
    font-size: 12px;
  }
  .totals {
    background: #f8fafc;
    padding: 16px 20px;
    border-radius: 0 0 12px 12px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
  }
  .row span:first-child { color: #64748b; }
  .row span:last-child { font-weight: 700; }
  .grand {
    border-top: 2px solid #e2e8f0;
    padding-top: 10px;
    margin-top: 10px;
  }
  .grand span:first-child { font-weight: 900; }
  .grand span:last-child { font-weight: 900; color: #d97706; font-size: 18px; }
  .footer {
    text-align: center;
    margin-top: 20px;
    font-size: 11px;
    color: #94a3b8;
  }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${label}</h1>
    <p>${invoice.id}</p>
  </div>
  <div class="info">
    <div><div class="label">التاريخ</div><div class="value">${invoice.date}</div></div>
    <div><div class="label">${counterLabel}</div><div class="value">${invoice.customer}</div></div>
    <div><div class="label">طريقة الدفع</div><div class="value">${invoice.payment}</div></div>
    <div><div class="label">نوع العملية</div><div class="value">${label}</div></div>
  </div>
  <table>
    <thead>
      <tr><th>الصنف</th><th style="text-align:center">الكمية</th><th style="text-align:center">السعر</th><th style="text-align:left">الإجمالي</th></tr>
    </thead>
    <tbody>
      ${invoice.items.map((it) => `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td style="text-align:center">${it.price.toFixed(2)}</td><td style="text-align:left;font-weight:700">${it.total.toFixed(2)}</td></tr>`).join("")}
    </tbody>
  </table>
  <div class="totals">
    <div class="row"><span>المجموع الفرعي</span><span>${invoice.subtotal.toFixed(2)} ر.س</span></div>
    <div class="row"><span>الضريبة (15%)</span><span>${invoice.vat.toFixed(2)} ر.س</span></div>
    <div class="row grand"><span>الإجمالي</span><span>${invoice.total.toFixed(2)} ر.س</span></div>
  </div>
  <div class="footer">
    <p>تم إصدارها إلكترونياً — Parts Pro ERP</p>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  }, [invoice]);

  // ── DOWNLOAD as HTML (real printable file) ──
  const handleDownload = useCallback(() => {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>${invoice.id} — ${label}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 20px; max-width: 800px; margin: 0 auto; }
  .header { background: ${invoice.type === "sell" ? "#f59e0b" : invoice.type === "buy" ? "#059669" : invoice.type === "adjust" ? "#9333ea" : "#dc2626"}; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: right; }
  .header h1 { font-size: 22px; font-weight: 900; }
  .header p { font-size: 12px; opacity: 0.8; }
  .info { border: 1px solid #e2e8f0; border-top: none; padding: 16px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info .label { font-size: 11px; color: #94a3b8; }
  .info .value { font-size: 14px; font-weight: 700; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  th { background: #f8fafc; font-weight: 600; color: #64748b; font-size: 12px; }
  .totals { background: #f8fafc; padding: 16px 20px; border-radius: 0 0 12px 12px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
  .row span:first-child { color: #64748b; }
  .row span:last-child { font-weight: 700; }
  .grand { border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
  .grand span:last-child { font-weight: 900; color: #d97706; font-size: 18px; }
  .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="header"><h1>${label}</h1><p>${invoice.id}</p></div>
  <div class="info">
    <div><div class="label">التاريخ</div><div class="value">${invoice.date}</div></div>
    <div><div class="label">${counterLabel}</div><div class="value">${invoice.customer}</div></div>
    <div><div class="label">طريقة الدفع</div><div class="value">${invoice.payment}</div></div>
    <div><div class="label">نوع العملية</div><div class="value">${label}</div></div>
  </div>
  <table>
    <thead><tr><th>الصنف</th><th style="text-align:center">الكمية</th><th style="text-align:center">السعر</th><th style="text-align:left">الإجمالي</th></tr></thead>
    <tbody>
      ${invoice.items.map((it) => `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td style="text-align:center">${it.price.toFixed(2)}</td><td style="text-align:left;font-weight:700">${it.total.toFixed(2)}</td></tr>`).join("")}
    </tbody>
  </table>
  <div class="totals">
    <div class="row"><span>المجموع الفرعي</span><span>${invoice.subtotal.toFixed(2)} ر.س</span></div>
    <div class="row"><span>الضريبة (15%)</span><span>${invoice.vat.toFixed(2)} ر.س</span></div>
    <div class="row grand"><span>الإجمالي</span><span>${invoice.total.toFixed(2)} ر.س</span></div>
  </div>
  <div class="footer"><p>تم إصدارها إلكترونياً — Parts Pro ERP</p></div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [invoice]);

  // ── SHARE (Web Share API + fallback copy) ──
  const handleShare = useCallback(async () => {
    const text = [
      `${label} — ${invoice.id}`,
      `التاريخ: ${invoice.date}`,
      `${counterLabel}: ${invoice.customer}`,
      "",
      ...invoice.items.map((it) => `${it.name} × ${it.qty} = ${it.total.toFixed(2)} ر.س`),
      "",
      `المجموع: ${invoice.subtotal.toFixed(2)} ر.س`,
      `الضريبة: ${invoice.vat.toFixed(2)} ر.س`,
      `الإجمالي: ${invoice.total.toFixed(2)} ر.س`,
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `${label} — ${invoice.id}`, text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // user cancelled share sheet
      }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [invoice]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Preview Card */}
      <div
        id="invoice-print-area"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className={`${colorClass} px-6 py-4 flex items-center justify-between`}>
          <div>
            <h2 className="text-white font-black text-lg">{label}</h2>
            <p className="text-white/80 text-xs">{invoice.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Invoice Info */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">التاريخ</p>
              <p className="text-slate-800 font-bold">{invoice.date}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">{counterLabel}</p>
              <p className="text-slate-800 font-bold">{invoice.customer}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">طريقة الدفع</p>
              <p className="text-slate-800 font-bold">{invoice.payment}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">نوع العملية</p>
              <p className="text-slate-800 font-bold">{label}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-right py-2 text-slate-500 font-medium text-xs">
                  الصنف
                </th>
                <th className="text-center py-2 text-slate-500 font-medium text-xs">
                  الكمية
                </th>
                <th className="text-center py-2 text-slate-500 font-medium text-xs">
                  السعر
                </th>
                <th className="text-left py-2 text-slate-500 font-medium text-xs">
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="text-right py-2.5 text-slate-800">{item.name}</td>
                  <td className="text-center py-2.5 text-slate-600">{item.qty}</td>
                  <td className="text-center py-2.5 text-slate-600">
                    {item.price.toFixed(2)}
                  </td>
                  <td className="text-left py-2.5 text-slate-800 font-bold">
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 bg-slate-50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">المجموع الفرعي</span>
              <span className="text-slate-800 font-bold">
                {invoice.subtotal.toFixed(2)} ر.س
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الضريبة (15%)</span>
              <span className="text-slate-800 font-bold">
                {invoice.vat.toFixed(2)} ر.س
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="text-slate-800 font-black">الإجمالي</span>
              <span className="text-amber-600 font-black text-lg">
                {invoice.total.toFixed(2)} ر.س
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-2">
          <button
            onClick={handlePrint}
            className={`flex-1 flex items-center justify-center gap-2 ${colorClass} text-white py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all`}
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-xl font-bold hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> تحميل
          </button>
          <button
            onClick={handleShare}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold active:scale-95 transition-all ${
              copied || shared
                ? "bg-emerald-500 text-white"
                : "bg-sky-500 text-white hover:bg-sky-600"
            }`}
          >
            {copied || shared ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {copied ? "تم النسخ" : shared ? "تمت المشاركة" : "مشاركة"}
          </button>
        </div>
      </div>
    </div>
  );
}
