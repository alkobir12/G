// ═══════════════════════════════════════════════════════════════
//   schemaAdapter.ts — frontend ⇄ backend field mapping
// ═══════════════════════════════════════════════════════════════
// The Parts Pro frontend (src/data/seed.ts) and the Supabase schema
// (backend/migration_v2.sql) have slightly different fields per entity.
// These helpers translate between the two so the existing App.tsx code
// can keep using its own type shape while the backend stores its own.
// ═══════════════════════════════════════════════════════════════

export type AnyRow = Record<string, any>;

// ---- Parts ----
// Backend `parts` columns match the frontend Part interface exactly — no transform needed.
export const partToBackend = (p: AnyRow): AnyRow => ({ ...p });
export const partFromBackend = (p: AnyRow): AnyRow => ({
  id: p.id,
  oem: p.oem ?? "",
  name_ar: p.name_ar,
  brand: p.brand ?? "عام",
  category: p.category ?? "عام",
  model: p.model ?? "",
  stock: p.stock ?? 0,
  min_stock: p.min_stock ?? 2,
  location: p.location ?? "",
  cost: Number(p.cost ?? 0),
  price: Number(p.price ?? 0),
  wholesale: Number(p.wholesale ?? 0),
});

// ---- Customers ----
// Frontend: {id, name, phone, email, address, balance, total_bought, last_visit}
// Backend : {id, name, phone, email, type, purchases_count, total_purchases, balance, last_visit}
export const customerToBackend = (c: AnyRow): AnyRow => ({
  id: c.id,
  name: c.name,
  phone: c.phone ?? "",
  email: c.email ?? "",
  type: c.type ?? "نقدي",
  purchases_count: c.purchases_count ?? 0,
  total_purchases: c.total_bought ?? c.total_purchases ?? 0,
  balance: c.balance ?? 0,
  last_visit: c.last_visit ?? "",
});
export const customerFromBackend = (c: AnyRow): AnyRow => ({
  id: c.id,
  name: c.name,
  phone: c.phone ?? "",
  email: c.email ?? "",
  address: c.address ?? "",                          // frontend-only
  balance: Number(c.balance ?? 0),
  total_bought: Number(c.total_purchases ?? 0),       // backend → frontend rename
  last_visit: c.last_visit ?? "",
});

// ---- Suppliers ----
// Frontend: {id, name, contact, phone, city, rating, balance}
// Backend : {id, name, contact, phone, email, address, balance, parts_count, status}
export const supplierToBackend = (s: AnyRow): AnyRow => ({
  id: s.id,
  name: s.name,
  contact: s.contact ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  address: s.city ?? s.address ?? "",                 // frontend.city → backend.address
  balance: s.balance ?? 0,
  parts_count: s.parts_count ?? 0,
  status: s.status ?? "نشط",
});
export const supplierFromBackend = (s: AnyRow): AnyRow => ({
  id: s.id,
  name: s.name,
  contact: s.contact ?? "",
  phone: s.phone ?? "",
  city: s.address ?? "",                              // backend.address → frontend.city
  rating: s.rating ?? 5,                              // frontend-only default
  balance: Number(s.balance ?? 0),
});

// ---- Invoices ----
export const invoiceToBackend = (i: AnyRow): AnyRow => ({
  id: i.id,
  date: i.date,
  customer: i.customer,
  phone: i.phone ?? "",
  items: i.items ?? [],
  subtotal: i.subtotal ?? 0,
  vat: i.vat ?? 0,
  total: i.total ?? 0,
  payment: i.payment ?? "نقدي",
  status: i.status ?? "مكتمل",
});
export const invoiceFromBackend = (i: AnyRow): AnyRow => ({
  ...i,
  subtotal: Number(i.subtotal ?? 0),
  vat: Number(i.vat ?? 0),
  total: Number(i.total ?? 0),
  items: Array.isArray(i.items) ? i.items : [],
});

// ---- Purchases ----
export const purchaseToBackend = (p: AnyRow): AnyRow => ({
  id: p.id,
  date: p.date,
  supplier: p.supplier_name ?? p.supplier ?? "",
  items: p.items ?? [],
  subtotal: p.subtotal ?? 0,
  vat: p.vat ?? 0,
  total: p.total ?? 0,
  status: p.status ?? "مستلم",
});
export const purchaseFromBackend = (p: AnyRow): AnyRow => ({
  id: p.id,
  date: p.date,
  supplier: p.supplier ?? "",
  supplier_name: p.supplier ?? "",
  items: Array.isArray(p.items) ? p.items : [],
  subtotal: Number(p.subtotal ?? 0),
  vat: Number(p.vat ?? 0),
  total: Number(p.total ?? 0),
  status: p.status ?? "مستلم",
});

// ---- Expenses ----
export const expenseToBackend = (e: AnyRow): AnyRow => ({
  id: e.id,
  date: e.date,
  category: e.category,
  amount: e.amount ?? 0,
  description: e.description ?? "",
  vendor: e.party ?? e.vendor ?? "",
  payment: e.payment ?? "نقدي",
});
export const expenseFromBackend = (e: AnyRow): AnyRow => ({
  id: e.id,
  date: e.date,
  category: e.category,
  description: e.description ?? "",
  amount: Number(e.amount ?? 0),
  account: e.account ?? "6110",
  account_name: e.account_name ?? "",
  party: e.vendor ?? "",
  reason: e.description ?? "",
});

// ---- Accounts ----
export const accountToBackend = (a: AnyRow): AnyRow => ({
  code: a.code,
  name: a.name,
  type: a.type ?? "",
  balance: a.balance ?? 0,
  parent: a.parent ?? "",
});
export const accountFromBackend = (a: AnyRow): AnyRow => ({
  code: a.code,
  name: a.name,
  type: a.type ?? "",
  parent: a.parent || null,
  system: true,
  balance: Number(a.balance ?? 0),
});

// ---- Settings ----
export const settingsToBackend = (s: AnyRow): AnyRow => ({
  id: "main",
  company_name: s.company_name ?? "Parts Pro",
  address: s.address ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  vat_number: s.vat_number ?? "",
  cr_number: s.cr_number ?? "",
  currency: s.currency ?? "ر.س",
  vat_enabled: s.vat_enabled ?? true,
  vat_rate: s.vat_rate ?? 0.15,
  invoice_footer: s.invoice_footer ?? "شكراً لتعاملكم معنا",
});
export const settingsFromBackend = (s: AnyRow): AnyRow => ({
  ...s,
  logo: "",
  default_template: "classic",
});
