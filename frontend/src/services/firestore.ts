/**
 * ═══════════════════════════════════════════════════════════════
 *   Firestore CRUD Service — Parts Pro ERP
 *   Real-time sync with offline persistence
 *   All data stored in Google Cloud Firestore
 * ═══════════════════════════════════════════════════════════════
 */
import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  onSnapshot, query, writeBatch, type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseReady } from "./firebase";
import type {
  Part, Supplier, Customer, Invoice, Purchase, Expense, Account, JournalEntry, AppSettings,
} from "../data/seed";

// ─── Collection References ───────────────────────────────────
const COLLECTIONS = {
  parts:      () => collection(db, "parts"),
  suppliers:  () => collection(db, "suppliers"),
  customers:  () => collection(db, "customers"),
  invoices:   () => collection(db, "invoices"),
  purchases:  () => collection(db, "purchases"),
  expenses:   () => collection(db, "expenses"),
  accounts:   () => collection(db, "accounts"),
  journal:    () => collection(db, "journal"),
  settings:   () => doc(db, "config", "settings"),
  activity:   () => collection(db, "activity_logs"),
};

// ─── Type: Full App Data ─────────────────────────────────────
export interface AppData {
  parts: Part[];
  suppliers: Supplier[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  accounts: Account[];
  journal: JournalEntry[];
  settings: AppSettings | null;
}

// ─── Helper: Collection name to collection ref ───────────────
function getCollection(name: keyof Omit<AppData, "settings">) {
  return COLLECTIONS[name]();
}

// ─── Generic: Save single item ──────────────────────────────
export async function saveItem(
  collectionName: keyof Omit<AppData, "settings">,
  item: any
): Promise<boolean> {
  if (!isFirebaseReady()) return false;
  try {
    const idField = collectionName === "accounts" ? "code" : "id";
    const id = item[idField] || item.id || Date.now().toString();
    await setDoc(doc(db, collectionName, id), item);
    return true;
  } catch {
    return false;
  }
}

// ─── Generic: Delete item ───────────────────────────────────
export async function deleteItem(
  collectionName: keyof Omit<AppData, "settings">,
  id: string
): Promise<boolean> {
  if (!isFirebaseReady() || !id) return false;
  try {
    await deleteDoc(doc(db, collectionName, id));
    return true;
  } catch {
    return false;
  }
}

// ─── Generic: Get all items from a collection ───────────────
export async function getAllItems<T>(
  collectionName: keyof Omit<AppData, "settings">
): Promise<T[]> {
  if (!isFirebaseReady()) return [];
  try {
    const snap = await getDocs(query(getCollection(collectionName)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
  } catch {
    return [];
  }
}

// ─── Generic: Save multiple items (batch) ───────────────────
export async function saveAllItems(
  collectionName: keyof Omit<AppData, "settings">,
  items: any[]
): Promise<boolean> {
  if (!isFirebaseReady() || items.length === 0) return false;
  try {
    // Firestore batch limit is 500
    const chunkSize = 450;
    const idField = collectionName === "accounts" ? "code" : "id";
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const id = item[idField] || item.id || doc(getCollection(collectionName)).id;
        const ref = doc(db, collectionName, id);
        batch.set(ref, item, { merge: true });
      });
      await batch.commit();
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Settings: Save ─────────────────────────────────────────
export async function saveSettings(settings: AppSettings): Promise<boolean> {
  if (!isFirebaseReady()) return false;
  try {
    await setDoc(COLLECTIONS.settings(), settings);
    return true;
  } catch {
    return false;
  }
}

// ─── Settings: Get ──────────────────────────────────────────
export async function getSettings(): Promise<AppSettings | null> {
  if (!isFirebaseReady()) return null;
  try {
    const snap = await getDoc(COLLECTIONS.settings());
    return (snap.data() as AppSettings) || null;
  } catch {
    return null;
  }
}

// ─── Full Sync: Push ALL data to Firestore ──────────────────
export async function syncAllToFirestore(data: AppData): Promise<boolean> {
  const promises = [
    saveAllItems("parts",      data.parts),
    saveAllItems("suppliers",  data.suppliers),
    saveAllItems("customers",  data.customers),
    saveAllItems("invoices",   data.invoices),
    saveAllItems("purchases",  data.purchases),
    saveAllItems("expenses",   data.expenses),
    saveAllItems("accounts",   data.accounts),
    saveAllItems("journal",    data.journal),
    data.settings ? saveSettings(data.settings) : Promise.resolve(true),
  ];
  const results = await Promise.all(promises);
  return results.every((r) => r);
}

// ─── Full Sync: Pull ALL data from Firestore ────────────────
export async function fetchAllFromFirestore(): Promise<AppData> {
  const [
    parts, suppliers, customers, invoices,
    purchases, expenses, accounts, journal, settings,
  ] = await Promise.all([
    getAllItems<Part>("parts"),
    getAllItems<Supplier>("suppliers"),
    getAllItems<Customer>("customers"),
    getAllItems<Invoice>("invoices"),
    getAllItems<Purchase>("purchases"),
    getAllItems<Expense>("expenses"),
    getAllItems<Account>("accounts"),
    getAllItems<JournalEntry>("journal"),
    getSettings(),
  ]);
  return { parts, suppliers, customers, invoices, purchases, expenses, accounts, journal, settings };
}

// ─── Real-time: Subscribe to a collection ───────────────────
export function subscribeToCollection<T>(
  collectionName: keyof Omit<AppData, "settings">,
  callback: (items: T[]) => void
): Unsubscribe {
  const q = query(getCollection(collectionName));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
    callback(items);
  }, () => {
    // On error, silently fail (offline mode)
    callback([]);
  });
}

// ─── Real-time: Subscribe to ALL collections ────────────────
export function subscribeToAllCollections(
  callbacks: {
    parts?: (items: Part[]) => void;
    suppliers?: (items: Supplier[]) => void;
    customers?: (items: Customer[]) => void;
    invoices?: (items: Invoice[]) => void;
    purchases?: (items: Purchase[]) => void;
    expenses?: (items: Expense[]) => void;
    accounts?: (items: Account[]) => void;
    journal?: (items: JournalEntry[]) => void;
    settings?: (item: AppSettings | null) => void;
  }
): () => void {
  const unsubscribers: Unsubscribe[] = [];

  if (callbacks.parts)      unsubscribers.push(subscribeToCollection("parts",      callbacks.parts));
  if (callbacks.suppliers)  unsubscribers.push(subscribeToCollection("suppliers",  callbacks.suppliers));
  if (callbacks.customers)  unsubscribers.push(subscribeToCollection("customers",  callbacks.customers));
  if (callbacks.invoices)   unsubscribers.push(subscribeToCollection("invoices",   callbacks.invoices));
  if (callbacks.purchases)  unsubscribers.push(subscribeToCollection("purchases",  callbacks.purchases));
  if (callbacks.expenses)   unsubscribers.push(subscribeToCollection("expenses",   callbacks.expenses));
  if (callbacks.accounts)   unsubscribers.push(subscribeToCollection("accounts",   callbacks.accounts));
  if (callbacks.journal)    unsubscribers.push(subscribeToCollection("journal",    callbacks.journal));
  if (callbacks.settings) {
    unsubscribers.push(
      onSnapshot(COLLECTIONS.settings(), (snap) => {
        callbacks.settings!((snap.data() as AppSettings) || null);
      }, () => callbacks.settings!(null))
    );
  }

  return () => unsubscribers.forEach((u) => u());
}

// ─── Activity Log: Record an action ─────────────────────────
export async function logActivity(
  action: string,
  details: Record<string, any>,
  userId?: string
): Promise<void> {
  if (!isFirebaseReady()) return;
  try {
    const id = `LOG-${Date.now()}`;
    await setDoc(doc(db, "activity_logs", id), {
      id,
      action,
      details,
      user_id: userId || "anonymous",
      timestamp: new Date().toISOString(),
    });
  } catch {
    // silently fail
  }
}

// ─── Export for useFirestore hook ───────────────────────────
export { COLLECTIONS };
