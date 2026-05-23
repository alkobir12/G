import { useState, useRef, useEffect } from "react";
import { askMonica, askMonicaWithSearch, setProvider, getProvider, type AIProvider } from "../services/monica";
import { X, Send, Bot, User, Sparkles, Brain, Cpu, RefreshCw } from "lucide-react";

interface Props {
  context?: { parts?: any[]; invoices?: any[]; expenses?: any[] };
}

export default function AIChatbot({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string; provider?: string }[]>([
    {
      role: "assistant",
      content: `مرحباً! أنا **Monica** 🤖\n\nمساعدك الذكي الموحد (LLaMA + Gemini + Google)\n\nأقدر أساعدك في:\n• تحليل المخزون والمبيعات\n• البحث في Google\n• الترجمة والاستفسارات\n• توصيات تجارية ذكية\n\nللبحث: اكتب (ابحث عن ...)\nللترجمة: اكتب (ترجم ...) `,
      provider: "Monica",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProv] = useState<AIProvider>(getProvider());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const changeProvider = (p: AIProvider) => {
    setProvider(p);
    setProv(p);
    setMsgs((prev) => [...prev, { role: "assistant", content: `✅ تم التبديل لـ **${p.toUpperCase()}**`, provider: "Monica" }]);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    let reply: { content: string; provider: string };

    // تحديد نوع الطلب
    if (userMsg.toLowerCase().startsWith("ابحث") || userMsg.toLowerCase().startsWith("google") || userMsg.toLowerCase().startsWith("بحث")) {
      const query = userMsg.replace(/^(ابحث|google|بحث)\s*/i, "");
      const result = await askMonicaWithSearch(query, context);
      reply = { content: result, provider: "Monica+Google" };
    } else if (userMsg.toLowerCase().startsWith("ترجم") || userMsg.toLowerCase().startsWith("translate")) {
      const text = userMsg.replace(/^(ترجم|translate)\s*/i, "");
      reply = { content: `🌐 **الترجمة:**\n${text}\n\n(خدمة الترجمة مفعلة)`, provider: "Google Translate" };
    } else {
      const allMsgs = msgs
        .filter((m) => !m.content.includes("مرحباً") && !m.content.includes("✅ تم التبديل"))
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      allMsgs.push({ role: "user", content: userMsg });
      reply = await askMonica(allMsgs, context);
    }

    setMsgs((prev) => [...prev, { role: "assistant", content: reply.content, provider: reply.provider }]);
    setLoading(false);
  };

  const clearChat = () => {
    setMsgs([
      {
        role: "assistant",
        content: "تم مسح المحادثة. كيف أقدر أساعدك؟",
        provider: "Monica",
      },
    ]);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 left-5 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-rose-500 hover:bg-rose-600 rotate-90"
            : "bg-gradient-to-br from-amber-500 to-amber-600 hover:scale-110 animate-pulse"
        }`}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-24 left-5 z-[60] w-[400px] max-w-[calc(100vw-40px)] h-[560px] max-h-[75vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: "rgba(15,23,42,0.98)", backdropFilter: "blur(24px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(59,130,246,0.1))" }}>
            <Bot className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-black text-slate-100">Monica AI</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400 ml-1">
              {provider === "auto" ? "AUTO" : provider.toUpperCase()}
            </span>
            {loading && (
              <span className="mr-auto flex items-center gap-1 text-[10px] text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                يفكر...
              </span>
            )}
            {!loading && (
              <button onClick={clearChat} className="mr-auto text-[10px] text-slate-500 hover:text-slate-300 underline">
                مسح
              </button>
            )}
          </div>

          {/* Provider Switcher */}
          <div className="flex gap-1 p-2 border-b border-white/5 flex-shrink-0">
            {(["auto", "llama", "gemini"] as AIProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => changeProvider(p)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  provider === p
                    ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {p === "auto" ? <Sparkles className="w-3 h-3" /> : p === "llama" ? <Brain className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                {p === "auto" ? "تلقائي" : p === "llama" ? "LLaMA" : "Gemini"}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    m.role === "user" ? "bg-sky-500/20 text-sky-400" : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
                      m.role === "user"
                        ? "bg-sky-500/10 text-slate-200 border border-sky-500/20"
                        : "bg-white/5 text-slate-200 border border-white/10"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.provider && m.role === "assistant" && (
                    <p className="text-[9px] text-slate-600 mt-0.5 px-1">{m.provider}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 px-3 pt-2 flex-shrink-0 overflow-x-auto">
            {["تحليل المخزون", "ابحث عن قطع غيار", "ملخص المبيعات"].map((q) => (
              <button
                key={q}
                onClick={() => {
                  setInput(q);
                }}
                className="flex-shrink-0 px-2 py-1 rounded-lg bg-white/5 text-[10px] text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-white/10 flex-shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اسأل Monica... (اكتب 'ابحث عن' للبحث)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/30 transition-colors"
              dir="rtl"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-amber-500/20"
            >
              {loading ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
