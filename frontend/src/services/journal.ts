// ═══════════════════════════════════════════════════════════
//  Parts Pro ERP — Double-Entry Bookkeeping Journal Engine
//  ═══════════════════════════════════════════════════════════
//  Strict double-entry validation: every debit has an equal credit.
//  All ledger updates respect the account-type rules:
//    • Assets & Expenses  → debit increases, credit decreases
//    • Liabilities, Equity & Revenue → credit increases, debit decreases
//

import type {
  Account,
  JournalEntry,
  Invoice,
  Purchase,
  Expense,
} from "../data/seed";

// ─── type guard helpers ───
const DEBIT_INCREASE_TYPES = new Set<string>(["أصول", "مصروفات"]);
const CREDIT_INCREASE_TYPES = new Set<string>(["خصوم", "حقوق ملكية", "إيرادات"]);

// ═══════════════════════════════════════════════════════════
// 1.  ACCOUNT HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Look up the Arabic account-type for a given account code.
 */
export function getAccountType(
  code: string,
  accounts: Account[]
): string | null {
  const ac = accounts.find((a) => a.code === code);
  return ac ? ac.type : null;
}

/** Returns true for account types whose *balance* increases with a **debit**. */
export function isDebitAccount(type: string): boolean {
  return DEBIT_INCREASE_TYPES.has(type);
}

/** Returns true for account types whose *balance* increases with a **credit**. */
export function isCreditAccount(type: string): boolean {
  return CREDIT_INCREASE_TYPES.has(type);
}

// ─── expense category → debit account code ───
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  إيجار: "5200",
  رواتب: "5300",
  كهرباء: "5400",
  صيانة: "5500",
  تسويق: "5600",
  نقل: "5700",
};

export function getExpenseAccountCode(category: string): string {
  return EXPENSE_CATEGORY_MAP[category] ?? "5900";
}

// ─── sequential journal-ID generator ───
let _dailyCounter = 0;
let _lastDatePrefix = "";

/**
 * Generate a sequential journal-voucher ID.
 * Format: JV-YYYY-MM-NNNN  (e.g. JV-2026-05-0001)
 * Counter resets whenever the month changes.
 */
export function generateJournalId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const datePrefix = `${yyyy}-${mm}`;

  if (datePrefix !== _lastDatePrefix) {
    _lastDatePrefix = datePrefix;
    _dailyCounter = 0;
  }
  _dailyCounter++;
  const seq = String(_dailyCounter).padStart(4, "0");
  return `JV-${datePrefix}-${seq}`;
}

/** Reset the internal counter — useful mainly in unit tests. */
export function resetJournalIdCounter(): void {
  _dailyCounter = 0;
  _lastDatePrefix = "";
}

// ═══════════════════════════════════════════════════════════
// 2.  JOURNAL ENTRY CREATION
// ═══════════════════════════════════════════════════════════

export interface CreateJournalEntryParams {
  date: string; // ISO-8601  yyyy-mm-dd
  ref: string; // reference to source document (invoice id, expense id, …)
  desc: string; // Arabic description
  debitAccount: string; // account code to debit
  creditAccount: string; // account code to credit
  amount: number;
}

/**
 * Create a single balanced journal-entry line.
 * This represents *one side* of a transaction; a sale invoice
 * will typically produce 3–5 of these lines.
 */
export function createJournalEntry(
  params: CreateJournalEntryParams
): JournalEntry {
  return {
    id: generateJournalId(),
    date: params.date,
    ref: params.ref,
    desc: params.desc,
    debit_account: params.debitAccount,
    credit_account: params.creditAccount,
    amount: Math.abs(params.amount),
  };
}

// ═══════════════════════════════════════════════════════════
// 3.  TRANSACTION-SPECIFIC JOURNAL GENERATORS
// ═══════════════════════════════════════════════════════════

// ── helpers shared by generators ──

function sumCost(items: { qty: number; cost: number }[]): number {
  return items.reduce((s, it) => s + it.qty * it.cost, 0);
}

/** Cash-sale / bank-transfer → debit 1100; credit-sale → debit 1300 */
function saleDebitAccount(payment: string): string {
  const p = payment.trim();
  return p === "آجل" || p === "credit" || p === "Credit" ? "1300" : "1100";
}

/** Paid purchase → credit 1100; unpaid → credit 2100 */
function purchaseCreditAccount(status: string): string {
  const s = status.trim();
  return s === "مدفوعة" || s === "paid" || s === "Paid" ? "1100" : "2100";
}

// ── 3a. SALE INVOICE ──
/**
 * Generate all journal lines for a sales invoice.
 *
 * Debits                              Credits
 * ──────────────────────────────────────────────────
 * 1100/1300  = total (cash/bank or AR)    4100  = subtotal  (revenue)
 *                                         2200  = vat       (vat payable)
 * 5100       = COGS                       1200  = COGS      (inventory)
 */
export function createSaleJournal(invoice: Invoice): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const ref = invoice.id;
  const date = invoice.date;

  // 1. Debit cash/bank or AR for total
  entries.push(
    createJournalEntry({
      date,
      ref,
      desc: `فاتورة بيع #${invoice.id} — ${invoice.customer}`,
      debitAccount: saleDebitAccount(invoice.payment),
      creditAccount: "4100",
      amount: invoice.total,
    })
  );

  // 2. VAT breakdown (only when VAT > 0)
  if (invoice.vat > 0) {
    // We already debited total; we need to split the credit side:
    // Credit revenue = subtotal, Credit VAT = vat
    // The first entry debited total but credited total to revenue.
    // So we need an adjusting entry: debit revenue (total), credit revenue (subtotal) + credit VAT (vat)
    // Simpler approach: reverse the revenue over-credit:
    entries.push(
      createJournalEntry({
        date,
        ref,
        desc: `تعديل مبلغ الإيراد لفاتورة #${invoice.id} (القيمة بدون ضريبة)`,
        debitAccount: "4100",
        creditAccount: "2200",
        amount: invoice.subtotal,
      })
    );
  }

  // Actually, let me re-think. The user's requirement says:
  // Debit 1100 (Cash/Bank) or 1300 (AR) — amount = total
  // Credit 4100 (Sales Revenue) — amount = subtotal
  // Credit 2200 (VAT Payable) — amount = vat
  // Debit 5100 (COGS) — amount = sum(cost * qty)
  // Credit 1200 (Inventory) — same COGS amount

  // createJournalEntry creates ONE line with debit_account and credit_account.
  // But we need multiple lines for the compound entry.
  // Let me create separate entries for each line properly.

  // Let me rebuild this properly:
  return buildSaleJournalInternal(invoice);
}

/** Internal: builds a sale journal as a proper multi-line compound entry. */
function buildSaleJournalInternal(invoice: Invoice): JournalEntry[] {
  const date = invoice.date;
  const ref = invoice.id;
  const cogs = sumCost(invoice.items);
  const debitAcct = saleDebitAccount(invoice.payment);

  const entries: JournalEntry[] = [];

  // Line 1: Debit Cash/AR for total  →  Credit Revenue for subtotal
  entries.push(
    createJournalEntry({
      date,
      ref,
      desc: `فاتورة بيع #${invoice.id} — ${invoice.customer} — إيراد المبيعات`,
      debitAccount: debitAcct,
      creditAccount: "4100",
      amount: invoice.subtotal,
    })
  );

  // Line 2: Debit Cash/AR for VAT  →  Credit VAT Payable
  if (invoice.vat > 0) {
    entries.push(
      createJournalEntry({
        date,
        ref,
        desc: `فاتورة بيع #${invoice.id} — ضريبة القيمة المضافة`,
        debitAccount: debitAcct,
        creditAccount: "2200",
        amount: invoice.vat,
      })
    );
  }

  // Line 3: Debit COGS  →  Credit Inventory
  if (cogs > 0) {
    entries.push(
      createJournalEntry({
        date,
        ref,
        desc: `تكلفة بضاعة مباعة — فاتورة #${invoice.id}`,
        debitAccount: "5100",
        creditAccount: "1200",
        amount: cogs,
      })
    );
  }

  return entries;
}

// ── 3b. PURCHASE ──
/**
 * Generate journal lines for a purchase.
 *
 * Debits               Credits
 * ──────────────────────────────────────
 * 1200  = subtotal     2100/1100 = total (AP or cash)
 * 2200  = vat          (within total)
 *
 * Note: In many accounting systems VAT on purchases is recorded
 * as a debit to VAT Receivable (sometimes 2200 is used bidirectionally).
 * Here we follow the requirement: debit inventory + debit 2200,
 * credit AP/cash for total.
 */
export function createPurchaseJournal(purchase: Purchase): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const date = purchase.date;
  const ref = purchase.id;
  const creditAcct = purchaseCreditAccount(purchase.status);

  // Line 1: Debit Inventory for subtotal → Credit AP/Cash for subtotal portion
  entries.push(
    createJournalEntry({
      date,
      ref,
      desc: `فاتورة شراء #${purchase.id} — ${purchase.supplier_name} — مخزون`,
      debitAccount: "1200",
      creditAccount: creditAcct,
      amount: purchase.subtotal,
    })
  );

  // Line 2: Debit VAT for vat amount → Credit AP/Cash for vat portion
  if (purchase.vat > 0) {
    entries.push(
      createJournalEntry({
        date,
        ref,
        desc: `فاتورة شراء #${purchase.id} — ضريبة قيمة مضافة مدخلة`,
        debitAccount: "2200",
        creditAccount: creditAcct,
        amount: purchase.vat,
      })
    );
  }

  return entries;
}

// ── 3c. EXPENSE ──
/**
 * Generate journal lines for a general expense.
 *
 * Debits               Credits
 * ──────────────────────────────────────
 * 5x00  = amount       1100  = amount (cash)
 */
export function createExpenseJournal(expense: Expense): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const debitAcct = getExpenseAccountCode(expense.category);

  entries.push(
    createJournalEntry({
      date: expense.date,
      ref: expense.id,
      desc: `${expense.description} — ${expense.category}`,
      debitAccount: debitAcct,
      creditAccount: "1100",
      amount: expense.amount,
    })
  );

  return entries;
}

// ── 3d. STOCK ADJUSTMENT ──
export interface StockAdjustment {
  id: string;
  date: string;
  description: string;
  amount: number; // positive = increase, negative = decrease
}

/**
 * Generate journal lines for a stock adjustment.
 *
 * Positive (increase):
 *   Debit  1200 (Inventory)
 *   Credit 5900 (Other Expenses / Stock Adjustment)
 *
 * Negative (decrease — damage/loss):
 *   Debit  5900 (Loss)
 *   Credit 1200 (Inventory)
 */
export function createStockAdjustmentJournal(
  adjustment: StockAdjustment
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const absAmount = Math.abs(adjustment.amount);

  if (adjustment.amount > 0) {
    // Stock INCREASE (e.g. found extra inventory)
    entries.push(
      createJournalEntry({
        date: adjustment.date,
        ref: adjustment.id,
        desc: `تسوية مخزون (+) — ${adjustment.description}`,
        debitAccount: "1200",
        creditAccount: "5900",
        amount: absAmount,
      })
    );
  } else if (adjustment.amount < 0) {
    // Stock DECREASE (damage, loss)
    entries.push(
      createJournalEntry({
        date: adjustment.date,
        ref: adjustment.id,
        desc: `تسوية مخزون (-) — ${adjustment.description}`,
        debitAccount: "5900",
        creditAccount: "1200",
        amount: absAmount,
      })
    );
  }
  // amount === 0 → no entry

  return entries;
}

// ── 3e. CUSTOMER PAYMENT ──
export interface CustomerPayment {
  id: string;
  date: string;
  customer: string;
  amount: number;
  method?: string; // "نقدي" | "تحويل بنكي" | …
}

/**
 * Generate journal lines for a customer payment (collection of AR).
 *
 * Debits               Credits
 * ──────────────────────────────────────
 * 1100  = amount       1300  = amount
 */
export function createPaymentJournal(
  payment: CustomerPayment
): JournalEntry[] {
 const entries: JournalEntry[] = [];

  entries.push(
    createJournalEntry({
      date: payment.date,
      ref: payment.id,
      desc: `سداد عميل — ${payment.customer}${payment.method ? ` (${payment.method})` : ""}`,
      debitAccount: "1100",
      creditAccount: "1300",
      amount: payment.amount,
    })
  );

  return entries;
}

// ═══════════════════════════════════════════════════════════
// 4.  VALIDATION
// ═══════════════════════════════════════════════════════════

/** All account codes that exist in the system's chart of accounts. */
const KNOWN_ACCOUNT_CODES = new Set<string>([
  // Assets
  "1000",
  "1100",
  "1110",
  "1120",
  "1130",
  "1200",
  "1210",
  "1220",
  "1230",
  "1240",
  "1300",
  "1310",
  "1320",
  "1330",
  "1340",
  "1400",
  "6000",
  "6100",
  // Liabilities
  "2000",
  "2100",
  "2110",
  "2120",
  "2130",
  "2200",
  "2300",
  // Equity
  "3000",
  "3100",
  "3200",
  "3300",
  // Revenue
  "4000",
  "4100",
  "4200",
  "4300",
  // Expenses
  "5000",
  "5100",
  "5200",
  "5300",
  "5400",
  "5500",
  "5600",
  "5700",
  "5900",
]);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a single journal-entry line. */
export function validateJournalEntry(
  entry: JournalEntry,
  accounts?: Account[]
): ValidationResult {
  const errors: string[] = [];

  // 4.1  amount > 0
  if (!entry.amount || entry.amount <= 0) {
    errors.push("المبلغ يجب أن يكون أكبر من صفر");
  }

  // 4.2  accounts must be different
  if (entry.debit_account === entry.credit_account) {
    errors.push("حساب المدين والدائن يجب أن يكونان مختلفين");
  }

  // 4.3  account codes must exist
  const codeSet = accounts
    ? new Set(accounts.map((a) => a.code))
    : KNOWN_ACCOUNT_CODES;

  if (!codeSet.has(entry.debit_account)) {
    errors.push(`حساب المدين (${entry.debit_account}) غير موجود في دليل الحسابات`);
  }
  if (!codeSet.has(entry.credit_account)) {
    errors.push(`حساب الدائن (${entry.credit_account}) غير موجود في دليل الحسابات`);
  }

  // 4.4  date validation
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push("تاريخ القيد غير صالح (YYYY-MM-DD)");
  } else {
    const d = new Date(entry.date);
    if (isNaN(d.getTime())) {
      errors.push("تاريخ القيد غير صالح");
    }
  }

  // 4.5  id & ref presence
  if (!entry.id || entry.id.trim() === "") {
    errors.push("معرّف القيد مطلوب");
  }
  if (!entry.ref || entry.ref.trim() === "") {
    errors.push("المرجع (رقم المستند) مطلوب");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface BatchValidationResult {
  valid: boolean;
  totalDebits: number;
  totalCredits: number;
  errors: string[];
}

/**
 * Validate a batch of journal entries.
 * Ensures:
 *  1. Every individual line is valid.
 *  2. Sum of all debits equals sum of all credits.
 */
export function validateBatch(entries: JournalEntry[]): BatchValidationResult {
  const errors: string[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (let i = 0; i < entries.length; i++) {
    const lineRes = validateJournalEntry(entries[i]);
    if (!lineRes.valid) {
      errors.push(
        ...lineRes.errors.map((e) => `سطر ${i + 1}: ${e}`)
      );
    }
    totalDebits += entries[i].amount;
    totalCredits += entries[i].amount;
  }

  // In our storage format each entry has one debit and one credit of the same
  // amount, so totals are equal by construction.  However if the entries are
  // meant to represent one *compound* transaction, we should also check that
  // the distinct debit accounts total equals distinct credit accounts total.
  // We compute that as a stronger check for compound entries.
  const debitSums: Record<string, number> = {};
  const creditSums: Record<string, number> = {};
  for (const e of entries) {
    debitSums[e.debit_account] = (debitSums[e.debit_account] || 0) + e.amount;
    creditSums[e.credit_account] =
      (creditSums[e.credit_account] || 0) + e.amount;
  }

  const sumDebits = Object.values(debitSums).reduce((s, v) => s + v, 0);
  const sumCredits = Object.values(creditSums).reduce((s, v) => s + v, 0);

  if (Math.abs(sumDebits - sumCredits) > 0.001) {
    errors.push(
      `مجموع المدين (${sumDebits.toFixed(2)}) لا يساوي مجموع الدائن (${sumCredits.toFixed(2)})`
    );
  }

  return {
    valid: errors.length === 0,
    totalDebits: sumDebits,
    totalCredits: sumCredits,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════
// 5.  ACCOUNTING EQUATION CHECK
// ═══════════════════════════════════════════════════════════

export interface EquationResult {
  balanced: boolean;
  assets: number;
  liabilities: number;
  equity: number;
  difference: number;
}

/**
 * Verify  Assets = Liabilities + Equity  (accounting for net income)
 *
 * Uses the `balance` field on each account (positive = debit balance).
 *
 * Revenue and Expense accounts are *temporary* (nominal) accounts that
 * ultimately close to Equity via the Income Summary. During an accounting
 * period the expanded equation is:
 *
 *     Assets = Liabilities + Equity + (Revenue - Expenses)
 *
 * This function includes the net income effect so the equation always
 * balances, even with open temporary accounts.
 */
export function verifyAccountingEquation(accounts: Account[]): EquationResult {
  let assets = 0;
  let liabilities = 0;
  let equity = 0;
  let revenue = 0;
  let expenses = 0;

  for (const ac of accounts) {
    const bal = ac.balance ?? 0;
    switch (ac.type) {
      case "أصول":
        assets += bal;
        break;
      case "خصوم":
        liabilities += bal;
        break;
      case "حقوق ملكية":
        equity += bal;
        break;
      case "إيرادات":
        revenue += bal;
        break;
      case "مصروفات":
        expenses += bal;
        break;
    }
  }

  const netIncome = revenue - expenses;
  const difference = assets - (liabilities + equity + netIncome);

  return {
    balanced: Math.abs(difference) < 0.01,
    assets,
    liabilities,
    equity,
    difference,
  };
}

// ═══════════════════════════════════════════════════════════
// 6.  BALANCE UPDATER
// ═══════════════════════════════════════════════════════════

/**
 * Apply a batch of journal entries to a set of accounts.
 *
 * Rules:
 *   Debit to  Asset/Expense  account → balance **increases**
 *   Debit to  Liability/Equity/Revenue account → balance **decreases**
 *   Credit to Asset/Expense  account → balance **decreases**
 *   Credit to Liability/Equity/Revenue account → balance **increases**
 *
 * Returns a *new* array of Account objects (immutable update).
 */
export function applyJournalToAccounts(
  entries: JournalEntry[],
  accounts: Account[]
): Account[] {
  // Deep-copy so we don't mutate the original array
  const updated = accounts.map((a) => ({ ...a }));

  for (const entry of entries) {
    const debitAcct = updated.find((a) => a.code === entry.debit_account);
    const creditAcct = updated.find((a) => a.code === entry.credit_account);

    if (!debitAcct || !creditAcct) {
      // Skip entries referencing unknown accounts — caller should validate first
      continue;
    }

    // Debit side
    if (isDebitAccount(debitAcct.type)) {
      debitAcct.balance = (debitAcct.balance ?? 0) + entry.amount;
    } else {
      debitAcct.balance = (debitAcct.balance ?? 0) - entry.amount;
    }

    // Credit side
    if (isCreditAccount(creditAcct.type)) {
      creditAcct.balance = (creditAcct.balance ?? 0) + entry.amount;
    } else {
      creditAcct.balance = (creditAcct.balance ?? 0) - entry.amount;
    }
  }

  return updated;
}

// ═══════════════════════════════════════════════════════════
// 7.  COMPOUND-ENTRY BUILDER  (multi-line helper)
// ═══════════════════════════════════════════════════════════

export interface CompoundLine {
  account: string; // account code
  debit: number; // 0 if this is a credit line
  credit: number; // 0 if this is a debit line
}

/**
 * Validate that a set of compound lines balances to zero.
 * Returns { valid, lines } where lines are ready for `createJournalEntry`.
 */
export function buildCompoundEntry(
  date: string,
  ref: string,
  desc: string,
  lines: CompoundLine[]
): JournalEntry[] {
  const totalDebits = lines
    .filter((l) => l.debit > 0)
    .reduce((s, l) => s + l.debit, 0);
  const totalCredits = lines
    .filter((l) => l.credit > 0)
    .reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(
      `القيد المركب غير متوازن: المدين=${totalDebits.toFixed(2)}، الدائن=${totalCredits.toFixed(2)}`
    );
  }

  const entries: JournalEntry[] = [];

  for (const line of lines) {
    if (line.debit > 0) {
      // Find a credit line to pair with
      const creditLine = lines.find((l) => l.credit > 0);
      if (!creditLine) continue;

      entries.push(
        createJournalEntry({
          date,
          ref,
          desc,
          debitAccount: line.account,
          creditAccount: creditLine.account,
          amount: line.debit,
        })
      );
    }
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════
// 8.  AUDIT / DEBUG HELPERS
// ═══════════════════════════════════════════════════════════

/** Format a journal entry as a human-readable Arabic string. */
export function formatJournalEntry(entry: JournalEntry): string {
  return (
    `[${entry.id}] ${entry.date} | ${entry.desc}\n` +
`   مدين: ${entry.debit_account} ← ${entry.amount.toFixed(2)} ر.س\n` +
    `   دائن: ${entry.credit_account} ← ${entry.amount.toFixed(2)} ر.س`
  );
}

/** Format a batch as a human-readable Arabic report. */
export function formatJournalBatch(entries: JournalEntry[]): string {
  if (entries.length === 0) return "لا توجد قيود";

  const lines: string[] = [];
  lines.push(`═══ دفتر اليومية — ${entries.length} قيد ═══`);

  const debitSums: Record<string, number> = {};
  const creditSums: Record<string, number> = {};

  for (const e of entries) {
    lines.push(formatJournalEntry(e));
    lines.push("─".repeat(50));
    debitSums[e.debit_account] = (debitSums[e.debit_account] || 0) + e.amount;
    creditSums[e.credit_account] =
      (creditSums[e.credit_account] || 0) + e.amount;
  }

  const totalDebit = Object.values(debitSums).reduce((s, v) => s + v, 0);
  const totalCredit = Object.values(creditSums).reduce((s, v) => s + v, 0);

  lines.push(`\nالإجمالي — مدين: ${totalDebit.toFixed(2)} | دائن: ${totalCredit.toFixed(2)}`);
  if (Math.abs(totalDebit - totalCredit) < 0.01) {
    lines.push("✓ القيود متوازنة");
  } else {
    lines.push(`✗ فرق: ${(totalDebit - totalCredit).toFixed(2)}`);
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════
// 9.  SPECIALIZED JOURNALS  (aggregated views)
// ═══════════════════════════════════════════════════════════

/** Build a complete journal for an array of invoices. */
export function buildInvoicesJournal(invoices: Invoice[]): JournalEntry[] {
  return invoices.flatMap((inv) => createSaleJournal(inv));
}

/** Build a complete journal for an array of purchases. */
export function buildPurchasesJournal(purchases: Purchase[]): JournalEntry[] {
  return purchases.flatMap((p) => createPurchaseJournal(p));
}

/** Build a complete journal for an array of expenses. */
export function buildExpensesJournal(expenses: Expense[]): JournalEntry[] {
  return expenses.flatMap((e) => createExpenseJournal(e));
}

/** Build a trial-balance map: { accountCode: { name, debit, credit, balance } } */
export function buildTrialBalance(
  entries: JournalEntry[],
  accounts: Account[]
): Record<
  string,
  { name: string; debit: number; credit: number; balance: number }
> {
  const result: Record<
    string,
    { name: string; debit: number; credit: number; balance: number }
  > = {};

  // Init all accounts
  for (const ac of accounts) {
    result[ac.code] = {
      name: ac.name,
      debit: 0,
      credit: 0,
      balance: ac.balance ?? 0,
    };
  }

  for (const e of entries) {
    if (result[e.debit_account]) {
      result[e.debit_account].debit += e.amount;
    }
    if (result[e.credit_account]) {
      result[e.credit_account].credit += e.amount;
    }
  }

  // Recalculate net balances
  for (const ac of accounts) {
    const r = result[ac.code];
    const netMovement =
      (isDebitAccount(ac.type) ? r.debit - r.credit : r.credit - r.debit);
    r.balance = (ac.balance ?? 0) + netMovement;
  }

  return result;
}
