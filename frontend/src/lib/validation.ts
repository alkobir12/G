import { z, type ZodError } from "zod";

/* ============================================================
   TypeScript Interfaces (mirrored from src/data/seed.ts)
   ============================================================ */

export interface Part {
  id: string;
  oem: string;
  name_ar: string;
  brand: string;
  category: string;
  model: string;
  stock: number;
  min_stock: number;
  location: string;
  cost: number;
  price: number;
  wholesale: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  city: string;
  rating: number;
  balance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  total_bought: number;
  last_visit: string;
}

export interface InvoiceItem {
  part_id: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
}

export interface Invoice {
  id: string;
  date: string;
  customer: string;
  phone: string;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  total: number;
  payment: string;
  status: string;
}

export interface PurchaseItem {
  part_id: string;
  name: string;
  qty: number;
  cost: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  supplier_name: string;
  items: PurchaseItem[];
  subtotal: number;
  vat: number;
  total: number;
  status: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  account: string;
  account_name?: string;
  reason?: string;
  party?: string;
}

export interface Account {
  code: string;
  name: string;
  type: string;
  parent: string | null;
  system: boolean;
  balance?: number;
}

export interface AppSettings {
  company_name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string;
  cr_number: string;
  currency: string;
  vat_enabled: boolean;
  vat_rate: number;
  default_template: string;
  invoice_footer: string;
}

/* ============================================================
   1. Field-Level Validators (reusable building blocks)
   ============================================================ */

/** Non-empty trimmed string */
export const requiredString = (msg: string) =>
  z.string({ message: msg }).min(1, msg).trim();

/** Positive number (integer or float) - must be > 0 */
export const positiveNumber = (msg: string) =>
  z.number({ message: msg }).positive(msg);

/** Zero or positive number - must be >= 0 */
export const nonNegativeNumber = (msg: string) =>
  z.number({ message: msg }).nonnegative(msg);

/** Saudi phone format: 05XXXXXXXX or +9665XXXXXXXX */
const SAUDI_PHONE_REGEX = /^(05\d{8}|\+9665\d{8})$/;

export const phoneNumber = (msg?: string) =>
  z
    .string({ message: msg || "رقم الجوال مطلوب" })
    .regex(
      SAUDI_PHONE_REGEX,
      msg || "صيغة رقم الجوال غير صحيحة (مثال: 0555123456 أو +966555123456)"
    );

/** Valid email format */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailValidator = (msg?: string) =>
  z
    .string({ message: msg || "البريد الإلكتروني مطلوب" })
    .regex(EMAIL_REGEX, msg || "صيغة البريد الإلكتروني غير صحيحة");

/** Optional string (accepts empty) */
export const optionalString = z.string().optional().or(z.literal(""));

/** Optional number */
export const optionalNumber = z.number().optional().or(z.nan());

/* ============================================================
   2. Entity Schemas
   ============================================================ */

// --- Part Categories ---
const PART_CATEGORIES = [
  "محرك",
  "تبريد",
  "كهرباء",
  "فرامل",
  "عليق",
  "نقل",
  "هيكل",
  "أخرى",
] as const;

export const PartSchema = z
  .object({
    id: z.string(),
    oem: requiredString("رقم OEM مطلوب").min(
      3,
      "رقم OEM يجب أن يكون 3 أحرف على الأقل"
    ),
    name_ar: requiredString("اسم القطعة بالعربي مطلوب").min(
      2,
      "اسم القطعة يجب أن يكون حرفين على الأقل"
    ),
    brand: requiredString("العلامة التجارية مطلوبة").max(50, "العلامة التجارية يجب أن تكون 50 حرفاً أو أقل"),
    category: requiredString("التصنيف مطلوب").max(50, "التصنيف يجب أن يكون 50 حرفاً أو أقل"),
    model: z.string().default(""),
    stock: z
      .number({ message: "الكمية يجب أن تكون رقماً" })
      .int("الكمية يجب أن تكون رقماً صحيحاً")
      .nonnegative("الكمية يجب أن تكون صفر أو أكبر"),
    min_stock: z
      .number({ message: "الحد الأدنى يجب أن يكون رقماً" })
      .int("الحد الأدنى يجب أن يكون رقماً صحيحاً")
      .positive("الحد الأدنى يجب أن يكون أكبر من الصفر"),
    location: z.string().default(""),
    cost: z
      .number({ message: "سعر التكلفة يجب أن يكون رقماً" })
      .positive("سعر التكلفة يجب أن يكون أكبر من الصفر"),
    price: z
      .number({ message: "سعر البيع يجب أن يكون رقماً" })
      .positive("سعر البيع يجب أن يكون أكبر من الصفر"),
    wholesale: z
      .number({ message: "سعر الجملة يجب أن يكون رقماً" })
      .positive("سعر الجملة يجب أن يكون أكبر من الصفر"),
  })
  .refine((data) => data.min_stock <= data.stock, {
    message: "الحد الأدنى يجب أن يكون أقل من أو يساوي الكمية المتوفرة",
    path: ["min_stock"],
  })
  .refine((data) => data.price >= data.cost, {
    message: "سعر البيع يجب أن يكون أكبر من أو يساوي سعر التكلفة",
    path: ["price"],
  })
  .refine((data) => data.wholesale >= data.cost, {
    message: "سعر الجملة يجب أن يكون أكبر من أو يساوي سعر التكلفة",
    path: ["wholesale"],
  })
  .refine((data) => data.wholesale <= data.price, {
    message: "سعر الجملة يجب أن يكون أقل من أو يساوي سعر البيع",
    path: ["wholesale"],
  });

export const SupplierSchema = z.object({
  id: z.string(),
  name: requiredString("اسم المورد مطلوب").min(
    2,
    "اسم المورد يجب أن يكون حرفين على الأقل"
  ),
  contact: z.string().default(""),
  phone: phoneNumber("رقم جوال المورد مطلوب"),
  city: z.string().default(""),
  rating: z
    .number({ message: "التقييم يجب أن يكون رقماً" })
    .min(0, "التقييم يجب أن يكون بين 0 و 5")
    .max(5, "التقييم يجب أن يكون بين 0 و 5")
    .default(3),
  balance: z.number().default(0),
});

export const CustomerSchema = z.object({
  id: z.string(),
  name: requiredString("اسم العميل مطلوب"),
  phone: phoneNumber("رقم جوال العميل مطلوب"),
  email: z
    .string()
    .regex(EMAIL_REGEX, "صيغة البريد الإلكتروني غير صحيحة")
    .or(z.literal(""))
    .default(""),
  address: z.string().default(""),
  balance: z.number().default(0),
  total_bought: z.number().default(0),
  last_visit: z.string().default(""),
});

export const InvoiceItemSchema = z.object({
  part_id: requiredString("معرف القطعة مطلوب"),
  name: requiredString("اسم القطعة مطلوب"),
  qty: z
    .number({ message: "الكمية يجب أن تكون رقماً" })
    .int("الكمية يجب أن تكون رقماً صحيحاً")
    .positive("الكمية يجب أن تكون أكبر من الصفر"),
  price: z
    .number({ message: "السعر يجب أن يكون رقماً" })
    .positive("السعر يجب أن يكون أكبر من الصفر"),
  cost: z.number().default(0),
});

export const InvoiceSchema = z
  .object({
    id: z.string(),
    date: z.string().default(() => new Date().toISOString().split("T")[0]),
    customer: requiredString("اسم العميل مطلوب"),
    phone: phoneNumber("رقم جوال العميل مطلوب"),
    items: z
      .array(InvoiceItemSchema, { message: "يجب إضافة صنف واحد على الأقل" })
      .min(1, "الفاتورة يجب أن تحتوي على صنف واحد على الأقل"),
    subtotal: z.number().default(0),
    vat: z.number().default(0),
    total: z.number({ message: "الإجمالي مطلوب" }),
    payment: z.string().default("نقدي"),
    status: z.string().default("مفتوحة"),
  })
  .refine(
    (data) => Math.abs(data.total - (data.subtotal + data.vat)) < 0.01,
    {
      message:
        "إجمالي الفاتورة يجب أن يساوي المجموع الفرعي + ضريبة القيمة المضافة",
      path: ["total"],
    }
  );

export const ExpenseSchema = z.object({
  id: z.string(),
  date: z.string().default(() => new Date().toISOString().split("T")[0]),
  category: requiredString("تصنيف المصروف مطلوب"),
  description: requiredString("وصف المصروف مطلوب").min(
    3,
    "وصف المصروف يجب أن يكون 3 أحرف على الأقل"
  ),
  amount: z
    .number({ message: "المبلغ يجب أن يكون رقماً" })
    .positive("المبلغ يجب أن يكون أكبر من الصفر"),
  account: requiredString("الحساب مطلوب"),
  account_name: z.string().optional(),
  reason: z.string().optional(),
  party: z.string().optional(),
});

// --- Account Types ---
const ACCOUNT_TYPES = [
  "أصول",
  "خصوم",
  "حقوق ملكية",
  "إيرادات",
  "مصروفات",
] as const;

export const AccountSchema = z.object({
  code: requiredString("كود الحساب مطلوب")
    .length(4, "كود الحساب يجب أن يكون 4 أرقام")
    .regex(/^\d{4}$/, "كود الحساب يجب أن يتكون من 4 أرقام"),
  name: requiredString("اسم الحساب مطلوب"),
  type: z.enum(ACCOUNT_TYPES, {
    message:
      "نوع الحساب يجب أن يكون أصول أو خصوم أو حقوق ملكية أو إيرادات أو مصروفات",
  }),
  parent: z.string().nullable().default(null),
  system: z.boolean().default(false),
  balance: z.number().default(0),
});

export const SettingsSchema = z.object({
  company_name: requiredString("اسم الشركة مطلوب"),
  logo: z.string().default(""),
  address: z.string().default(""),
  phone: z.string().default(""),
  email: z
    .string()
    .regex(EMAIL_REGEX, "صيغة البريد الإلكتروني غير صحيحة")
    .or(z.literal(""))
    .default(""),
  vat_number: z.string().default(""),
  cr_number: z.string().default(""),
  currency: z.string().default("ريال"),
  vat_enabled: z.boolean().default(true),
  vat_rate: z
    .number({ message: "نسبة الضريبة يجب أن تكون رقماً" })
    .min(0, "نسبة الضريبة يجب أن تكون بين 0 و 1")
    .max(1, "نسبة الضريبة يجب أن تكون بين 0 و 1")
    .default(0.15),
  default_template: z.string().default("A4"),
  invoice_footer: z.string().default("شكراً لتعاملكم معنا"),
});

/* ============================================================
   3. Composite Validators (return structured results)
   ============================================================ */

export interface ValidationResult<T> {
  success: boolean;
  errors: string[];
  data?: T;
}

export function validatePart(data: unknown): ValidationResult<Part> {
  const result = PartSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as Part };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

export function validateSupplier(data: unknown): ValidationResult<Supplier> {
  const result = SupplierSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as Supplier };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

export function validateCustomer(data: unknown): ValidationResult<Customer> {
  const result = CustomerSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as Customer };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

export function validateInvoice(data: unknown): ValidationResult<Invoice> {
  const result = InvoiceSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as Invoice };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

export function validateExpense(data: unknown): ValidationResult<Expense> {
  const result = ExpenseSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as Expense };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

export function validateAccount(data: unknown): ValidationResult<Account> {
  const result = AccountSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as Account };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

export function validateSettings(
  data: unknown
): ValidationResult<AppSettings> {
  const result = SettingsSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [], data: result.data as AppSettings };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

/* ============================================================
   4. Helper Functions
   ============================================================ */

/** Extract Arabic error messages from a ZodError into a flat string array */
export function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "عام";
    return `${issue.message} (${path})`;
  });
}

/** Quick email validation check */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/** Quick Saudi phone validation check */
export function isValidPhone(phone: string): boolean {
  return SAUDI_PHONE_REGEX.test(phone);
}

/** Quick positive number check */
export function isPositiveNumber(n: unknown): boolean {
  return typeof n === "number" && !isNaN(n) && isFinite(n) && n > 0;
}
