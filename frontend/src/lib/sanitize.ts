// ═══════════════════════════════════════════════════════════════
//   sanitize.ts — strip HTML/script tags from user input
// ═══════════════════════════════════════════════════════════════
import DOMPurify from "dompurify";

/**
 * Strip all HTML tags + JS event handlers. Use on any free-text user input
 * before saving or rendering it. Returns plain text only.
 */
export function sanitizeText(input: unknown, maxLen = 500): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  // DOMPurify with ALLOWED_TAGS: [] strips everything HTML-like
  const cleaned = DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return cleaned.slice(0, maxLen).trim();
}

/**
 * Stricter variant for short identifier-style fields (no whitespace tricks).
 */
export function sanitizeIdentifier(input: unknown, maxLen = 80): string {
  return sanitizeText(input, maxLen).replace(/\s+/g, " ");
}

/**
 * Numeric coercion that rejects NaN / Infinity.
 */
export function safeNumber(input: unknown, fallback = 0): number {
  const n = typeof input === "number" ? input : Number(input);
  return Number.isFinite(n) ? n : fallback;
}
