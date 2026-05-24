// Shared formatting helpers — used by App.tsx, TransactionsCards, AnalyticsDashboard, etc.
// Keep this file dependency-free so it can be imported from anywhere safely.

export const fmt = (n: number) =>
  (n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) =>
  new Intl.NumberFormat("ar-SA").format(Math.round(n || 0));

export const fmtMoney = (n: number, currency = "ر.س") => `${fmt(n)} ${currency}`;

export const fmtPct = (n: number, decimals = 1) =>
  `${(n || 0).toFixed(decimals)}%`;

export const fmtDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar-SA");
  } catch {
    return iso;
  }
};

export const today = () => new Date().toISOString().slice(0, 10);

export const monthOf = (iso?: string) => (iso || "").slice(0, 7); // YYYY-MM

export const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
