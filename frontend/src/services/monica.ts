// ═══ Monica AI Assistant — Unified Intelligence ═══
// Combines: Groq LLaMA-3.3-70b + Google Gemini + Google Search

import { askAI as askGroq } from "./groq";
import { askGemini, googleSearch } from "./google";

export type AIProvider = "llama" | "gemini" | "auto";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  provider?: string;
}

let currentProvider: AIProvider = "auto";

export function setProvider(p: AIProvider) {
  currentProvider = p;
}

export function getProvider(): AIProvider {
  return currentProvider;
}

/**
 * Monica Smart Routing — يختار أفضل نموذج تلقائياً
 */
export async function askMonica(
  messages: ChatMessage[],
  context?: { parts?: any[]; invoices?: any[]; expenses?: any[] }
): Promise<{ content: string; provider: string }> {
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || "";

  // تحديد أفضل نموذج حسب نوع السؤال
  const needsSearch = lastMessage.includes("ابحث") || lastMessage.includes("google") || lastMessage.includes("شوف");
  const isQuick = messages.length === 1;

  // بناء السياق الذكي
  let systemContext = buildSystemContext(context);

  // محاولة Gemini أولاً للأسئلة السريعة
  if ((currentProvider === "gemini" || (currentProvider === "auto" && isQuick)) && !needsSearch) {
    try {
      const prompt = buildPromptWithContext(messages, systemContext);
      const reply = await askGemini(prompt);
      return { content: reply, provider: "Gemini" };
    } catch {
      // Fallback to LLaMA
    }
  }

  // LLaMA للمحادثات المعمقة
  if (currentProvider === "llama" || currentProvider === "auto") {
    try {
      const groqMessages = [
        { role: "system" as const, content: systemContext },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const reply = await askGroq(groqMessages);
      return { content: reply, provider: "LLaMA-3.3-70b" };
    } catch {
      return { content: "عذراً، جميع الخدمات غير متاحة حالياً. جرب لاحقاً.", provider: "none" };
    }
  }

  return { content: "اختر نموذجاً متاحاً (LLaMA أو Gemini).", provider: "none" };
}

/**
 * Monica with Google Search — بحث + تحليل
 */
export async function askMonicaWithSearch(
  query: string,
  context?: { parts?: any[]; invoices?: any[] }
): Promise<string> {
  // ابحث في Google أولاً
  const searchResults = await googleSearch(query + " قطع غيار سيارات");

  // ثم حلل بـ LLaMA
  const analysis = await askMonica(
    [
      {
        role: "user",
        content: `بناءً على هذه النتائج:\n${searchResults}\n\nأعطني ملخصاً مختصراً بالعربية عن: ${query}`,
      },
    ],
    context
  );

  return `🔍 **نتائج البحث:**\n\n${analysis.content}\n\n---\n📊 **محرك:** ${analysis.provider}`;
}

/**
 * Monica Inventory Analysis — تحليل مخزون ذكي
 */
export async function analyzeInventoryWithMonica(parts: any[]): Promise<string> {
  const summary = {
    total: parts.length,
    lowStock: parts.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length,
    outOfStock: parts.filter((p) => p.stock === 0).length,
    totalValue: parts.reduce((s, p) => s + p.stock * p.price, 0),
    categories: Object.entries(
      parts.reduce((acc: any, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {})
    ),
  };

  const prompt = `أنت محلل مخزون خبير. حلل هذه البيانات:
- إجمالي القطع: ${summary.total}
- منخفضة المخزون: ${summary.lowStock}
- نفذت: ${summary.outOfStock}
- قيمة المخزون: ${summary.totalValue.toFixed(2)} ر.س
- الفئات: ${summary.categories.map((item: any) => `${item[0]}(${item[1]})`).join(", ")}

أعطِ 3 توصيات عملية لتحسين المخزون باللغة العربية.`;

  try {
    const gemini = await askGemini(prompt);
    return `📦 **تحليل المخزون** *(Gemini)*\n\n${gemini}`;
  } catch {
    const groqReply = await askGroq([{ role: "user", content: prompt }]);
    return `📦 **تحليل المخزون** *(LLaMA)*\n\n${groqReply}`;
  }
}

// ═══ Helpers ═══

function buildSystemContext(ctx?: { parts?: any[]; invoices?: any[] }): string {
  let context = `أنت Monica 🤖، المساعد الذكي لنظام Parts Pro. `;
  context += `تجمع بين LLaMA-3.3-70b و Google Gemini. `;
  context += `تتحدث العربية فقط. `;
  context += `تساعد في: إدارة المخزون، المبيعات، المشتريات، المصروفات، التحليلات، والبحث. `;
  context += `كن مختصراً ومفيداً. `;

  if (ctx?.parts) {
    const total = ctx.parts.length;
    const low = ctx.parts.filter((p: any) => p.stock <= p.min_stock).length;
    context += `\n[سياق] المخزون: ${total} قطعة، ${low} منخفضة. `;
  }
  if (ctx?.invoices) {
    const total = ctx.invoices.reduce((s: number, i: any) => s + i.total, 0);
    context += `[سياق] المبيعات: ${ctx.invoices.length} فاتورة، إجمالي ${total.toFixed(2)} ر.س. `;
  }

  return context;
}

function buildPromptWithContext(messages: ChatMessage[], systemCtx: string): string {
  const history = messages.map((m) => `${m.role === "user" ? "المستخدم" : "Monica"}: ${m.content}`).join("\n");
  return `${systemCtx}\n\n${history}`;
}
