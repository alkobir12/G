// ═══════════════════════════════════════════════════════════
//   Groq client — now goes through the FastAPI backend proxy
//   (Phase 4 §C1: API keys are no longer in the JS bundle.)
// ═══════════════════════════════════════════════════════════
import { groqChat } from "./aiBackend";

export function isGroqConfigured(): boolean {
  // The frontend can't know whether the server has the key set.
  // We assume `true` — if not, the proxy returns 503 and `askAI` shows that.
  return true;
}

export async function askAI(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
): Promise<string> {
  return groqChat(messages);
}

export async function analyzeInventory(parts: { name_ar: string; stock: number; min_stock: number; category?: string }[]) {
  const summary = parts
    .slice(0, 50)
    .map((p) => `${p.name_ar} (${p.category ?? ""}) — ${p.stock}/${p.min_stock}`)
    .join("\n");
  return askAI([
    {
      role: "system",
      content: "أنت مساعد إدارة مخزون قطع غيار. حلل القائمة وقدم توصيات بالعربية.",
    },
    {
      role: "user",
      content: `قائمة المخزون الحالية (الاسم — الفئة — المتوفر/الحد الأدنى):\n${summary}\n\nأعطني تقييماً موجزاً + 3 توصيات.`,
    },
  ]);
}
