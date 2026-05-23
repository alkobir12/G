// ═══ Google Services Integration ═══
// ═══════════════════════════════════════════════════════════
// Reads VITE_GOOGLE_API_KEY from runtimeConfig (localStorage → env fallback).
// User can override at runtime via the Settings page.
// ═══════════════════════════════════════════════════════════

import { getRuntimeConfig } from "./runtimeConfig";

function googleKey(): string {
  return getRuntimeConfig().googleApiKey;
}

export function isGoogleConfigured(): boolean {
  return Boolean(googleKey());
}

/**
 * Google Custom Search — البحث عن قطع غيار ومعلومات
 */
export async function googleSearch(query: string): Promise<string> {
  if (!isGoogleConfigured()) return "Google API not configured.";
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleKey()}&cx=017576662512468239146:omuauf_lfve&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items
        .slice(0, 3)
        .map((item: any, i: number) => `${i + 1}. ${item.title}\n${item.snippet}\n${item.link}`)
        .join("\n\n");
    }
    return "لم يتم العثور على نتائج.";
  } catch {
    return "خطأ في البحث.";
  }
}

/**
 * Google Translation — ترجمة أسماء القطع
 */
export async function translateText(text: string, target: "ar" | "en" = "ar"): Promise<string> {
  if (!isGoogleConfigured()) return text;
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${googleKey()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target, format: "text" }),
    });
    const data = await res.json();
    return data.data?.translations?.[0]?.translatedText || text;
  } catch {
    return text;
  }
}

/**
 * Gemini AI — نموذج Google للمحادثة
 */
export async function askGemini(prompt: string): Promise<string> {
  if (!isGoogleConfigured()) return "Google AI not configured.";
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `أجب بالعربية فقط: ${prompt}` }] }],
      }),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "لم أفهم.";
  } catch {
    return "خطأ في الاتصال بـ Google AI.";
  }
}
