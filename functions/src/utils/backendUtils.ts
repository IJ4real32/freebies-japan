/* eslint-disable @typescript-eslint/no-explicit-any */

import * as admin from "firebase-admin";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// ------------------------------------------------------------------
// Firebase Admin Initialization (safe singleton)
// ------------------------------------------------------------------
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error) {
  logger.error("Admin initialization error", error);
}

export const db = admin.firestore();

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type AuthCtx = CallableRequest["auth"];

// ------------------------------------------------------------------
// Timestamp helpers
// ------------------------------------------------------------------
export const serverTS = () => admin.firestore.FieldValue.serverTimestamp();
export const nowTS = () => admin.firestore.Timestamp.now();

// Converts Firestore Timestamp | ISO string | millis -> millis | null
export const toMillisLoose = (v: any): number | null => {
  if (!v) return null;
  try {
    if (typeof v?.toMillis === "function") return v.toMillis();
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const ms = Date.parse(v);
      return Number.isFinite(ms) ? ms : null;
    }
  } catch (error) {
    logger.warn("Error in toMillisLoose", { value: v, error });
    return null;
  }
  return null;
};

// ------------------------------------------------------------------
// Auth helpers
// ------------------------------------------------------------------
export const assertAuthedUser = (auth: AuthCtx): string => {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }
  return auth.uid;
};

export const isAdminFast = async (auth: AuthCtx): Promise<boolean> => {
  const uid = auth?.uid;
  if (!uid) return false;

  // 1) Custom claim
  if ((auth.token as any)?.admin === true) return true;

  // 2) Super admin email
  if (auth.token?.email === "gnetstelecom@gmail.com" && auth.token?.email_verified === true) {
    return true;
  }

  // 3) Check presence in /admins/{uid}
  try {
    const snap = await db.doc(`admins/${uid}`).get();
    return snap.exists;
  } catch (error) {
    logger.error("Error checking admin status", { uid, error });
    return false;
  }
};

export const assertAdmin = async (auth: AuthCtx) => {
  if (!(await isAdminFast(auth))) {
    throw new HttpsError("permission-denied", "Admin only");
  }
};

// ------------------------------------------------------------------
// Lottery helpers
// ------------------------------------------------------------------
export function parseIsoOrNull(s?: string | null): admin.firestore.Timestamp | null | undefined {
  if (s === undefined) return undefined;
  if (s === null) return null;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return admin.firestore.Timestamp.fromDate(d);
  } catch (error) {
    logger.warn("Error parsing ISO date", { input: s, error });
    return null;
  }
}

export function randomPick<T>(arr: T[], k: number, seed?: string): T[] {
  let rnd = Math.random;
  if (seed) {
    // simple xorshift based on a hashed seed (keeps deps zero)
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let state = h >>> 0;
    rnd = () => {
      state ^= state << 13; state >>>= 0;
      state ^= state >>> 17; state >>>= 0;
      state ^= state << 5;  state >>>= 0;
      return (state >>> 0) / 4294967296;
    };
  }
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, Math.min(k, a.length)));
}