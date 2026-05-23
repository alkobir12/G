import Groq from "groq-sdk";
import { getRuntimeConfig, RUNTIME_CONFIG_EVENT } from "./runtimeConfig";

// ═══════════════════════════════════════════════════════════
// Keys loaded lazily from runtimeConfig (localStorage first, env fallback).
// Rebuild client when user updates keys via Settings page.
// ═══════════════════════════════════════════════════════════

let groq: Groq | null = null;
let lastKey = "";

function buildGroq(): Groq | null {
  const key = getRuntimeConfig().groqApiKey;
  lastKey = key;
  if (!key) return null;
  try {
    return new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
  } catch {
    return null;
  }
}

function getGroq(): Groq | null {
  const currentKey = getRuntimeConfig().groqApiKey;
  if (currentKey !== lastKey || (currentKey && groq === null)) {
    groq = buildGroq();
  } else if (groq === null && currentKey) {
    groq = buildGroq();
  }
  return groq;
}

if (typeof window !== "undefined") {
  window.addEventListener(RUNTIME_CONFIG_EVENT, () => {
    groq = buildGroq();
  });
}

export function isGroqConfigured(): boolean {
  return getGroq() !== null;
}

export async function askAI(
  messages: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<string> {
  const client = getGroq();
  if (!client) {
    return "لم يتم تفعيل Groq AI. أضف VITE_GROQ_API_KEY في ملف .env أو من صفحة الإعدادات.";
  }
  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد ذكي لنظام إدارة قطع الغيار Parts Pro. اسمك راكان. " +
            "تتحدث العربية فقط. تساعد المستخدم في:\n" +
            "- إدارة المخزون والقطع\n" +
            "- تحليل المبيعات والمشتريات\n" +
            "- حساب الأرباح والخسائر\n" +
            "- اقتراح قرارات تجارية\n" +
            "- الإجابة على أسئلة المحاسبة\n" +
            "كن مختصراً وواضحاً. استخدم الأرقام العربية.",
        },
        ...messages,
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });
    return (
      chatCompletion.choices[0]?.message?.content || "لم أفهم، حاول مرة أخرى."
    );
  } catch (error: any) {
    console.error("AI Error:", error);
    if (error.status === 401) return "❌ خطأ في مفتاح API";
    if (error.status === 429) return "⏳ تم تجاوز الحد المسموح. جرب بعد دقيقة.";
    return "❌ حدث خطأ. تأكد من الاتصال بالإنترنت.";
  }
}

export async function analyzeInventory(parts: any[]): Promise<string> {
  const summary = parts
    .slice(0, 30)
    .map(
      (p) =>
        `${p.name_ar}: مخزون ${p.stock}, سعر ${p.price}, فئة ${p.category}`
    )
    .join("\n");

  return askAI([
    {
      role: "user",
      content: `حلل لي هذا المخزون وأعطني ملخصاً وتوصيات:\n${summary}`,
    },
  ]);
}

export async function analyzeSales(invoices: any[]): Promise<string> {
  const totalSales = invoices.reduce((s, i) => s + i.total, 0);
  const count = invoices.length;
  const avgOrder = count > 0 ? totalSales / count : 0;

  return askAI([
    {
      role: "user",
      content: `عندي ${count} فاتورة بإجمالي مبيعات ${totalSales} ومتوسط فاتورة ${avgOrder.toFixed(2)}. حلل لي أداء المبيعات واعطني توصيات لتحسينها.`,
    },
  ]);
}
