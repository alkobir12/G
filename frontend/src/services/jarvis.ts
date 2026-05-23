// ═══════════════════════════════════════════════════════════════
// J.A.R.V.I.S — Just A Rather Very Intelligent System
// ═══════════════════════════════════════════════════════════════
// AI CEO & Chief Architect for Parts Pro ERP
// ═══════════════════════════════════════════════════════════════

import Groq from "groq-sdk";
import { buildJarvisSystemPrompt } from "./jarvis_config";

// ═══ API Keys via Vite Environment Variables ═══
// In production, these MUST be set at build time via CI/CD secrets
// NEVER commit .env file with real keys to Git
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

const groq = GROQ_KEY
  ? new Groq({ apiKey: GROQ_KEY, dangerouslyAllowBrowser: true })
  : null;

export type Engine = "auto" | "llama" | "gemini";

let activeEngine: Engine = "auto";

export function setEngine(e: Engine) { activeEngine = e; }
export function getEngine(): Engine { return activeEngine; }

export function isAIConfigured(): boolean {
  return Boolean(GROQ_KEY) || Boolean(GOOGLE_KEY);
}

// ═══════════════════════════════════════════════════════════════
// Core: askJarvis
// ═══════════════════════════════════════════════════════════════

export async function askJarvis(
  msgs: { role: "user" | "assistant"; content: string }[],
  ctx?: { parts?: any[]; invoices?: any[]; expenses?: any[] }
): Promise<{ text: string; engine: string; latency: number }> {
  const start = performance.now();

  if (!isAIConfigured()) {
    return {
      text: "لم يتم تفعيل الذكاء الاصطناعي. يرجى إضافة مفاتيح API في إعدادات النظام.",
      engine: "غير مفعل",
      latency: 0,
    };
  }

  // Build CEO system prompt with live ERP context
  const system = buildJarvisSystemPrompt(ctx);
  const arabicReminder = "\n\nمهم: الرد بالعربية فقط.";

  const last = msgs[msgs.length - 1]?.content.toLowerCase() || "";

  const useGemini = activeEngine === "gemini" || (activeEngine === "auto" && last.length < 100);
  const useLlama = activeEngine === "llama" || (activeEngine === "auto" && last.length >= 100);

  if (useGemini && GOOGLE_KEY) {
    try {
      const prompt = `${system}${arabicReminder}\n\n${msgs.map(m => `${m.role === "user" ? "Human" : "Jarvis"}: ${m.content}`).join("\n")}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يصل رد.";
      return { text, engine: "جيميني 2.0", latency: Math.round(performance.now() - start) };
    } catch { /* fallback to LLaMA */ }
  }

  if (useLlama && groq) {
    try {
      const chatMsgs = [
        { role: "system" as const, content: system + arabicReminder },
        ...msgs.map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content })),
      ];
      const completion = await groq.chat.completions.create({
        messages: chatMsgs,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
      });
      const text = completion.choices[0]?.message?.content || "لم يصل رد.";
      return { text, engine: "لاما 3.3 70B", latency: Math.round(performance.now() - start) };
    } catch (err: any) {
      const text = err.status === 429
        ? "تم تجاوز الحد. أعد المحاولة بعد 60 ثانية."
        : `خطأ: ${err.message || "غير معروف"}`;
      return { text, engine: "خطأ", latency: Math.round(performance.now() - start) };
    }
  }

  return { text: "جميع المحركات متوقفة. تحقق من إعدادات API.", engine: "لا شيء", latency: 0 };
}

// ═══════════════════════════════════════════════════════════════
// Jarvis Skills — Analysis Tools
// ═══════════════════════════════════════════════════════════════

export async function jarvisAnalyzeInventory(parts: any[]): Promise<string> {
  const low = parts.filter(p => p.stock <= p.min_stock && p.stock > 0).length;
  const out = parts.filter(p => p.stock === 0).length;
  const value = parts.reduce((s, p) => s + p.stock * p.price, 0);
  const top = [...parts].sort((a, b) => b.stock * b.price - a.stock * a.price).slice(0, 5);

  return `📊 **تحليل المخزون**\n\n` +
    `**النظرة العامة:** ${parts.length} صنف · منخفض: ${low} · نفذ: ${out}\n` +
    `**القيمة:** ${value.toLocaleString()} ر.س\n\n` +
    `**أعلى 5 قطع بالقيمة:**\n${top.map((p, i) => `${i + 1}. ${p.name_ar} — ${(p.stock * p.price).toLocaleString()} ر.س`).join("\n")}\n\n` +
    `**التوصيات:**\n` +
    (low > 0 ? `⚠️ ${low} قطع تحتاج إعادة توريد\n` : "✅ المخزون بمستويات جيدة\n") +
    (out > 0 ? `🚨 ${out} قطع نفدت من المخزون\n` : "");
}

export async function jarvisAnalyzeSales(invoices: any[]): Promise<string> {
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const count = invoices.length;
  const avg = count > 0 ? total / count : 0;
  const cash = invoices.filter(i => i.payment === "نقدي").reduce((s, i) => s + i.total, 0);

  return `📈 **تحليل المبيعات**\n\n` +
    `**الفواتير:** ${count}\n**الإيرادات:** ${total.toLocaleString()} ر.س\n` +
    `**متوسط الفاتورة:** ${avg.toFixed(2)} ر.س\n**المبيعات النقدية:** ${cash.toLocaleString()} ر.س\n\n` +
    `**الاتجاه:** ${total > 50000 ? "قوي" : total > 10000 ? "متوسط" : "يحتاج اهتمام"}`;
}

export async function runFinancialAudit(
  accounts: any[],
  invoices: any[],
  expenses: any[]
): Promise<string> {
  const totalDebit = accounts.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0);
  const totalCredit = accounts.reduce((s, a) => s + (a.balance < 0 ? Math.abs(a.balance) : 0), 0);
  const imbalance = Math.abs(totalDebit - totalCredit);
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  let report = `**تقرير التدقيق المالي**\n\n`;
  report += `توازن القيد المزدوج:\n`;
  report += `  المدين: ${totalDebit.toFixed(2)} ر.س\n`;
  report += `  الدائن: ${totalCredit.toFixed(2)} ر.س\n`;
  report += `  ${imbalance < 0.01 ? "متزن ✅" : `خلل: ${imbalance.toFixed(2)} ر.س 🚨`}\n\n`;
  report += `ملخص الأرباح والخسائر:\n`;
  report += `  الإيرادات: ${totalRevenue.toFixed(2)} ر.س\n`;
  report += `  المصروفات: ${totalExpenses.toFixed(2)} ر.س\n`;
  report += `  صافي الربح: ${netProfit.toFixed(2)} ر.س ${netProfit >= 0 ? "✅" : "⚠️"}\n\n`;
  report += `الحالة: ${imbalance < 0.01 && netProfit >= 0 ? "صحية ✅" : "يحتاج مراجعة ⚠️"}`;

  return report;
}
