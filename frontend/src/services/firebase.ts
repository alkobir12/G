/**
 * ═══════════════════════════════════════════════════════════════
 *   Firebase Configuration & Auth — Parts Pro ERP
 *   Uses Google AI API Key for Firebase Auth + Firestore
 *   Anonymous auth — no login required
 * ═══════════════════════════════════════════════════════════════
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signOut,
  type User,
} from "firebase/auth";
import {
  getFirestore, enableMultiTabIndexedDbPersistence,
  type Firestore,
} from "firebase/firestore";

// ─── Firebase Config (uses Google AI API Key) ────────────────
const firebaseConfig = {
  apiKey:        import.meta.env.VITE_GOOGLE_API_KEY || "AIzaSyBHVVCXSXXp23xo4Igt3VJgww-Ki2MXe3o",
  authDomain:    `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "partspro-erp"}.firebaseapp.com`,
  projectId:     import.meta.env.VITE_FIREBASE_PROJECT_ID || "partspro-erp",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "partspro-erp"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:         import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// ─── Initialize ──────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// ─── Enable offline persistence ──────────────────────────────
try {
  enableMultiTabIndexedDbPersistence(db).catch(() => {
    // Ignore: may fail if private browsing or multi-tab conflict
  });
} catch {
  // ignore
}

// ─── Anonymous Auth ──────────────────────────────────────────
let currentUser: User | null = null;

export async function initAnonymousAuth(): Promise<User | null> {
  try {
    const { user } = await signInAnonymously(auth);
    currentUser = user;
    return user;
  } catch {
    return null;
  }
}

export function getAuthUser(): User | null {
  return currentUser || auth.currentUser;
}

export function isFirebaseReady(): boolean {
  return !!getAuthUser();
}

export function onUserChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
  currentUser = null;
}
