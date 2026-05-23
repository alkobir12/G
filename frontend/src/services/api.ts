// ═══════════════════════════════════════════════════════════
// Parts Pro API Client — Frontend to FastAPI Backend
// ═══════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || "https://partspro-api.onrender.com";

// ═══ Helper ═══
async function api(method: string, path: string, body?: any) {
  const url = `${API_BASE}${path}`;
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

// ═══ Parts ═══
export const PartsAPI = {
  list: () => api("GET", "/api/parts"),
  create: (part: any) => api("POST", "/api/parts", part),
  update: (id: string, part: any) => api("PUT", `/api/parts/${id}`, part),
  delete: (id: string) => api("DELETE", `/api/parts/${id}`),
};

// ═══ Invoices ═══
export const InvoicesAPI = {
  list: () => api("GET", "/api/invoices"),
  create: (invoice: any) => api("POST", "/api/invoices", invoice),
  delete: (id: string) => api("DELETE", `/api/invoices/${id}`),
};

// ═══ Customers ═══
export const CustomersAPI = {
  list: () => api("GET", "/api/customers"),
  create: (customer: any) => api("POST", "/api/customers", customer),
};

// ═══ Suppliers ═══
export const SuppliersAPI = {
  list: () => api("GET", "/api/suppliers"),
  create: (supplier: any) => api("POST", "/api/suppliers", supplier),
};

// ═══ Purchases ═══
export const PurchasesAPI = {
  list: () => api("GET", "/api/purchases"),
  create: (purchase: any) => api("POST", "/api/purchases", purchase),
};

// ═══ Expenses ═══
export const ExpensesAPI = {
  list: () => api("GET", "/api/expenses"),
  create: (expense: any) => api("POST", "/api/expenses", expense),
};

// ═══ Accounts ═══
export const AccountsAPI = {
  list: () => api("GET", "/api/accounts"),
  ledger: (code: string) => api("GET", `/api/accounts/${code}/ledger`),
};

// ═══ Liquid System ═══
export const LiquidsAPI = {
  list: () => api("GET", "/api/liquids"),
  create: (liquid: any) => api("POST", "/api/liquids", liquid),
};

export const VehiclesAPI = {
  list: () => api("GET", "/api/vehicles"),
  create: (vehicle: any) => api("POST", "/api/vehicles", vehicle),
};

export const LiquidTxnsAPI = {
  list: () => api("GET", "/api/liquid-transactions"),
  create: (txn: any) => api("POST", "/api/liquid-transactions", txn),
};

// ═══ POS ═══
export const POSAPI = {
  checkout: (data: any) => api("POST", "/api/pos/checkout", data),
};

// ═══ Full Sync ═══
export const SyncAPI = {
  push: (data: any) => api("POST", "/api/sync", data),
  pull: () => api("GET", "/api/sync"),
};

// ═══ Infobip ═══
export const InfobipAPI = {
  sendSMS: (to: string, message: string) => api("POST", "/api/send-sms", { to, message }),
  sendWhatsApp: (to: string, message: string) => api("POST", "/api/send-whatsapp", { to, message }),
};

// ═══ Finance & Dashboard ═══
export const FinanceAPI = {
  kpiCards: () => api("GET", "/api/v1/finance/dashboard/summary-cards"),
  posCheckout: (data: any) => api("POST", "/api/v1/finance/pos/checkout", data),
  salesChart: (days?: number) => api("GET", `/api/v1/finance/charts/sales-predictive${days ? `?days=${days}` : ""}`),
  inventoryChart: () => api("GET", "/api/v1/finance/charts/inventory-distribution"),
  expenseChart: () => api("GET", "/api/v1/finance/charts/expense-breakdown"),
  profitTrend: (months?: number) => api("GET", `/api/v1/finance/charts/profit-trend${months ? `?months=${months}` : ""}`),
  balanceSheet: () => api("GET", "/api/v1/finance/reports/balance-sheet"),
  incomeStatement: () => api("GET", "/api/v1/finance/reports/income-statement"),
  cashFlow: () => api("GET", "/api/v1/finance/reports/cash-flow"),
};

// ═══ Health ═══
export const HealthAPI = {
  check: () => api("GET", "/health"),
};
