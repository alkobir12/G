/**
 * ═══════════════════════════════════════════════════════════════
 *   Date Utilities — Arabic formatting
 * ═══════════════════════════════════════════════════════════════
 */

/** Today's date in YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Format number as currency (Arabic) */
export function fmt(n: number): string {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format integer (Arabic) */
export function fmtInt(n: number): string {
  return n.toLocaleString("ar-SA");
}

/** Convert Western digits to Arabic digits */
export function toArabicNums(str: string): string {
  return str.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}
