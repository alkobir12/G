// ═══════════════════════════════════════════════════════════════
//   aiBackend.ts — client for the server-side AI proxy
//   Replaces direct Groq SDK / Google Generative AI calls.
// ═══════════════════════════════════════════════════════════════
import { apiPost } from "./apiClient";

export async function groqChat(messages: { role: "user" | "assistant" | "system"; content: string }[]): Promise<string> {
  try {
    const res = await apiPost<{ content: string }>("/api/ai/groq/chat", { messages });
    return res.content || "";
  } catch (e: any) {
    return `خطأ في Groq: ${e.message || e}`;
  }
}

export async function geminiGenerate(prompt: string): Promise<string> {
  try {
    const res = await apiPost<{ content: string }>("/api/ai/gemini/generate", { prompt });
    return res.content || "";
  } catch (e: any) {
    return `خطأ في Gemini: ${e.message || e}`;
  }
}

export async function googleSearchProxy(query: string, num = 5): Promise<string> {
  try {
    const res = await apiPost<{ results: { title: string; snippet: string; link: string }[] }>(
      "/api/ai/google/search",
      { query, num },
    );
    return (res.results || [])
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.link}`)
      .join("\n\n");
  } catch (e: any) {
    return `خطأ في البحث: ${e.message || e}`;
  }
}
