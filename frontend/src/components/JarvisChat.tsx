import { useState, useRef, useEffect } from "react";
import { askJarvisEnhanced, getProactiveAlerts, type AppContext } from "../services/jarvis_enhanced";
import { setEngine, getEngine, type Engine } from "../services/jarvis";
import { X, Send, Bot, User, Zap, Brain, Cpu, Trash2, BarChart3, Shield, Bell } from "lucide-react";

interface Props {
  ctx?: Partial<AppContext>;
}

export default function JarvisChat({ ctx }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string; engine?: string }[]>([
    { role: "assistant", content: `**جارفيس v2.0 — وضع المدير التنفيذي**\nذكاء اصطناعي للإدارة والتحليل المالي جاهز.\n\nاكتب **/تدقيق** للتقرير المالي\nاكتب **/قدرات** لقائمة الأدوات\nاكتب **/قوانين** لإطار القرارات`, engine: "جارفيس" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [engine, setEng] = useState<Engine>(getEngine());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const changeEngine = (e: Engine) => {
    setEngine(e); setEng(e);
    setMsgs(prev => [...prev, { role: "assistant", content: `**تم التبديل لـ ${e === "auto" ? "تلقائي" : e === "llama" ? "لاما" : "جيميني"}**`, engine: "جارفيس" }]);
  };

  const buildFullCtx = (): AppContext => ({
    page: ctx?.page || "dashboard",
    parts: ctx?.parts || [],
    invoices: ctx?.invoices || [],
    purchases: ctx?.purchases || [],
    expenses: ctx?.expenses || [],
    customers: ctx?.customers || [],
    suppliers: ctx?.suppliers || [],
    accounts: ctx?.accounts || [],
    journal: ctx?.journal || [],
  });

  const quickAction = async (type: string) => {
    const fullCtx = buildFullCtx();
    let content = "";
    let eng = "تحليل";

    if (type === "inventory") {
      content = executeLocal("check_stock", fullCtx);
      eng = "المخزون";
    } else if (type === "sales") {
      content = executeLocal("generate_report", fullCtx);
      eng = "المبيعات";
    } else if (type === "audit") {
      const alerts = getProactiveAlerts(fullCtx);
      content = `**التدقيق المالي (${fullCtx.invoices.length} فاتورة)**\n\n` +
        alerts.map((a) => `${a.type === "warning" ? "⚠️" : a.type === "success" ? "✅" : "ℹ️"} ${a.message}`).join("\n") || "لا توجد تنبيهات حالياً.";
      eng = "تدقيق";
    } else if (type === "capabilities") {
      content = `**🤖 قدرات جارفيس الذكية**

📊 **تقارير فورية**
   • "أعطني تقرير المبيعات" — ملخص مالي شامل
   • "جرد المخزون" — حالة المخزون + التحذيرات
   • "تحليل الأسعار" — هامش الربح لكل قطعة

🔮 **توقعات ذكية**
   • "توقع المبيعات" — توقع الأسبوع القادم
   • "أي قطع تحتاج طلب؟" — قائمة الشراء الموصى بها

⚡ **تنفيذ مهام**
   • "سجل مصروف إيجار 5000"
   • "أنشئ فاتورة لـ 3 بستم"

💡 **تنبيهات استباقية** (تظهر تلقائياً)
   • مخزون منخفض
   • مبيعات أقل من المتوسط
   • أفضل عميل هذا الشهر`;
      eng = "الأدوات";
    } else if (type === "alerts") {
      const alerts = getProactiveAlerts(fullCtx);
      content = alerts.length > 0
        ? `**🔔 التنبيهات (${alerts.length})**\n\n` + alerts.map((a) => `${a.type === "warning" ? "⚠️" : a.type === "success" ? "✅" : "ℹ️"} ${a.message}`).join("\n")
        : "✅ لا توجد تنبيهات حالياً — كل شيء تحت السيطرة!";
      eng = "تنبيهات";
    } else {
      content = "لا توجد بيانات متاحة.";
    }
    setMsgs(prev => [...prev, { role: "assistant", content, engine: eng }]);
  };

  // Execute local tasks without AI
  function executeLocal(taskType: string, fullCtx: AppContext): string {
    if (taskType === "check_stock") {
      const lowStock = fullCtx.parts.filter((p) => p.stock <= p.min_stock && p.stock > 0);
      const outOfStock = fullCtx.parts.filter((p) => p.stock === 0);
      let result = `**📊 جرد المخزون (${fullCtx.parts.length} قطعة)**\n\n`;
      if (outOfStock.length > 0) {
        result += `🚨 **نفذت (${outOfStock.length}):**\n${outOfStock.slice(0, 5).map((p) => `  • ${p.name_ar} — ${p.oem}`).join("\n")}\n\n`;
      }
      if (lowStock.length > 0) {
        result += `⚠️ **منخفضة (${lowStock.length}):**\n${lowStock.slice(0, 5).map((p) => `  • ${p.name_ar} — مخزون: ${p.stock} (الحد: ${p.min_stock})`).join("\n")}\n\n`;
      }
      result += `📈 إجمالي قيمة المخزون: ${(fullCtx.parts.reduce((s, p) => s + p.stock * p.price, 0)).toLocaleString("ar-SA")} ر.س`;
      return result;
    }
    if (taskType === "generate_report") {
      const revenue = fullCtx.invoices.reduce((s, i) => s + i.total, 0);
      const costs = fullCtx.purchases.reduce((s, p) => s + p.total, 0);
      const expenseTotal = fullCtx.expenses.reduce((s, e) => s + e.amount, 0);
      const profit = revenue - costs - expenseTotal;
      const todayRevenue = fullCtx.invoices.filter((i) => i.date === new Date().toISOString().slice(0, 10)).reduce((s, i) => s + i.total, 0);
      const bestCustomer = fullCtx.customers.reduce((best, c) => (c.total_bought > (best?.total_bought || 0)) ? c : best, null as any);

      return `**📈 التقرير المالي**\n\n` +
        `💰 إيرادات اليوم: ${todayRevenue.toLocaleString("ar-SA")} ر.س\n` +
        `📊 إجمالي الإيرادات: ${revenue.toLocaleString("ar-SA")} ر.س\n` +
        `📦 إجمالي المشتريات: ${costs.toLocaleString("ar-SA")} ر.س\n` +
        `💸 إجمالي المصروفات: ${expenseTotal.toLocaleString("ar-SA")} ر.س\n` +
        `🎯 صافي الربح: ${profit.toLocaleString("ar-SA")} ر.س\n` +
        `📋 الفواتير: ${fullCtx.invoices.length} | المشتريات: ${fullCtx.purchases.length} | المصروفات: ${fullCtx.expenses.length}\n` +
        (bestCustomer ? `⭐ أفضل عميل: ${bestCustomer.name} (${bestCustomer.total_bought.toLocaleString("ar-SA")} ر.س)` : "");
    }
    return "";
  }

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const fullCtx = buildFullCtx();
    const useEngine = engine as "auto" | "gemini" | "llama";

    try {
      const res = await askJarvisEnhanced(userMsg, fullCtx, useEngine);
      const engineLabel = engine === "auto" ? "تلقائي" : engine === "llama" ? "لاما" : "جيميني";

      let content = res.text;
      if (res.task) {
        content += `\n\n⚡ *تم تنفيذ: ${res.task.type.replace(/_/g, " ")}*`;
      }
      if (res.suggestion) {
        content += `\n\n💡 *اقتراح: ${res.suggestion}*`;
      }

      setMsgs(prev => [...prev, { role: "assistant", content, engine: engineLabel }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. جرب مرة أخرى.", engine: "خطأ" }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* FAB — positioned on right to avoid blocking POS cart */}
      <button onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open ? "bg-rose-500 rotate-90" : "bg-sky-500 hover:bg-sky-400 hover:scale-110"
        }`}>
        {open ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-5 z-[60] w-[400px] max-w-[calc(100vw-40px)] h-[540px] max-h-[75vh] flex flex-col rounded-2xl border border-sky-500/20 shadow-2xl overflow-hidden"
          style={{ background: "rgba(10,15,30,0.98)", backdropFilter: "blur(24px)" }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-sky-500/20 flex-shrink-0 bg-sky-500/10">
            <Bot className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-black text-slate-100 tracking-wider">جارفيس</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono">{engine === "auto" ? "تلقائي" : engine === "llama" ? "لاما" : "جيميني"}</span>
            {loading && <Zap className="w-3 h-3 text-sky-400 animate-pulse mr-auto" />}
            {!loading && <button onClick={() => setMsgs([{ role: "assistant", content: "**جارفيس جاهز.**\nكيف أقدر أساعدك؟", engine: "جارفيس" }])} className="mr-auto"><Trash2 className="w-3 h-3 text-slate-600 hover:text-rose-400" /></button>}
          </div>

          {/* Engine Switcher */}
          <div className="flex gap-1 p-2 border-b border-white/5 flex-shrink-0">
            {(["auto", "llama", "gemini"] as Engine[]).map(e => (
              <button key={e} onClick={() => changeEngine(e)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  engine === e ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30" : "text-slate-600 hover:text-slate-300"
                }`}>
                {e === "auto" ? <Zap className="w-3 h-3" /> : e === "llama" ? <Brain className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                {e === "auto" ? "تلقائي" : e === "llama" ? "لاما" : "جيميني"}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === "user" ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"
                }`}>
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
                    m.role === "user" ? "bg-emerald-500/10 text-slate-200 border border-emerald-500/20" : "bg-white/5 text-slate-200 border border-white/10"
                  }`}>
                    {m.content}
                  </div>
                  {m.engine && m.role === "assistant" && (
                    <p className="text-[9px] text-slate-600 mt-0.5 px-1">{m.engine}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 px-3 pt-2 flex-shrink-0 overflow-x-auto">
            <button onClick={() => quickAction("inventory")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-[10px] text-sky-400 hover:bg-sky-500/20 whitespace-nowrap"><BarChart3 className="w-3 h-3" /> المخزون</button>
            <button onClick={() => quickAction("sales")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-[10px] text-emerald-400 hover:bg-emerald-500/20 whitespace-nowrap"><BarChart3 className="w-3 h-3" /> المبيعات</button>
            <button onClick={() => quickAction("audit")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-[10px] text-amber-400 hover:bg-amber-500/20 whitespace-nowrap"><Shield className="w-3 h-3" /> التدقيق</button>
            <button onClick={() => quickAction("capabilities")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-[10px] text-purple-400 hover:bg-purple-500/20 whitespace-nowrap"><Cpu className="w-3 h-3" /> الأدوات</button>
            <button onClick={() => quickAction("alerts")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-[10px] text-rose-400 hover:bg-rose-500/20 whitespace-nowrap"><Bell className="w-3 h-3" /> تنبيهات</button>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-white/10 flex-shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="أرسل أمراً لجارفيس..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/30" dir="rtl" />
            <button onClick={send} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-30 flex items-center justify-center transition-all">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
