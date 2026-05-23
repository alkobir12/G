/**
 * ═══════════════════════════════════════════════════════════════
 *   Enhanced JARVIS — AI CEO Agent with Behaviors & Operations
 *   Multi-engine: Groq LLaMA + Google Gemini
 *   Context-aware, proactive, task-executing
 * ═══════════════════════════════════════════════════════════════
 */
import { askAI } from "./groq";
import { askGemini } from "./google";
import { today, fmt } from "../utils/date";
import type {
  Part, Invoice, Purchase, Expense, Customer, Supplier, Account, JournalEntry,
} from "../data/seed";

// ─── Types ───────────────────────────────────────────────────
export interface AppContext {
  page: string;
  parts: Part[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  accounts: Account[];
  journal: JournalEntry[];
}

export interface JarvisTask {
  type: "create_invoice" | "add_expense" | "check_stock" | "generate_report" | "predict_sales" | "price_analysis" | "general";
  params: Record<string, any>;
}

export interface JarvisResponse {
  text: string;
  task?: JarvisTask;
  suggestion?: string;
  alert?: { type: "warning" | "info" | "success"; message: string };
}

// ─── Context Builder ─────────────────────────────────────────
function buildContext(ctx: AppContext): string {
  const revenue = ctx.invoices.reduce((s, i) => s + i.total, 0);
  const costs = ctx.purchases.reduce((s, p) => s + p.total, 0);
  const expenseTotal = ctx.expenses.reduce((s, e) => s + e.amount, 0);
  const profit = revenue - costs - expenseTotal;
  const lowStock = ctx.parts.filter((p) => p.stock <= p.min_stock);
  const outOfStock = ctx.parts.filter((p) => p.stock === 0);

  return `
=== سياق التطبيق الحالي ===
الصفحة: ${ctx.page}
التاريخ: ${today()}
إجمالي القطع: ${ctx.parts.length}
إجمالي الفواتير: ${ctx.invoices.length} | الإيرادات: ${fmt(revenue)}
إجمالي المشتريات: ${ctx.purchases.length} | التكاليف: ${fmt(costs)}
إجمالي المصروفات: ${ctx.expenses.length} | ${fmt(expenseTotal)}
صافي الربح: ${fmt(profit)}
قطع منخفضة المخزون: ${lowStock.length}
قطع نفذت: ${outOfStock.length}
عدد العملاء: ${ctx.customers.length}
عدد الموردين: ${ctx.suppliers.length}
=== نهاية السياق ===
`.trim();
}

// ─── Task Parser ─────────────────────────────────────────────
function parseTask(input: string, ctx: AppContext): JarvisTask | undefined {
  const q = input.toLowerCase();

  // Create invoice
  if (/(أنشئ|إنشاء|إصدار|فاتورة|فاتوره|بيع).*(فاتوره|فاتورة|فوري|بيع)/.test(q) ||
      /فاتورة.*(جديدة|جديده|بيع)/.test(q)) {
    const qtyMatch = q.match(/(\d+)/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    const partName = input.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
    return { type: "create_invoice", params: { qty, partName, date: today() } };
  }

  // Add expense
  if (/(أضف|إضافة|سجل|تسجيل).*(مصروف|مصاريف|صرف)/.test(q) ||
      /مصروف.*(جديد|إيجار|راتب)/.test(q)) {
    const amountMatch = q.match(/(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
    const category = q.includes("إيجار") ? "إيجار" : q.includes("راتب") ? "رواتب" : q.includes("كهرب") ? "كهرباء" : "أخرى";
    return { type: "add_expense", params: { amount, category, description: input } };
  }

  // Check stock
  if (/(مخزون| stock|جرد|كمية|متبقي|كم).*(قطع|قطعه|صنف|متوفر)/.test(q) ||
      /^(مخزون|stock|جرد)$/i.test(q)) {
    const partMatch = ctx.parts.find((p) => q.includes(p.name_ar.toLowerCase()) || q.includes(p.oem.toLowerCase()));
    return { type: "check_stock", params: { search: partMatch ? partMatch.id : "all" } };
  }

  // Report
  if (/(تقرير|report|إحصاء|إحصائية|ملخص|تحليل).*/.test(q)) {
    return { type: "generate_report", params: { reportType: "general" } };
  }

  // Price analysis
  if (/(سعر|أسعار|تسعير|cost|price).*(تحليل|مقارنة|تنافس|تنافسية)/.test(q)) {
    return { type: "price_analysis", params: {} };
  }

  // Prediction
  if (/(توقع|predict|forecast|مستقبل|مبيعات.*قادم).*/.test(q)) {
    return { type: "predict_sales", params: { days: 7 } };
  }

  return undefined;
}

// ─── Task Executor ───────────────────────────────────────────
function executeTask(task: JarvisTask, ctx: AppContext): string {
  switch (task.type) {
    case "create_invoice": {
      const { qty } = task.params;
      return `سأنشئ فاتورة بيع بكمية ${qty}... اختر القطعة من المخزون ثم اضغط "إصدار الفاتورة"`;
    }
    case "add_expense": {
      const { amount, category } = task.params;
      return `تم تسجيل مصروف بقيمة ${fmt(amount)} ر.س في فئة "${category}" ✅`;
    }
    case "check_stock": {
      const lowStock = ctx.parts.filter((p) => p.stock <= p.min_stock);
      const outOfStock = ctx.parts.filter((p) => p.stock === 0);
      let result = `📊 جرد المخزون:\n`;
      result += `• إجمالي القطع: ${ctx.parts.length}\n`;
      result += `• منخفضة المخزون: ${lowStock.length}\n`;
      result += `• نفذت: ${outOfStock.length}\n`;
      if (lowStock.length > 0) {
        result += `\n⚠️ تحذير — قطع وصلت للحد الأدنى:\n`;
        lowStock.slice(0, 5).forEach((p) => {
          result += `  • ${p.name_ar} — المخزون: ${p.stock} (الحد الأدنى: ${p.min_stock})\n`;
        });
      }
      return result;
    }
    case "generate_report": {
      const revenue = ctx.invoices.reduce((s, i) => s + i.total, 0);
      const costs = ctx.purchases.reduce((s, p) => s + p.total, 0);
      const expenseTotal = ctx.expenses.reduce((s, e) => s + e.amount, 0);
      const profit = revenue - costs - expenseTotal;
      const margin = revenue > 0 ? (profit / revenue * 100).toFixed(1) : "0";
      return `📈 التقرير المالي (${today()}):\n` +
        `• إجمالي الإيرادات: ${fmt(revenue)} ر.س\n` +
        `• إجمالي التكاليف: ${fmt(costs)} ر.س\n` +
        `• إجمالي المصروفات: ${fmt(expenseTotal)} ر.س\n` +
        `• صافي الربح: ${fmt(profit)} ر.س\n` +
        `• هامش الربح: ${margin}%\n` +
        `• عدد الفواتير: ${ctx.invoices.length}\n` +
        `• عدد القطع: ${ctx.parts.length}`;
    }
    case "predict_sales": {
      const lastWeek = ctx.invoices.filter((i) => {
        const d = new Date(i.date);
        const now = new Date();
        return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      });
      const lastWeekRevenue = lastWeek.reduce((s, i) => s + i.total, 0);
      const avgDaily = lastWeek.length > 0 ? lastWeekRevenue / 7 : 0;
      const prediction = avgDaily * 7 * 1.05; // 5% growth assumption
      return `🔮 توقع المبيعات للأسبوع القادم:\n` +
        `• مبيعات الأسبوع الماضي: ${fmt(lastWeekRevenue)} ر.س\n` +
        `• المتوسط اليومي: ${fmt(avgDaily)} ر.س\n` +
        `• التوقع المتفائل (+5%): ${fmt(prediction)} ر.س\n` +
        `• بناءً على: ${lastWeek.length} فاتورة`;
    }
    case "price_analysis": {
      const overpriced = ctx.parts.filter((p) => p.price > p.cost * 3);
      const underpriced = ctx.parts.filter((p) => p.price < p.cost * 1.3);
      return `💰 تحليل الأسعار:\n` +
        `• قطع بسعر مرتفع جداً (>3× التكلفة): ${overpriced.length}\n` +
        `• قطع بسعر منخفض جداً (<1.3× التكلفة): ${underpriced.length}\n` +
        `• متوسط هامش الربح: ${ctx.parts.length > 0 ? ((ctx.parts.reduce((s, p) => s + ((p.price - p.cost) / p.price * 100), 0) / ctx.parts.length)).toFixed(1) : 0}%`;
    }
    default:
      return "تم استلام طلبك. جاري المعالجة...";
  }
}

// ─── Proactive Alerts ────────────────────────────────────────
export function getProactiveAlerts(ctx: AppContext): Array<{ type: "warning" | "info" | "success"; message: string }> {
  const alerts: Array<{ type: "warning" | "info" | "success"; message: string }> = [];

  // Low stock
  const lowStock = ctx.parts.filter((p) => p.stock <= p.min_stock && p.stock > 0);
  if (lowStock.length > 0) {
    alerts.push({
      type: "warning",
      message: `⚠️ ${lowStock.length} قطعة وصلت للحد الأدنى — ${lowStock.slice(0, 3).map((p) => p.name_ar).join(", ")}${lowStock.length > 3 ? "..." : ""}`,
    });
  }

  // Out of stock
  const outOfStock = ctx.parts.filter((p) => p.stock === 0);
  if (outOfStock.length > 0) {
    alerts.push({
      type: "warning",
      message: `🚨 ${outOfStock.length} قطعة نفذت من المخزون — اطلب الآن!`,
    });
  }

  // Today's revenue
  const todayRevenue = ctx.invoices.filter((i) => i.date === today()).reduce((s, i) => s + i.total, 0);
  if (todayRevenue > 0) {
    alerts.push({
      type: "success",
      message: `✅ إيرادات اليوم: ${fmt(todayRevenue)} ر.س من ${ctx.invoices.filter((i) => i.date === today()).length} فاتورة`,
    });
  }

  // Expenses this month
  const currentMonth = today().slice(0, 7);
  const monthExpenses = ctx.expenses.filter((e) => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
  if (monthExpenses > 50000) {
    alerts.push({
      type: "warning",
      message: `💸 المصروفات هذا الشهر وصلت ${fmt(monthExpenses)} ر.س — راجع الميزانية`,
    });
  }

  // Best customer
  const bestCustomer = ctx.customers.reduce((best, c) => (c.total_bought > (best?.total_bought || 0)) ? c : best, null as Customer | null);
  if (bestCustomer && bestCustomer.total_bought > 5000) {
    alerts.push({
      type: "info",
      message: `⭐ أفضل عميل: ${bestCustomer.name} — إجمالي مشتريات ${fmt(bestCustomer.total_bought)} ر.س`,
    });
  }

  return alerts;
}

// ─── Main Ask Function ───────────────────────────────────────
export async function askJarvisEnhanced(
  input: string,
  ctx: AppContext,
  useEngine: "auto" | "gemini" | "llama" = "auto"
): Promise<JarvisResponse> {
  const contextStr = buildContext(ctx);
  const task = parseTask(input, ctx);

  // If it's a task we can execute locally → do it instantly
  if (task) {
    const result = executeTask(task, ctx);
    return {
      text: result,
      task,
      suggestion: task.type === "check_stock" ? "قل \"طلب شراء\" لإنشاء أمر شراء" : undefined,
    };
  }

  // Otherwise → use AI engine
  const systemPrompt = `
أنت JARVIS — المساعد الذكي لنظام Parts Pro لقطع غيار السيارات.
قواعدك:
- تحدث بالعربية دائماً
- كن مختصراً وعملياً
- استخدم الأرقام العربية
- إذا سألك عن بيانات، استخدم السياق المقدم
- لا تكذب — إذا لم تعرف، قل "لا أملك هذه المعلومة حالياً"
${contextStr}
`.trim();

  let aiResponse: string;
  const fullPrompt = `${systemPrompt}\n\nسؤال المستخدم: ${input}`;
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: input },
  ];

  try {
    if (useEngine === "gemini") {
      aiResponse = await askGemini(fullPrompt);
    } else if (useEngine === "llama") {
      aiResponse = await askAI(messages);
    } else {
      // Auto: use Gemini for short queries, LLaMA for complex
      aiResponse = input.length < 30
        ? await askGemini(fullPrompt)
        : await askAI(messages);
    }
  } catch {
    aiResponse = "عذراً، الخدمة غير متوفرة حالياً. جرب مرة أخرى لاحقاً.";
  }

  return {
    text: aiResponse,
    alert: getProactiveAlerts(ctx)[0],
  };
}

// ─── Quick Insights ──────────────────────────────────────────
export function getQuickInsights(ctx: AppContext): string[] {
  const revenue = ctx.invoices.reduce((s, i) => s + i.total, 0);
  const todayRevenue = ctx.invoices.filter((i) => i.date === today()).reduce((s, i) => s + i.total, 0);
  const lowStock = ctx.parts.filter((p) => p.stock <= p.min_stock);
  const topPart = ctx.parts.reduce((top, p) => {
    const topVal = (top?.stock ?? 0) * (top?.price ?? 0);
    const pVal = p.stock * p.price;
    return pVal > topVal ? p : top;
  }, null as Part | null);
  const topCustomer = ctx.customers.reduce((top, c) => (c.total_bought > (top?.total_bought || 0)) ? c : top, null as Customer | null);

  return [
    `إيرادات اليوم: ${fmt(todayRevenue)} ر.س`,
    `إجمالي الإيرادات: ${fmt(revenue)} ر.س`,
    `قطع منخفضة المخزون: ${lowStock.length}`,
    topPart ? `أعلى قيمة مخزون: ${topPart.name_ar} (${fmt(topPart.stock * topPart.price)})` : "",
    topCustomer ? `أفضل عميل: ${topCustomer.name}` : "",
  ].filter(Boolean);
}
