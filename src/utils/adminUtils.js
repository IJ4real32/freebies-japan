// ✅ FILE: src/utils/adminUtils.js
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Low-level probe that inspects multiple admin signals and explains the result.
 * NOTE: Backend authorization currently relies on Firestore: /admins/{uid}.
 * Custom claims or hardcoded email are informational only here.
 */
export const getAdminDetails = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return { isAdminDoc: false, reason: "No user signed in", uid: null, email: null, checks: {} };
  }

  const uid = user.uid;
  const email = user.email ?? null;
  const checks = {
    hasCustomClaim: false,
    hasAdminsDoc: false,
    hardcodedEmailMatch: false,
  };

  // 1) Custom claims (informational)
  try {
    const token = await user.getIdTokenResult(true); // force refresh to get latest claims
    checks.hasCustomClaim = !!token?.claims?.admin;
  } catch (e) {
    console.warn("[adminUtils] Failed to read custom claims:", e);
  }

  // 2) Firestore admins/{uid} (this is what the backend enforces)
  try {
    const adminDoc = await getDoc(doc(db, "admins", uid));
    checks.hasAdminsDoc = adminDoc.exists();
  } catch (e) {
    console.warn("[adminUtils] Failed to read admins/{uid}:", e);
  }

  // 3) Hardcoded email (informational only; NOT used for gating)
  checks.hardcodedEmailMatch = email === "gnetstelecom@gmail.com" && !!user.emailVerified;

  // We report isAdminDoc (backend-aligned) separately from other signals
  return {
    isAdminDoc: checks.hasAdminsDoc, // ✅ this mirrors the backend check
    reason: checks.hasAdminsDoc
      ? "Admin via Firestore: document exists at admins/{uid}"
      : "Not admin: no admins/{uid} doc (custom claim/email are informational only)",
    uid,
    email,
    checks, // { hasCustomClaim, hasAdminsDoc, hardcodedEmailMatch }
  };
};

/**
 * ✅ Returns true ONLY if Firestore has /admins/{uid}.
 * This matches the backend's authorization check to avoid mismatches.
 */
export const isAdmin = async () => {
  const details = await getAdminDetails();
  return !!details.isAdminDoc;
};

/**
 * Helper for pages/routes where you want a clean exception on fail.
 * Use this inside loaders or action handlers.
 */
export const ensureAdminOrThrow = async () => {
  const ok = await isAdmin();
  if (!ok) {
    const { uid, email } = getAuth();
    const msg = `Admin access denied. Create /admins/{uid} in Firestore for this account.`;
    const err = new Error(msg);
    // Helpful context for logs
    err.name = "AdminGuardError";
    err.uid = uid || null;
    err.email = email || null;
    throw err;
  }
};

/**
 * Pretty console output for quick diagnosis in the browser.
 * Call this from anywhere:
 *   await debugWhyNotAdmin();
 */
export const debugWhyNotAdmin = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  console.groupCollapsed("%c[Admin Debug] who am I?", "color:#0b82ff;font-weight:bold");
  if (!user) {
    console.log("No user signed in");
    console.groupEnd();
    return;
  }

  console.log("UID:", user.uid);
  console.log("Email:", user.email);
  console.log("Email verified:", user.emailVerified);

  const details = await getAdminDetails();
  console.log("Backend-aligned isAdmin (admins/{uid}):", details.isAdminDoc);
  console.log("reason:", details.reason);
  console.table(details.checks);

  if (!details.isAdminDoc) {
    console.log(
      "%cTip:",
      "color:#ff9800",
      "To grant admin quickly, create an empty doc at admins/{uid} in Firestore (use the UID shown above)."
    );
  }
  console.groupEnd();
};
