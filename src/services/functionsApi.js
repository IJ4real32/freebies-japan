// =====================================================
//  PHASE 2 – Functions API Client (CLEAN BUILD – NO LEGACY)
// =====================================================

import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth } from "../firebase";

// -----------------------------------------------------
// Region-locked Functions Instance
// -----------------------------------------------------
const functionsRegion = getFunctions(app, "asia-northeast1");

// -----------------------------------------------------
// Auth Token Helper
// -----------------------------------------------------
async function ensureFreshIdToken(optional = false) {
  const user = auth.currentUser;

  if (!user) {
    if (optional) return null;
    throw new Error("Unauthenticated — please log in.");
  }

  return await user.getIdToken(true);
}

// =====================================================
// PREMIUM DEPOSIT WORKFLOW
// =====================================================

export const createDepositRequest = async ({
  itemId,
  amount,
  method = "bank_transfer",
  receiptUrl,
  deliveryInfo,
  note = "",
}) => {
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

// alias
export const createDeposit = createDepositRequest;

export const reportDeposit = async (payload) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "reportDeposit");
  const res = await callable(payload);
  return res?.data || { ok: false };
};

// =====================================================
// PREMIUM STATUS WORKFLOW
// =====================================================

export const updatePremiumStatus = async ({ itemId, status }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "updatePremiumStatus");
  const res = await callable({ itemId, status });
  return res?.data || { ok: false };
};

export const cancelPremiumTransaction = async ({ itemId, reason }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "cancelPremiumTransaction");
  const res = await callable({ itemId, reason });
  return res?.data || { ok: false };
};

// =====================================================
// FREE REQUEST WORKFLOW
// =====================================================

export const onRequestCreateAddTicket = async ({ itemId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "onRequestCreateAddTicket");
  const res = await callable({ itemId });
  return res?.data || { ok: false };
};

// decrement trial credit
export const decrementTrialCredit = async () => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "decrementTrialCredit");
  const res = await callable({});
  return res?.data || { ok: false };
};

// =====================================================
// DELIVERY WORKFLOW
// =====================================================

export const submitDeliveryDetails = async ({
  requestId,
  deliveryAddress,
  deliveryPhone,
  deliveryInstructions = "",
}) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "submitDeliveryDetails");

  const res = await callable({
    requestId,
    deliveryAddress: deliveryAddress.trim(),
    deliveryPhone: deliveryPhone.trim(),
    deliveryInstructions,
    submittedAt: new Date().toISOString(),
  });

  return res?.data || { ok: false };
};

export const recipientConfirmDelivery = async ({ donationId, accepted }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "recipientConfirmDelivery");
  const res = await callable({ donationId, accepted });
  return res?.data || { ok: false };
};

export const triggerShipmentBooking = async ({ donationId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "triggerShipmentBooking");
  const res = await callable({ donationId });
  return res?.data || { ok: false };
};

export const cancelDonationForDonor = async ({ donationId, reason }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "onDonationCancel");
  const res = await callable({ donationId, reason });
  return res?.data || { ok: false };
};

// =====================================================
// ADMIN: FREE ITEM REQUEST MODERATION
// =====================================================

export const adminUpdateRequestStatus = async ({ requestId, status, note = "" }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "onRequestStatusUpdate");
  const res = await callable({ requestId, status, note });
  return res?.data || { ok: false };
};

export const adminRunLottery = async ({ itemId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminRunLottery");
  const res = await callable({ itemId });
  return res?.data || { ok: false };
};

export const adminRelistDonation = async ({ donationId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminRelistDonation");
  const res = await callable({ donationId });
  return res?.data || { ok: false };
};

// =====================================================
// ADMIN: MONEY DONATIONS
// =====================================================

export const createMoneyDonation = async ({ amountJPY, message, proofUrl }) => {
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

export const adminVerifyMoneyDonation = async ({ donationId, verify, note }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "verifyMoneyDonation_Admin");
  const res = await callable({ donationId, verify, note });
  return res?.data || { ok: false };
};

// =====================================================
// PAYMENT HANDLING (DEPOSIT + COD)
// =====================================================

export const adminApproveDeposit = async ({ paymentId, reportId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "approveDeposit");
  const res = await callable({ paymentId, reportId });
  return res?.data || { ok: false };
};

export const adminRejectDeposit = async ({ paymentId, reportId, reason }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "rejectDeposit");
  const res = await callable({ paymentId, reportId, reason });
  return res?.data || { ok: false };
};

export const markPaymentDelivered = async ({ paymentId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "markPaymentDelivered");
  const res = await callable({ paymentId });
  return res?.data || { ok: false };
};

// =====================================================
// NOTIFICATIONS
// =====================================================

export const sendPlatformNotification = async (payload) => {
  await ensureFreshIdToken(true);
  const callable = httpsCallable(functionsRegion, "sendPlatformNotification");
  const res = await callable(payload);
  return res?.data || { ok: false };
};

export const sendAdminItemStatusEmail = async (payload) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "sendAdminItemStatusEmail");
  const res = await callable(payload);
  return res?.data || { ok: false };
};

export const sendUserItemStatusUpdate = async (payload) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "sendUserItemStatusUpdate");
  const res = await callable(payload);
  return res?.data || { ok: false };
};

// =====================================================
// HEALTH CHECK
// =====================================================

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
    throw new Error(`Ping failed: ${res.status}`);
  }

  return res.json();
};
