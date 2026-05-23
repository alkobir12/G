/**
 * ═══════════════════════════════════════════════════════════════
 *   useFirestoreSync — React Hook for Real-time Firestore Sync
 *   Listens to Firestore changes and syncs with local state
 *   Falls back to localStorage when Firebase is offline
 * ═══════════════════════════════════════════════════════════════
 */
import { useRef, useCallback } from "react";
import { initAnonymousAuth, isFirebaseReady, onUserChange } from "../services/firebase";
import {
  subscribeToAllCollections, syncAllToFirestore, fetchAllFromFirestore,
  saveItem, deleteItem as deleteFirestoreItem, logActivity,
} from "../services/firestore";
import type {
  Part, Supplier, Customer, Invoice, Purchase, Expense, Account, JournalEntry, AppSettings,
} from "../data/seed";

interface SyncState {
  parts: Part[];
  suppliers: Supplier[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  accounts: Account[];
  journal: JournalEntry[];
  settings: AppSettings;
}

type Setters = {
  setParts:      React.Dispatch<React.SetStateAction<Part[]>>;
  setSuppliers:  React.Dispatch<React.SetStateAction<Supplier[]>>;
  setCustomers:  React.Dispatch<React.SetStateAction<Customer[]>>;
  setInvoices:   React.Dispatch<React.SetStateAction<Invoice[]>>;
  setPurchases:  React.Dispatch<React.SetStateAction<Purchase[]>>;
  setExpenses:   React.Dispatch<React.SetStateAction<Expense[]>>;
  setAccounts:   React.Dispatch<React.SetStateAction<Account[]>>;
  setJournal:    React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  setSettings:   React.Dispatch<React.SetStateAction<AppSettings>>;
};

// ─── Main Hook ──────────────────────────────────────────────
export function useFirestoreSync(
  setters: Setters,
  localData: SyncState,
  addToast: (msg: string, type?: "info" | "success" | "error" | "warning") => void
) {
  const isSyncing = useRef(false);
  const initialized = useRef(false);

  // Initialize: try Firebase, fallback to localStorage
  const init = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;

    // Try anonymous auth
    const user = await initAnonymousAuth();

    if (!user) {
      addToast("وضع عدم الاتصال — البيانات محلية فقط", "warning");
      return;
    }

    addToast("متصل بـ Google Cloud", "success");

    // Try to load from Firestore first
    try {
      const cloudData = await fetchAllFromFirestore();
      const hasCloudData =
        cloudData.parts.length > 0 ||
        cloudData.invoices.length > 0 ||
        cloudData.purchases.length > 0;

      if (hasCloudData) {
        // Cloud has data — use it
        setters.setParts(cloudData.parts);
        setters.setSuppliers(cloudData.suppliers);
        setters.setCustomers(cloudData.customers);
        setters.setInvoices(cloudData.invoices);
        setters.setPurchases(cloudData.purchases);
        setters.setExpenses(cloudData.expenses);
        setters.setAccounts(cloudData.accounts);
        setters.setJournal(cloudData.journal);
        if (cloudData.settings) setters.setSettings(cloudData.settings);
        addToast("تم تحميل البيانات من Google Cloud", "success");
      } else {
        // No cloud data — push local data up
        await syncAllToFirestore(localData);
        addToast("تم رفع البيانات المحلية إلى Google Cloud", "success");
      }
    } catch {
      addToast("فشل الاتصال بـ Google Cloud — وضع محلي", "warning");
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToAllCollections({
      parts:      (items) => { if (!isSyncing.current) setters.setParts(items); },
      suppliers:  (items) => { if (!isSyncing.current) setters.setSuppliers(items); },
      customers:  (items) => { if (!isSyncing.current) setters.setCustomers(items); },
      invoices:   (items) => { if (!isSyncing.current) setters.setInvoices(items); },
      purchases:  (items) => { if (!isSyncing.current) setters.setPurchases(items); },
      expenses:   (items) => { if (!isSyncing.current) setters.setExpenses(items); },
      accounts:   (items) => { if (!isSyncing.current) setters.setAccounts(items); },
      journal:    (items) => { if (!isSyncing.current) setters.setJournal(items); },
      settings:   (item)  => { if (!isSyncing.current && item) setters.setSettings(item); },
    });

    // Listen to auth state changes
    const unsubAuth = onUserChange((user) => {
      if (!user) {
        addToast("انقطع الاتصال بـ Google Cloud", "warning");
      }
    });

    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, []);

  // Push data to Firestore whenever local state changes
  const pushToCloud = useCallback(async (data: SyncState) => {
    if (!isFirebaseReady() || isSyncing.current) return;
    isSyncing.current = true;
    try {
      await syncAllToFirestore(data);
    } catch {
      // silently fail
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Save single item to Firestore
  const saveToCloud = useCallback(async (
    collection: keyof Omit<SyncState, "settings">,
    item: any
  ) => {
    if (!isFirebaseReady()) return;
    await saveItem(collection, item);
  }, []);

  // Delete item from Firestore
  const deleteFromCloud = useCallback(async (
    collection: keyof Omit<SyncState, "settings">,
    id: string
  ) => {
    if (!isFirebaseReady()) return;
    await deleteFirestoreItem(collection, id);
  }, []);

  // Log activity
  const log = useCallback(async (action: string, details: Record<string, any>) => {
    if (!isFirebaseReady()) return;
    await logActivity(action, details);
  }, []);

  return { init, pushToCloud, saveToCloud, deleteFromCloud, log, isFirebaseReady };
}
