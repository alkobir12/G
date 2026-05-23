import { useRef, useCallback, useState } from "react";
import { Printer, X, FileDown, MessageCircle, Share2, Send, Smartphone, Loader2 } from "lucide-react";
import type { Invoice, AppSettings } from "../data/seed";
import { sendSMS, sendWhatsApp, formatInvoiceSMS, formatInvoiceWhatsApp } from "../services/infobip";

interface Props {
  invoice: Invoice;
  settings: AppSettings;
  onClose: () => void;
}

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString("ar-SA");
}

export default function InvoicePrintPreview({ invoice, settings, onClose }: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(invoice.phone || "");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const totalQty = invoice.items.reduce((s, i) => s + i.qty, 0);

  // ═══════════════════════════════════════════
  // PRINT using browser print dialog
  // ═══════════════════════════════════════════
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة الفاتورة");
      return;
    }

    const printContent = printAreaRef.current?.innerHTML || "";
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            background: white;
            color: #1e293b;
            padding: 20px;
            direction: rtl;
          }
          .invoice-box {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px 12px; text-align: right; font-size: 13px; }
          th { background: #fffbeb; border-bottom: 2px solid #f59e0b; font-weight: 700; color: #92400e; }
          td { border-bottom: 1px solid #f1f5f9; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 16px; }
          .totals { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 16px; }
          .grand-total { border-top: 1px solid #fcd34d; padding-top: 8px; margin-top: 8px; font-size: 18px; font-weight: 900; color: #b45309; display: flex; justify-content: space-between; }
          .company-info h1 { font-size: 24px; font-weight: 900; color: #0f172a; }
          .company-info p { font-size: 12px; color: #64748b; }
          .invoice-badge { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; text-align: center; }
          .invoice-badge .label { font-size: 11px; font-weight: 700; color: #d97706; }
          .invoice-badge .number { font-size: 20px; font-weight: 900; color: #b45309; margin-top: 4px; }
          .info-grid { display: flex; gap: 16px; margin-bottom: 16px; }
          .info-box { background: #f8fafc; border-radius: 8px; padding: 12px; flex: 1; }
          .info-box .label { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
          .info-box .value { font-size: 13px; font-weight: 700; color: #1e293b; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; }
          .footer p { font-size: 12px; color: #64748b; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          ${printContent}
        </div>
        <div class="no-print" style="text-align:center; margin-top:20px;">
          <button onclick="window.print(); setTimeout(()=>window.close(),500);"
            style="padding:12px 32px; background:#f59e0b; color:white; border:none; border-radius:8px; font-weight:700; font-size:16px; cursor:pointer; font-family:inherit;">
            اضغط هنا للطباعة
          </button>
        </div>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }, [invoice.id]);

  // ═══════════════════════════════════════════
  // Export as PDF using html2canvas + jspdf
  // ═══════════════════════════════════════════
  const handleExportPDF = useCallback(async () => {
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const element = printAreaRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`فاتورة_${invoice.id}.pdf`);
    } catch (err: any) {
      alert("خطأ في تصدير PDF: " + (err.message || "غير معروف"));
    }
  }, [invoice.id]);

  // ═══════════════════════════════════════════
  // Send WhatsApp via Infobip
  // ═══════════════════════════════════════════
  const handleWhatsApp = useCallback(async () => {
    if (!phone.trim()) { setSendResult({ type: "error", message: "أدخل رقم الهاتف أولاً" }); return; }
    setSending(true);
    setSendResult(null);
    const text = formatInvoiceWhatsApp(invoice);
    const result = await sendWhatsApp(phone, text);
    setSending(false);
    setSendResult({ type: result.success ? "success" : "error", message: result.message });
  }, [phone, invoice]);

  // ═══════════════════════════════════════════
  // Send SMS via Infobip
  // ═══════════════════════════════════════════
  const handleSMS = useCallback(async () => {
    if (!phone.trim()) { setSendResult({ type: "error", message: "أدخل رقم الهاتف أولاً" }); return; }
    setSending(true);
    setSendResult(null);
    const text = formatInvoiceSMS(invoice);
    const result = await sendSMS(phone, text);
    setSending(false);
    setSendResult({ type: result.success ? "success" : "error", message: result.message });
  }, [phone, invoice]);

  // ═══════════════════════════════════════════
  // Native Share API (mobile)
  // ═══════════════════════════════════════════
  const handleNativeShare = useCallback(async () => {
    const items = invoice.items.map((it) => `• ${it.name} × ${fmtInt(it.qty)} = ${fmt(it.qty * it.price)}`).join("\n");
    const shareData = {
      title: `فاتورة ${invoice.id}`,
      text: [
        `فاتورة ${invoice.id} — ${settings.company_name || "Parts Pro"}`,
        `العميل: ${invoice.customer}`,
        `الإجمالي: ${fmt(invoice.total)} ${settings.currency}`,
        ``,
        items,
      ].join("\n"),
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareData.text); alert("تم نسخ تفاصيل الفاتورة للحافظة"); } catch { }
    }
  }, [invoice, settings]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* ── Header with action buttons ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">معاينة الفاتورة</h3>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* WhatsApp */}
            <button onClick={handleWhatsApp} disabled={sending}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors"
              title="إرسال عبر واتساب (Infobip)" >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">واتساب</span>
            </button>
            {/* SMS */}
            <button onClick={handleSMS} disabled={sending}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors"
              title="إرسال SMS عبر Infobip" >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">SMS</span>
            </button>
            {/* Native Share */}
            <button onClick={handleNativeShare}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors"
              title="مشاركة" >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
            {/* PDF */}
            <button onClick={handleExportPDF}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors"
              title="تحميل PDF" >
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            {/* Print */}
            <button onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors"
              title="طباعة" >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            {/* Close */}
            <button onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors" >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* ── Phone Number Input + Status ── */}
        <div className="px-4 sm:px-6 py-2 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setSendResult(null); }}
              placeholder="رقم الهاتف للإرسال (مثال: 9665xxxxxxxx)"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          {sendResult && (
            <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${sendResult.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
              {sendResult.type === "success" ? "✅" : "⚠️"} {sendResult.message}
            </div>
          )}
        </div>

        {/* ── Scrollable Print Area ── */}
        <div className="overflow-y-auto p-3 sm:p-6">
          <div ref={printAreaRef} className="bg-white p-4 sm:p-8 max-w-[210mm] mx-auto">
            {/* Company Header */}
            <div className="header">
              <div className="company-info">
                <h1>{settings.company_name || "اسم الشركة"}</h1>
                <p>{settings.address || ""}</p>
                <p>الهاتف: {settings.phone || ""}</p>
                {settings.email && <p>{settings.email}</p>}
                {settings.vat_number && (
                  <p style={{ fontWeight: 700, color: "#475569", marginTop: 4 }}>الرقم الضريبي: {settings.vat_number}</p>
                )}
                {settings.cr_number && (
                  <p style={{ fontWeight: 700, color: "#475569" }}>السجل التجاري: {settings.cr_number}</p>
                )}
              </div>
              <div className="invoice-badge">
                <p className="label">فاتورة ضريبية مبسطة</p>
                <p className="number">{invoice.id}</p>
              </div>
            </div>

            {/* Customer & Invoice Info */}
            <div className="info-grid">
              <div className="info-box">
                <p className="label">العميل</p>
                <p className="value">{invoice.customer}</p>
                {invoice.phone && <p style={{ fontSize: 11, color: "#64748b" }}>{invoice.phone}</p>}
              </div>
              <div className="info-box">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#94a3b8" }}>التاريخ:</span>
                  <span style={{ fontWeight: 700, color: "#334155" }}>{invoice.date}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#94a3b8" }}>طريقة الدفع:</span>
                  <span style={{ fontWeight: 700, color: "#334155" }}>{invoice.payment}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94a3b8" }}>الحالة:</span>
                  <span style={{ fontWeight: 700, color: "#059669" }}>{invoice.status}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>الصنف</th>
                  <th style={{ width: 60, textAlign: "center" }}>الكمية</th>
                  <th style={{ width: 90, textAlign: "center" }}>السعر</th>
                  <th style={{ width: 100, textAlign: "left" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: "#1e293b" }}>{item.name}</td>
                    <td style={{ textAlign: "center", color: "#475569" }}>{fmtInt(item.qty)}</td>
                    <td style={{ textAlign: "center", color: "#475569" }}>{fmt(item.price)}</td>
                    <td style={{ textAlign: "left", fontWeight: 700, color: "#334155" }}>{fmt(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="totals">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>إجمالي الأصناف:</span>
                <span style={{ fontWeight: 700, color: "#334155" }}>{fmtInt(invoice.items.length)} صنف · {fmtInt(totalQty)} قطعة</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>المجموع الفرعي:</span>
                <span style={{ fontWeight: 700, color: "#334155" }}>{fmt(invoice.subtotal)} {settings.currency}</span>
              </div>
              {settings.vat_enabled && invoice.vat > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>ضريبة القيمة المضافة ({(settings.vat_rate * 100).toFixed(0)}%):</span>
                  <span style={{ fontWeight: 700, color: "#334155" }}>{fmt(invoice.vat)} {settings.currency}</span>
                </div>
              )}
              <div className="grand-total">
                <span>الإجمالي:</span>
                <span>{fmt(invoice.total)} {settings.currency}</span>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, textAlign: "left" }}>
                {invoice.total > 0 ? `فقط ${fmt(invoice.total)} ${settings.currency} لا غير` : ""}
              </p>
            </div>

            {/* Footer */}
            <div className="footer">
              <p>{settings.invoice_footer || "شكراً لتعاملكم معنا"}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>تم إصدارها إلكترونياً · Parts Pro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
