// ═══════════════════════════════════════════════════════════
//  Comprehensive Test Suite for journal.ts
//  Run:  npx tsx src/services/journal.test.ts
// ═══════════════════════════════════════════════════════════

import assert from "node:assert";
import type { Account, Invoice, Purchase, Expense } from "../data/seed";
import {
  // Helpers
  getAccountType,
  isDebitAccount,
  isCreditAccount,
  getExpenseAccountCode,
  generateJournalId,
  resetJournalIdCounter,

  // Creation
  createJournalEntry,

  // Transaction generators
  createSaleJournal,
  createPurchaseJournal,
  createExpenseJournal,
  createStockAdjustmentJournal,
  createPaymentJournal,

  // Validation
  validateJournalEntry,
  validateBatch,

  // Equation
  verifyAccountingEquation,

  // Balance updater
  applyJournalToAccounts,

  // Compound / Audit
  buildCompoundEntry,
  formatJournalEntry,
  formatJournalBatch,
  buildTrialBalance,

  // Batch builders
  buildInvoicesJournal as _buildInvoicesJournal,
  buildPurchasesJournal as _buildPurchasesJournal,
  buildExpensesJournal as _buildExpensesJournal,
} from "./journal";

// ─── test data ────────────────────────────────────────────

const TEST_ACCOUNTS: Account[] = [
  { code: "1100", name: "النقدية والبنوك", type: "أصول", parent: null, system: true, balance: 45600 },
  { code: "1110", name: "الصندوق", type: "أصول", parent: "1100", system: false, balance: 12500 },
  { code: "1120", name: "البنك الأهلي", type: "أصول", parent: "1100", system: false, balance: 23100 },
  { code: "1200", name: "المخزون", type: "أصول", parent: null, system: true, balance: 87350 },
  { code: "1300", name: "حسابات العملاء", type: "أصول", parent: null, system: true, balance: 2878 },
  { code: "2100", name: "حسابات الموردين", type: "خصوم", parent: null, system: true, balance: 8011 },
  { code: "2200", name: "ضريبة القيمة المضافة", type: "خصوم", parent: null, system: true, balance: 0 },
  { code: "3000", name: "حقوق الملكية", type: "حقوق ملكية", parent: null, system: true, balance: 127817 },
  { code: "3100", name: "رأس المال", type: "حقوق ملكية", parent: "3000", system: false, balance: 100000 },
  { code: "3200", name: "الأرباح المحتجزة", type: "حقوق ملكية", parent: "3000", system: true, balance: 27782 },
  { code: "4000", name: "الإيرادات", type: "إيرادات", parent: null, system: true, balance: 828 },
  { code: "4100", name: "مبيعات قطع غيار", type: "إيرادات", parent: "4000", system: true, balance: 828 },
  { code: "5000", name: "المصروفات", type: "مصروفات", parent: null, system: true, balance: 793 },
  { code: "5100", name: "تكلفة البضاعة المباعة", type: "مصروفات", parent: "5000", system: true, balance: 0 },
  { code: "5200", name: "الإيجار", type: "مصروفات", parent: "5000", system: false, balance: 5000 },
  { code: "5300", name: "الرواتب والأجور", type: "مصروفات", parent: "5000", system: false, balance: 8700 },
  { code: "5400", name: "الكهرباء والماء", type: "مصروفات", parent: "5000", system: false, balance: 1770 },
  { code: "5500", name: "الصيانة والإصلاحات", type: "مصروفات", parent: "5000", system: false, balance: 1950 },
  { code: "5600", name: "التسويق والإعلان", type: "مصروفات", parent: "5000", system: false, balance: 900 },
  { code: "5700", name: "مصاريف نقل وشحن", type: "مصروفات", parent: "5000", system: false, balance: 830 },
  { code: "5900", name: "مصاريف أخرى", type: "مصروفات", parent: "5000", system: false, balance: 0 },
];

// ─── test helper ──────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    failCount++;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ✗ ${name}\n    ${message}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
  console.log("─".repeat(title.length));
}

// ═══════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║   Parts Pro ERP — Journal Engine Test Suite          ║");
console.log("╚══════════════════════════════════════════════════════╝");

// ── Section 1: Helper functions ──
section("1. Helper Functions");

test("getAccountType returns correct type for asset", () => {
  assert.strictEqual(getAccountType("1100", TEST_ACCOUNTS), "أصول");
});

test("getAccountType returns correct type for liability", () => {
  assert.strictEqual(getAccountType("2100", TEST_ACCOUNTS), "خصوم");
});

test("getAccountType returns correct type for equity", () => {
  assert.strictEqual(getAccountType("3100", TEST_ACCOUNTS), "حقوق ملكية");
});

test("getAccountType returns correct type for revenue", () => {
  assert.strictEqual(getAccountType("4100", TEST_ACCOUNTS), "إيرادات");
});

test("getAccountType returns correct type for expense", () => {
  assert.strictEqual(getAccountType("5100", TEST_ACCOUNTS), "مصروفات");
});

test("getAccountType returns null for unknown code", () => {
  assert.strictEqual(getAccountType("9999", TEST_ACCOUNTS), null);
});

test("isDebitAccount true for assets", () => {
  assert.strictEqual(isDebitAccount("أصول"), true);
});

test("isDebitAccount true for expenses", () => {
  assert.strictEqual(isDebitAccount("مصروفات"), true);
});

test("isDebitAccount false for liabilities", () => {
  assert.strictEqual(isDebitAccount("خصوم"), false);
});

test("isDebitAccount false for equity", () => {
  assert.strictEqual(isDebitAccount("حقوق ملكية"), false);
});

test("isDebitAccount false for revenue", () => {
  assert.strictEqual(isDebitAccount("إيرادات"), false);
});

test("isCreditAccount true for liabilities", () => {
  assert.strictEqual(isCreditAccount("خصوم"), true);
});

test("isCreditAccount true for equity", () => {
  assert.strictEqual(isCreditAccount("حقوق ملكية"), true);
});

test("isCreditAccount true for revenue", () => {
  assert.strictEqual(isCreditAccount("إيرادات"), true);
});

test("isCreditAccount false for assets", () => {
  assert.strictEqual(isCreditAccount("أصول"), false);
});

test("isCreditAccount false for expenses", () => {
  assert.strictEqual(isCreditAccount("مصروفات"), false);
});

// ── Expense category mapping ──
test("getExpenseAccountCode maps إيجار to 5200", () => {
  assert.strictEqual(getExpenseAccountCode("إيجار"), "5200");
});

test("getExpenseAccountCode maps رواتب to 5300", () => {
  assert.strictEqual(getExpenseAccountCode("رواتب"), "5300");
});

test("getExpenseAccountCode maps كهرباء to 5400", () => {
  assert.strictEqual(getExpenseAccountCode("كهرباء"), "5400");
});

test("getExpenseAccountCode maps صيانة to 5500", () => {
  assert.strictEqual(getExpenseAccountCode("صيانة"), "5500");
});

test("getExpenseAccountCode maps تسويق to 5600", () => {
  assert.strictEqual(getExpenseAccountCode("تسويق"), "5600");
});

test("getExpenseAccountCode maps نقل to 5700", () => {
  assert.strictEqual(getExpenseAccountCode("نقل"), "5700");
});

test("getExpenseAccountCode defaults unknown to 5900", () => {
  assert.strictEqual(getExpenseAccountCode("غير معروف"), "5900");
});

// ── Journal ID generation ──
test("generateJournalId returns correct format", () => {
  resetJournalIdCounter();
  const id = generateJournalId();
  assert.ok(/^JV-\d{4}-\d{2}-\d{4}$/.test(id), `ID format invalid: ${id}`);
});

test("generateJournalId increments sequentially", () => {
  resetJournalIdCounter();
  const id1 = generateJournalId();
  const id2 = generateJournalId();
  assert.ok(id1 < id2, `IDs should increment: ${id1} vs ${id2}`);
});

test("generateJournalId produces 0001 then 0002", () => {
  resetJournalIdCounter();
  const id1 = generateJournalId();
  const id2 = generateJournalId();
  assert.ok(id1.endsWith("-0001"), `Expected -0001, got ${id1}`);
  assert.ok(id2.endsWith("-0002"), `Expected -0002, got ${id2}`);
});

// ── Section 2: Journal Entry Creation ──
section("2. Journal Entry Creation");

test("createJournalEntry creates valid entry with correct fields", () => {
  resetJournalIdCounter();
  const entry = createJournalEntry({
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debitAccount: "1100",
    creditAccount: "4100",
    amount: 1000,
  });
  assert.strictEqual(entry.date, "2026-05-15");
  assert.strictEqual(entry.ref, "INV-001");
  assert.strictEqual(entry.desc, "فاتورة بيع");
  assert.strictEqual(entry.debit_account, "1100");
  assert.strictEqual(entry.credit_account, "4100");
  assert.strictEqual(entry.amount, 1000);
});

test("createJournalEntry uses absolute value for negative amounts", () => {
  resetJournalIdCounter();
  const entry = createJournalEntry({
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debitAccount: "1100",
    creditAccount: "4100",
    amount: -500,
  });
  assert.strictEqual(entry.amount, 500);
});

// ── Section 3: Sale Invoice Journal ──
section("3. Sale Invoice Journal");

const SAMPLE_INVOICE_CASH: Invoice = {
  id: "INV-2026-0010",
  date: "2026-05-10",
  customer: "عبدالله العتيبي",
  phone: "0555555555",
  items: [
    { part_id: "SKU-001", name: "بستم ديزل", qty: 2, price: 150, cost: 100 },
    { part_id: "SKU-002", name: "فلتر زيت", qty: 3, price: 50, cost: 30 },
  ],
  subtotal: 450,
  vat: 67.5,
  total: 517.5,
  payment: "نقدي",
  status: "مكتمل",
};

const SAMPLE_INVOICE_CREDIT: Invoice = {
  ...SAMPLE_INVOICE_CASH,
  id: "INV-2026-0011",
  payment: "آجل",
};

const SAMPLE_INVOICE_ZERO_VAT: Invoice = {
  ...SAMPLE_INVOICE_CASH,
  id: "INV-2026-0012",
  vat: 0,
  total: 450,
};

test("createSaleJournal produces correct entries for cash sale", () => {
  resetJournalIdCounter();
  const entries = createSaleJournal(SAMPLE_INVOICE_CASH);
  // Should have 3 entries: cash→revenue, cash→vat, cogs→inventory
  assert.strictEqual(entries.length, 3);

  // Entry 1: Debit 1100 (cash), Credit 4100 (revenue) = subtotal
  assert.strictEqual(entries[0].debit_account, "1100");
  assert.strictEqual(entries[0].credit_account, "4100");
  assert.strictEqual(entries[0].amount, 450);

  // Entry 2: Debit 1100 (cash), Credit 2200 (vat) = vat
  assert.strictEqual(entries[1].debit_account, "1100");
  assert.strictEqual(entries[1].credit_account, "2200");
  assert.strictEqual(entries[1].amount, 67.5);

  // Entry 3: Debit 5100 (COGS), Credit 1200 (inventory) = (2*100 + 3*30) = 290
  assert.strictEqual(entries[2].debit_account, "5100");
  assert.strictEqual(entries[2].credit_account, "1200");
  assert.strictEqual(entries[2].amount, 290);
});

test("createSaleJournal uses 1300 (AR) for credit sale", () => {
  resetJournalIdCounter();
  const entries = createSaleJournal(SAMPLE_INVOICE_CREDIT);
  assert.strictEqual(entries[0].debit_account, "1300");
  assert.strictEqual(entries[1].debit_account, "1300");
});

test("createSaleJournal skips VAT entry when VAT is zero", () => {
  resetJournalIdCounter();
  const entries = createSaleJournal(SAMPLE_INVOICE_ZERO_VAT);
  assert.strictEqual(entries.length, 2); // no VAT entry
});

test("createSaleJournal batch is balanced", () => {
  resetJournalIdCounter();
  const entries = createSaleJournal(SAMPLE_INVOICE_CASH);
  const result = validateBatch(entries);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.totalDebits, result.totalCredits);
});

// ── Section 4: Purchase Journal ──
section("4. Purchase Journal");

const SAMPLE_PURCHASE_CREDIT: Purchase = {
  id: "PUR-2026-0001",
  date: "2026-05-05",
  supplier: "SUP-101",
  supplier_name: "مؤسسة المرام",
  items: [
    { part_id: "SKU-001", name: "بستم ديزل", qty: 10, cost: 100 },
  ],
  subtotal: 1000,
  vat: 150,
  total: 1150,
  status: "غير مدفوعة",
};

const SAMPLE_PURCHASE_PAID: Purchase = {
  ...SAMPLE_PURCHASE_CREDIT,
  id: "PUR-2026-0002",
  status: "مدفوعة",
};

test("createPurchaseJournal debits inventory for subtotal", () => {
  resetJournalIdCounter();
  const entries = createPurchaseJournal(SAMPLE_PURCHASE_CREDIT);
  assert.strictEqual(entries[0].debit_account, "1200");
  assert.strictEqual(entries[0].amount, 1000);
});

test("createPurchaseJournal credits AP for unpaid purchase", () => {
  resetJournalIdCounter();
  const entries = createPurchaseJournal(SAMPLE_PURCHASE_CREDIT);
  assert.strictEqual(entries[0].credit_account, "2100");
});

test("createPurchaseJournal credits cash for paid purchase", () => {
  resetJournalIdCounter();
  const entries = createPurchaseJournal(SAMPLE_PURCHASE_PAID);
  assert.strictEqual(entries[0].credit_account, "1100");
});

test("createPurchaseJournal handles VAT correctly", () => {
  resetJournalIdCounter();
  const entries = createPurchaseJournal(SAMPLE_PURCHASE_CREDIT);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[1].debit_account, "2200");
  assert.strictEqual(entries[1].amount, 150);
});

test("createPurchaseJournal batch is balanced", () => {
  resetJournalIdCounter();
  const entries = createPurchaseJournal(SAMPLE_PURCHASE_CREDIT);
  const result = validateBatch(entries);
  assert.strictEqual(result.valid, true);
});

// ── Section 5: Expense Journal ──
section("5. Expense Journal");

const SAMPLE_EXPENSE_RENT: Expense = {
  id: "EXP-001",
  date: "2026-05-01",
  category: "إيجار",
  description: "إيجار المستودع مايو",
  amount: 5000,
  account: "1110",
};

const SAMPLE_EXPENSE_SALARY: Expense = {
  ...SAMPLE_EXPENSE_RENT,
  id: "EXP-002",
  category: "رواتب",
  description: "رواتب الموظفين",
  amount: 4500,
};

const SAMPLE_EXPENSE_UNKNOWN: Expense = {
  ...SAMPLE_EXPENSE_RENT,
  id: "EXP-003",
  category: "غير معروف",
  description: "مصروف متنوع",
  amount: 250,
};

test("createExpenseJournal maps إيجار to 5200", () => {
  resetJournalIdCounter();
  const entries = createExpenseJournal(SAMPLE_EXPENSE_RENT);
  assert.strictEqual(entries[0].debit_account, "5200");
  assert.strictEqual(entries[0].credit_account, "1100");
  assert.strictEqual(entries[0].amount, 5000);
});

test("createExpenseJournal maps رواتب to 5300", () => {
  resetJournalIdCounter();
  const entries = createExpenseJournal(SAMPLE_EXPENSE_SALARY);
  assert.strictEqual(entries[0].debit_account, "5300");
});

test("createExpenseJournal defaults unknown to 5900", () => {
  resetJournalIdCounter();
  const entries = createExpenseJournal(SAMPLE_EXPENSE_UNKNOWN);
  assert.strictEqual(entries[0].debit_account, "5900");
});

test("createExpenseJournal batch is balanced", () => {
  resetJournalIdCounter();
  const entries = createExpenseJournal(SAMPLE_EXPENSE_RENT);
  const result = validateBatch(entries);
  assert.strictEqual(result.valid, true);
});

// ── Section 6: Stock Adjustment Journal ──
section("6. Stock Adjustment Journal");

test("createStockAdjustmentJournal for positive adjustment", () => {
  resetJournalIdCounter();
  const entries = createStockAdjustmentJournal({
    id: "ADJ-001",
    date: "2026-05-10",
    description: "جرد إضافي",
    amount: 1500,
  });
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].debit_account, "1200"); // Inventory UP
  assert.strictEqual(entries[0].credit_account, "5900"); // Other Expenses
  assert.strictEqual(entries[0].amount, 1500);
});

test("createStockAdjustmentJournal for negative adjustment", () => {
  resetJournalIdCounter();
  const entries = createStockAdjustmentJournal({
    id: "ADJ-002",
    date: "2026-05-10",
    description: "تلف مخزون",
    amount: -800,
  });
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].debit_account, "5900"); // Loss
  assert.strictEqual(entries[0].credit_account, "1200"); // Inventory DOWN
  assert.strictEqual(entries[0].amount, 800);
});

test("createStockAdjustmentJournal returns empty for zero amount", () => {
  resetJournalIdCounter();
  const entries = createStockAdjustmentJournal({
    id: "ADJ-003",
    date: "2026-05-10",
    description: "لا شيء",
    amount: 0,
  });
  assert.strictEqual(entries.length, 0);
});

// ── Section 7: Customer Payment Journal ──
section("7. Customer Payment Journal");

test("createPaymentJournal debits cash and credits AR", () => {
  resetJournalIdCounter();
  const entries = createPaymentJournal({
    id: "PAY-001",
    date: "2026-05-15",
    customer: "أحمد الشمري",
    amount: 500,
    method: "نقدي",
  });
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].debit_account, "1100");
  assert.strictEqual(entries[0].credit_account, "1300");
  assert.strictEqual(entries[0].amount, 500);
});

test("createPaymentJournal includes method in description", () => {
  resetJournalIdCounter();
  const entries = createPaymentJournal({
    id: "PAY-002",
    date: "2026-05-15",
    customer: "خالد المطيري",
    amount: 1000,
    method: "تحويل بنكي",
  });
  assert.ok(entries[0].desc.includes("تحويل بنكي"));
});

// ── Section 8: Validation ──
section("8. Validation");

test("validateJournalEntry accepts valid entry", () => {
  const entry = {
    id: "JV-001",
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debit_account: "1100",
    credit_account: "4100",
    amount: 1000,
  };
  const result = validateJournalEntry(entry);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test("validateJournalEntry rejects zero amount", () => {
  const entry = {
    id: "JV-001",
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debit_account: "1100",
    credit_account: "4100",
    amount: 0,
  };
  const result = validateJournalEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("المبلغ")));
});

test("validateJournalEntry rejects negative amount", () => {
  const entry = {
    id: "JV-001",
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debit_account: "1100",
    credit_account: "4100",
    amount: -100,
  };
  const result = validateJournalEntry(entry);
  assert.strictEqual(result.valid, false);
});

test("validateJournalEntry rejects same debit and credit", () => {
  const entry = {
    id: "JV-001",
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debit_account: "1100",
    credit_account: "1100",
    amount: 100,
  };
  const result = validateJournalEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("مختلفين")));
});

test("validateJournalEntry rejects unknown account code", () => {
  const entry = {
    id: "JV-001",
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debit_account: "9999",
    credit_account: "4100",
    amount: 100,
  };
  const result = validateJournalEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("غير موجود")));
});

test("validateJournalEntry rejects invalid date", () => {
  const entry = {
    id: "JV-001",
    date: "not-a-date",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debit_account: "1100",
    credit_account: "4100",
    amount: 100,
  };
  const result = validateJournalEntry(entry);
  assert.strictEqual(result.valid, false);
});

test("validateBatch accepts balanced entries", () => {
  const entries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة 1", debit_account: "1100", credit_account: "4100", amount: 1000 },
    { id: "JV-002", date: "2026-05-15", ref: "EXP-001", desc: "مصروف", debit_account: "5200", credit_account: "1100", amount: 500 },
  ];
  const result = validateBatch(entries);
  assert.strictEqual(result.valid, true);
});

test("validateBatch rejects entries with invalid line", () => {
  const entries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة 1", debit_account: "1100", credit_account: "4100", amount: 1000 },
    { id: "JV-002", date: "bad-date", ref: "EXP-001", desc: "مصروف", debit_account: "5200", credit_account: "1100", amount: 500 },
  ];
  const result = validateBatch(entries);
  assert.strictEqual(result.valid, false);
});

// ── Section 9: Accounting Equation ──
section("9. Accounting Equation");

test("verifyAccountingEquation with balanced accounts", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 50000 },
    { code: "2100", name: "موردين", type: "خصوم", parent: null, system: true, balance: 20000 },
    { code: "3000", name: "حقوق", type: "حقوق ملكية", parent: null, system: true, balance: 30000 },
  ];
  const result = verifyAccountingEquation(accounts);
  assert.strictEqual(result.assets, 50000);
  assert.strictEqual(result.liabilities, 20000);
  assert.strictEqual(result.equity, 30000);
  assert.strictEqual(result.difference, 0);
  assert.strictEqual(result.balanced, true);
});

test("verifyAccountingEquation detects imbalance", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 50000 },
    { code: "2100", name: "موردين", type: "خصوم", parent: null, system: true, balance: 10000 },
    { code: "3000", name: "حقوق", type: "حقوق ملكية", parent: null, system: true, balance: 30000 },
  ];
  const result = verifyAccountingEquation(accounts);
  assert.strictEqual(result.difference, 10000);
  assert.strictEqual(result.balanced, false);
});

test("verifyAccountingEquation includes net income from temporary accounts", () => {
  // During an accounting period, Revenue - Expenses = Net Income
  // The expanded equation: Assets = Liabilities + Equity + (Revenue - Expenses)
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 1200 },
    { code: "3100", name: "رأس مال", type: "حقوق ملكية", parent: null, system: true, balance: 1000 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 500 },
    { code: "5200", name: "إيجار", type: "مصروفات", parent: null, system: true, balance: 300 },
  ];
  const result = verifyAccountingEquation(accounts);
  // Net income = 500 - 300 = 200
  // Assets = 1200, L + E + NI = 0 + 1000 + 200 = 1200 → balanced
  assert.strictEqual(result.assets, 1200);
  assert.strictEqual(result.liabilities, 0);
  assert.strictEqual(result.equity, 1000);
  assert.strictEqual(result.balanced, true);
  assert.strictEqual(result.difference, 0);
});

test("verifyAccountingEquation detects imbalance when net income not covered", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 1000 },
    { code: "3100", name: "رأس مال", type: "حقوق ملكية", parent: null, system: true, balance: 1000 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 500 },
    { code: "5200", name: "إيجار", type: "مصروفات", parent: null, system: true, balance: 300 },
  ];
  const result = verifyAccountingEquation(accounts);
  // Net income = 200, but assets = 1000 < L + E + NI = 1200
  assert.strictEqual(result.balanced, false);
  assert.strictEqual(result.difference, -200);
});

// ── Section 10: Balance Updater ──
section("10. Balance Updater (applyJournalToAccounts)");

test("applyJournalToAccounts increases asset on debit", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 1000 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 0 },
  ];
  const entries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة", debit_account: "1100", credit_account: "4100", amount: 500 },
  ];
  const updated = applyJournalToAccounts(entries, accounts);
  const cash = updated.find((a) => a.code === "1100");
  assert.strictEqual(cash!.balance, 1500); // 1000 + 500
});

test("applyJournalToAccounts increases revenue on credit", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 1000 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 0 },
  ];
  const entries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة", debit_account: "1100", credit_account: "4100", amount: 500 },
  ];
  const updated = applyJournalToAccounts(entries, accounts);
  const revenue = updated.find((a) => a.code === "4100");
  assert.strictEqual(revenue!.balance, 500); // 0 + 500
});

test("applyJournalToAccounts decreases liability on debit", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 5000 },
    { code: "2100", name: "موردين", type: "خصوم", parent: null, system: true, balance: 2000 },
  ];
  const entries = [
    // Pay supplier: Debit AP (decreases liability), Credit Cash
    { id: "JV-001", date: "2026-05-15", ref: "PAY-001", desc: "سداد مورد", debit_account: "2100", credit_account: "1100", amount: 1000 },
  ];
  const updated = applyJournalToAccounts(entries, accounts);
  const ap = updated.find((a) => a.code === "2100");
  const cash = updated.find((a) => a.code === "1100");
  assert.strictEqual(ap!.balance, 1000); // 2000 - 1000
  assert.strictEqual(cash!.balance, 4000); // 5000 - 1000
});

test("applyJournalToAccounts decreases asset on credit", () => {
  const accounts: Account[] = [
    { code: "1200", name: "مخزون", type: "أصول", parent: null, system: true, balance: 10000 },
    { code: "5100", name: "COGS", type: "مصروفات", parent: null, system: true, balance: 0 },
  ];
  const entries = [
    // Cost of goods sold: Debit COGS, Credit Inventory
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "تكلفة بيع", debit_account: "5100", credit_account: "1200", amount: 3000 },
  ];
  const updated = applyJournalToAccounts(entries, accounts);
  const inv = updated.find((a) => a.code === "1200");
  const cogs = updated.find((a) => a.code === "5100");
  assert.strictEqual(inv!.balance, 7000); // 10000 - 3000
  assert.strictEqual(cogs!.balance, 3000); // 0 + 3000
});

test("applyJournalToAccounts does not mutate original", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 1000 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 0 },
  ];
  const entries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة", debit_account: "1100", credit_account: "4100", amount: 500 },
  ];
  const originalCash = accounts[0].balance;
  applyJournalToAccounts(entries, accounts);
  assert.strictEqual(accounts[0].balance, originalCash); // original unchanged
});

test("applyJournalToAccounts handles full sale flow correctly", () => {
  // Start with a set of accounts
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 10000 },
    { code: "1200", name: "مخزون", type: "أصول", parent: null, system: true, balance: 5000 },
    { code: "2200", name: "VAT", type: "خصوم", parent: null, system: true, balance: 0 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 0 },
    { code: "5100", name: "COGS", type: "مصروفات", parent: null, system: true, balance: 0 },
  ];

  // Sale: subtotal=1000, vat=150, total=1150, cogs=600
  const saleEntries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة", debit_account: "1100", credit_account: "4100", amount: 1000 },
    { id: "JV-002", date: "2026-05-15", ref: "INV-001", desc: "VAT", debit_account: "1100", credit_account: "2200", amount: 150 },
    { id: "JV-003", date: "2026-05-15", ref: "INV-001", desc: "COGS", debit_account: "5100", credit_account: "1200", amount: 600 },
  ];

  const updated = applyJournalToAccounts(saleEntries, accounts);

  const cash = updated.find((a) => a.code === "1100");
  const inv = updated.find((a) => a.code === "1200");
  const vat = updated.find((a) => a.code === "2200");
  const rev = updated.find((a) => a.code === "4100");
  const cogs = updated.find((a) => a.code === "5100");

  assert.strictEqual(cash!.balance, 11150);  // 10000 + 1000 + 150
  assert.strictEqual(inv!.balance, 4400);    // 5000 - 600
  assert.strictEqual(vat!.balance, 150);     // 0 + 150
  assert.strictEqual(rev!.balance, 1000);    // 0 + 1000
  assert.strictEqual(cogs!.balance, 600);    // 0 + 600
});

// ── Section 11: Compound Entry Builder ──
section("11. Compound Entry Builder");

test("buildCompoundEntry creates balanced multi-line entry", () => {
  resetJournalIdCounter();
  const entries = buildCompoundEntry(
    "2026-05-15",
    "INV-001",
    "فاتورة بيع مركبة",
    [
      { account: "1100", debit: 1150, credit: 0 },
      { account: "4100", debit: 0, credit: 1000 },
      { account: "2200", debit: 0, credit: 150 },
    ]
  );
  assert.ok(entries.length > 0);
  const result = validateBatch(entries);
  assert.strictEqual(result.valid, true);
});

test("buildCompoundEntry throws on unbalanced lines", () => {
  assert.throws(() => {
    buildCompoundEntry(
      "2026-05-15",
      "INV-001",
      "فاتورة بيع مركبة",
      [
        { account: "1100", debit: 1150, credit: 0 },
        { account: "4100", debit: 0, credit: 900 }, // missing 250
      ]
    );
  });
});

// ── Section 12: Formatting Helpers ──
section("12. Formatting Helpers");

test("formatJournalEntry returns non-empty string with Arabic", () => {
  resetJournalIdCounter();
  const entry = createJournalEntry({
    date: "2026-05-15",
    ref: "INV-001",
    desc: "فاتورة بيع",
    debitAccount: "1100",
    creditAccount: "4100",
    amount: 1000,
  });
  const formatted = formatJournalEntry(entry);
  assert.ok(formatted.includes("مدين"));
  assert.ok(formatted.includes("دائن"));
  assert.ok(formatted.includes("1000.00"));
});

test("formatJournalBatch handles empty array", () => {
  const result = formatJournalBatch([]);
  assert.ok(result.includes("لا توجد"));
});

// ── Section 13: Trial Balance ──
section("13. Trial Balance");

test("buildTrialBalance aggregates correctly", () => {
  const accounts: Account[] = [
    { code: "1100", name: "نقدية", type: "أصول", parent: null, system: true, balance: 1000 },
    { code: "4100", name: "مبيعات", type: "إيرادات", parent: null, system: true, balance: 0 },
  ];
  const entries = [
    { id: "JV-001", date: "2026-05-15", ref: "INV-001", desc: "فاتورة 1", debit_account: "1100", credit_account: "4100", amount: 500 },
    { id: "JV-002", date: "2026-05-15", ref: "INV-002", desc: "فاتورة 2", debit_account: "1100", credit_account: "4100", amount: 300 },
  ];
  const tb = buildTrialBalance(entries, accounts);

  assert.strictEqual(tb["1100"].debit, 800);
  assert.strictEqual(tb["1100"].credit, 0);
  assert.strictEqual(tb["4100"].debit, 0);
  assert.strictEqual(tb["4100"].credit, 800);
});

// ── Section 14: Integration / Full Flow ──
section("14. Integration — Full Accounting Flow");

test("complete flow: sale + purchase + expense keeps equation balanced", () => {
  const accounts: Account[] = [
    { code: "1100", name: "النقدية والبنوك", type: "أصول", parent: null, system: true, balance: 50000 },
    { code: "1200", name: "المخزون", type: "أصول", parent: null, system: true, balance: 30000 },
    { code: "1300", name: "حسابات العملاء", type: "أصول", parent: null, system: true, balance: 5000 },
    { code: "2100", name: "حسابات الموردين", type: "خصوم", parent: null, system: true, balance: 15000 },
    { code: "2200", name: "ضريبة القيمة المضافة", type: "خصوم", parent: null, system: true, balance: 0 },
    { code: "3100", name: "رأس المال", type: "حقوق ملكية", parent: null, system: true, balance: 50000 },
    { code: "3200", name: "الأرباح المحتجزة", type: "حقوق ملكية", parent: null, system: true, balance: 20000 },
    { code: "4100", name: "مبيعات قطع غيار", type: "إيرادات", parent: null, system: true, balance: 0 },
    { code: "5100", name: "تكلفة البضاعة المباعة", type: "مصروفات", parent: null, system: true, balance: 0 },
    { code: "5200", name: "الإيجار", type: "مصروفات", parent: null, system: true, balance: 0 },
  ];

  // 1. Cash sale: subtotal=2000, vat=300, total=2300, cogs=1200
  const sale = createSaleJournal({
    id: "INV-FULL-001",
    date: "2026-05-10",
    customer: "فهد",
    phone: "0500000000",
    items: [{ part_id: "SKU-1", name: "قطعة", qty: 4, price: 500, cost: 300 }],
    subtotal: 2000,
    vat: 300,
    total: 2300,
    payment: "نقدي",
    status: "مكتمل",
  });

  // 2. Credit purchase: subtotal=5000, vat=750, total=5750
  const purchase = createPurchaseJournal({
    id: "PUR-FULL-001",
    date: "2026-05-10",
    supplier: "SUP-1",
    supplier_name: "مؤسسة المرام",
    items: [{ part_id: "SKU-2", name: "قطعة شراء", qty: 10, cost: 500 }],
    subtotal: 5000,
    vat: 750,
    total: 5750,
    status: "غير مدفوعة",
  });

  // 3. Expense: rent=3000
  const expense = createExpenseJournal({
    id: "EXP-FULL-001",
    date: "2026-05-10",
    category: "إيجار",
    description: "إيجار المستودع",
    amount: 3000,
    account: "1100",
  });

  // Apply all
  let updated = applyJournalToAccounts(sale, accounts);
  updated = applyJournalToAccounts(purchase, updated);
  updated = applyJournalToAccounts(expense, updated);

  // Verify equation
  const equation = verifyAccountingEquation(updated);
  assert.strictEqual(equation.balanced, true, `Equation not balanced: diff=${equation.difference}`);

  // Verify specific balances
  const cash = updated.find((a) => a.code === "1100");
  const inv = updated.find((a) => a.code === "1200");
  const ap = updated.find((a) => a.code === "2100");
  const vat = updated.find((a) => a.code === "2200");
  const rev = updated.find((a) => a.code === "4100");
  const cogs = updated.find((a) => a.code === "5100");
  const rent = updated.find((a) => a.code === "5200");

  // Cash: 50000 + 2000 (revenue) + 300 (vat) - 3000 (rent) = 49300
  assert.strictEqual(cash!.balance, 49300);

  // Inventory: 30000 + 5000 (purchase) - 1200 (COGS) = 33800
  assert.strictEqual(inv!.balance, 33800);

  // AP: 15000 + 5000 + 750 = 20750
  assert.strictEqual(ap!.balance, 20750);

  // VAT: Sale credits VAT +300, Purchase debits VAT -750
  // Net VAT balance = 300 - 750 = -450 (credit balance = reclaimable)
  assert.strictEqual(vat!.balance, -450);

  // Revenue: 0 + 2000 = 2000
  assert.strictEqual(rev!.balance, 2000);

  // COGS: 0 + 1200 = 1200
  assert.strictEqual(cogs!.balance, 1200);

  // Rent: 0 + 3000 = 3000
  assert.strictEqual(rent!.balance, 3000);
});

// ═══════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(54));
console.log(`  اختبارات ناجحة: ${passCount}  |  اختبارات فاشلة: ${failCount}`);
console.log("═".repeat(54));

if (failCount > 0) {
  console.log("\n❌ بعض الاختبارات فشلت");
  process.exit(1);
} else {
  console.log("\n✅ جميع الاختبارات نجحت بنجاح — محرك القيود المزدوجة يعمل بكفاءة");
  process.exit(0);
}
