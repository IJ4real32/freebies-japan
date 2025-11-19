// ✅ FILE: src/services/functionsApi.js
// Unified client for Firebase Cloud Functions (Gen 2)

import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, app } from "../firebase";

/* =====================================================
   ✅ Initialize Functions
   ===================================================== */
const functionsRegion = getFunctions(app, "asia-northeast1");

/* =====================================================
   ✅ Core Helpers
   ===================================================== */
async function ensureFreshIdToken(optional = false) {
  const u = auth.currentUser;
  if (!u) {
    if (optional) return null;
    throw new Error("unauthenticated: Please sign in");
  }
  return await u.getIdToken(true);
}

/* =====================================================
   ✅ Deposit / Payments
   ===================================================== */
export const createDeposit = async ({
  itemId,
  amount,
  method = "bank_transfer",
  receiptUrl,
  deliveryInfo,
  note = "",
}) => {
  if (!itemId || typeof amount !== "number")
    throw new Error("itemId and amount are required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "createDepositRequest");
  const res = await callable({
    itemId,
    amount,
    currency: "JPY",
    method,
    receiptUrl,
    deliveryInfo,
    note,
  });
  return res?.data || { ok: false };
};

export const reportDeposit = async (payload = {}) => {
  const callable = httpsCallable(functionsRegion, "reportDeposit");
  const res = await callable(payload);
  return res?.data || { ok: false };
};

export const getPaymentDetails = async ({ paymentId }) => {
  if (!paymentId) throw new Error("paymentId is required");
  await ensureFreshIdToken(true);
  const callable = httpsCallable(functionsRegion, "adminGetPaymentDetails");
  const res = await callable({ paymentId });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Trial Credit Functions
   ===================================================== */
export const decrementTrialCredit = async () => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "decrementTrialCredit");
  const res = await callable({});
  return res?.data || { ok: false };
};

export const adminResetTrialCredits = async ({ targetUid, credits = 5 }) => {
  if (!targetUid) throw new Error("targetUid is required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "resetTrialCredits");
  const res = await callable({ targetUid, credits });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Admin Payments & Deposits
   ===================================================== */
export const adminGetPaymentQueue = async (status, limit = 100) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminGetPaymentQueue");
  const res = await callable({ status, limit });
  return res?.data || { ok: false };
};

export const adminApproveDeposit = async ({ paymentId, reportId }) => {
  if (!paymentId) throw new Error("paymentId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "approveDeposit");
  const res = await callable({ paymentId, reportId });
  return res?.data || { ok: false };
};

export const adminRejectDeposit = async ({ paymentId, reportId, reason }) => {
  if (!paymentId) throw new Error("paymentId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "rejectDeposit");
  const res = await callable({ paymentId, reportId, reason });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Admin: Donations, Lottery, Relist, Sponsored
   ===================================================== */
export const adminEndDonationEarly = async ({ itemId }) => {
  if (!itemId) throw new Error("itemId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "onDonationEndEarly");
  const res = await callable({ itemId });
  return res?.data || { ok: false };
};

export const adminRunLottery = async ({ allExpired = false, itemId = null } = {}) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminRunLottery");
  const res = await callable({ allExpired, itemId });
  return res?.data || { ok: false };
};

export const adminRelistDonation = async ({ donationId, durationHours = 48 }) => {
  if (!donationId) throw new Error("donationId is required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminRelistDonation");
  const res = await callable({ donationId, durationHours });
  return res?.data || { ok: false };
};

export const adminCreateSponsoredDonation = async ({
  title,
  description = "",
  images = [],
  durationHours = 48,
}) => {
  if (!title) throw new Error("title is required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminCreateSponsoredDonation");
  const res = await callable({
    title,
    description,
    images,
    durationHours,
    status: "active",
  });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Money Donations
   ===================================================== */
export const createMoneyDonation = async ({
  amountJPY = 1500,
  message = "Platform maintenance donation",
  proofUrl = null,
}) => {
  if (!amountJPY || amountJPY < 100)
    throw new Error("amountJPY must be at least 100 yen.");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "createMoneyDonation");
  const res = await callable({ amountJPY, message, proofUrl });
  return res?.data || { ok: false };
};

export const adminGetMoneyDonationsQueue = async (status, limit = 100) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "getMoneyDonationsQueue_Admin");
  const res = await callable({ status, limit });
  return res?.data || { ok: false };
};

export const adminVerifyMoneyDonation = async ({ donationId, verify, note = "" }) => {
  if (!donationId) throw new Error("donationId is required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "verifyMoneyDonation_Admin");
  const res = await callable({ donationId, verify, note });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ COD Delivery (Admin)
   ===================================================== */
export const markPaymentDelivered = async ({ paymentId }) => {
  if (!paymentId) throw new Error("paymentId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "markPaymentDelivered");
  const res = await callable({ paymentId });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Requests / Notifications
   ===================================================== */
export const adminUpdateRequestStatus = async ({ requestId, status, note = "" }) => {
  if (!requestId || !status) throw new Error("requestId and status required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "onRequestStatusUpdate");
  const res = await callable({ requestId, status, note });
  return res?.data || { ok: false };
};

export const sendAdminItemStatusEmail = async ({
  requestId,
  status,
  userEmail,
  itemTitle,
  note,
}) => {
  if (!userEmail || !requestId || !status)
    throw new Error("userEmail, requestId, and status required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "sendAdminItemStatusEmail");
  const res = await callable({ requestId, status, userEmail, itemTitle, note });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Logistics: Delivery & Shipment (Phase 2)
   ===================================================== */
export const recipientConfirmDelivery = async ({ donationId, accepted }) => {
  if (!donationId) throw new Error("donationId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "recipientConfirmDelivery");
  const res = await callable({ donationId, accepted });
  return res?.data || { ok: false };
};

export const triggerShipmentBooking = async ({ donationId }) => {
  if (!donationId) throw new Error("donationId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "triggerShipmentBooking");
  const res = await callable({ donationId });
  return res?.data || { ok: false };
};

// ✅ Donor cancels a live donation manually (front-end MyActivity)
export const cancelDonationForDonor = async ({ donationId, reason = "donor_closed" }) => {
  if (!donationId) throw new Error("donationId required");
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "onDonationCancel");
  const res = await callable({ donationId, reason });
  return res?.data || { ok: false };
};

// ✅ Platform notification sender (SendGrid + in-app)
export const sendPlatformNotification = async ({
  type,
  to,
  username = "",
  itemTitle = "",
  html = "",
}) => {
  if (!type || !to) throw new Error("type and to required");
  await ensureFreshIdToken(true);
  const callable = httpsCallable(functionsRegion, "sendPlatformNotification");
  const res = await callable({ type, to, username, itemTitle, html });
  return res?.data || { ok: false };
};

/* =====================================================
   ✅ Health Check
   ===================================================== */
export const ping = async () => {
  const token = await ensureFreshIdToken(true).catch(() => null);
  const res = await fetch(
    "https://asia-northeast1-freebies-japan-v2.cloudfunctions.net/ping",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ts: Date.now() }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ping failed: ${res.status} ${text}`);
  }
  return await res.json();
};
