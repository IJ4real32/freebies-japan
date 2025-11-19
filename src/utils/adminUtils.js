// ✅ FILE: src/utils/adminUtils.js
// NOTE: Renamed old checkAdminStatus() to checkAdminStatus()
//       to avoid collision with AuthContext.isAdmin (boolean)

import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Low-level probe that inspects multiple admin signals.
 */
export const getAdminDetails = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return {
      isAdminDoc: false,
      reason: "No user signed in",
      uid: null,
      email: null,
      checks: {},
    };
  }

  const uid = user.uid;
  const email = user.email ?? null;
  const checks = {
    hasCustomClaim: false,
    hasAdminsDoc: false,
    hardcodedEmailMatch: false,
  };

  // 1) Custom claims
  try {
    const token = await user.getIdTokenResult(true);
    checks.hasCustomClaim = !!token?.claims?.admin;
  } catch (e) {
    console.warn("[adminUtils] Failed to read custom claims:", e);
  }

  // 2) Firestore admins/{uid}
  try {
    const adminDoc = await getDoc(doc(db, "admins", uid));
    checks.hasAdminsDoc = adminDoc.exists();
  } catch (e) {
    console.warn("[adminUtils] Failed to read admins/{uid}:", e);
  }

  // 3) Hardcoded email
  checks.hardcodedEmailMatch = email === "gnetstelecom@gmail.com" && !!user.emailVerified;

  return {
    isAdminDoc: checks.hasAdminsDoc,
    reason: checks.hasAdminsDoc
      ? "Admin via Firestore: document exists at admins/{uid}"
      : "Not admin: no admins/{uid} doc",
    uid,
    email,
    checks,
  };
};

/**
 * ⚠️ Renamed old checkAdminStatus() to avoid conflict with AuthContext.isAdmin
 * Use this ONLY for debugging or external checks.
 */
export const checkAdminStatus = async () => {
  const details = await getAdminDetails();
  return !!details.isAdminDoc;
};

/**
 * Throws if no admin doc exists.
 */
export const ensureAdminOrThrow = async () => {
  const ok = await checkAdminStatus();
  if (!ok) {
    const { currentUser } = getAuth();
    const msg =
      `Admin access denied. Create /admins/{uid} in Firestore for this account.`;
    const err = new Error(msg);
    err.name = "AdminGuardError";
    err.uid = currentUser?.uid ?? null;
    err.email = currentUser?.email ?? null;
    throw err;
  }
};

/**
 * Pretty console output for debugging admin issues.
 */
export const debugWhyNotAdmin = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  console.groupCollapsed(
    "%c[Admin Debug] who am I?",
    "color:#0b82ff;font-weight:bold"
  );
  if (!user) {
    console.log("No user signed in");
    console.groupEnd();
    return;
  }

  console.log("UID:", user.uid);
  console.log("Email:", user.email);
  console.log("Email verified:", user.emailVerified);

  const details = await getAdminDetails();
  console.log("Backend-aligned isAdminDoc:", details.isAdminDoc);
  console.log("reason:", details.reason);
  console.table(details.checks);

  if (!details.isAdminDoc) {
    console.log(
      "%cTip:",
      "color:#ff9800",
      "Create an empty doc at admins/{uid} in Firestore."
    );
  }
  console.groupEnd();
};
