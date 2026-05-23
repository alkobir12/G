// ═══════════════════════════════════════════════════════════
//   Google AI client — now goes through the FastAPI backend proxy
//   (Phase 4 §C1: API keys are no longer in the JS bundle.)
// ═══════════════════════════════════════════════════════════
import { geminiGenerate, googleSearchProxy } from "./aiBackend";

export function isGoogleConfigured(): boolean {
  return true;
}

export async function googleSearch(query: string): Promise<string> {
  return googleSearchProxy(query, 5);
}

export async function translateText(text: string, _target: "ar" | "en" = "ar"): Promise<string> {
  // Translation route was rarely used; route it through Gemini.
  return geminiGenerate(`ترجم النص التالي إلى ${_target === "ar" ? "العربية" : "الإنجليزية"} فقط دون شرح:\n${text}`);
}

export async function askGemini(prompt: string): Promise<string> {
  return geminiGenerate(prompt);
}
