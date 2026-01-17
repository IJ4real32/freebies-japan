// =====================================================
//  PHASE 2 – Functions API Client (CLEAN BUILD – NO LEGACY)
// =====================================================

import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth } from "../firebase";
import { functions } from "../firebase";


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
// FREE REQUEST WORKFLOW — PHASE-2 DEBUG SAFE
// =====================================================

export const onRequestCreateAddTicket = async ({ itemId }) => {
  await ensureFreshIdToken();

  try {
    console.log("🟡 [functionsApi] onRequestCreateAddTicket → start", {
      itemId,
    });

    const callable = httpsCallable(
      functionsRegion,
      "onRequestCreateAddTicket"
    );

    const res = await callable({ itemId });

    console.log("🟢 [functionsApi] callable response FULL:", res);
    console.log("🟢 [functionsApi] callable response.data:", res?.data);

    const data = res?.data;

    // 🚨 HARD GUARD — backend returned nothing
    if (!data || typeof data !== "object") {
      console.error("🔴 [functionsApi] Invalid callable response:", data);
      return {
        ok: false,
        error: "INVALID_RESPONSE",
        message: "Backend returned no data",
      };
    }

    // ✅ Phase-2 idempotent handling
    if (data.alreadyRequested === true) {
      return {
        ok: true,
        alreadyRequested: true,
        availabilityCycle: data.availabilityCycle ?? null,
      };
    }

    if (data.requestCreated === true) {
      return {
        ok: true,
        requestCreated: true,
        requestId: data.requestId ?? null,
        availabilityCycle: data.availabilityCycle ?? null,
      };
    }

    // 🚨 Backend explicitly rejected
    if (data.ok === false || data.error) {
      console.error("🔴 [functionsApi] Backend rejected request:", data);
      return {
        ok: false,
        error: data.error || "BACKEND_REJECTED",
        message: data.message || "Request rejected by backend",
      };
    }
    // ✅ LEGACY / COMPAT SUCCESS SHAPE
if (data.ok === true && data.requestId) {
  return {
    ok: true,
    requestCreated: true,
    requestId: data.requestId,
  };
}

// 🚨 Truly unexpected
console.error("🔴 [functionsApi] Unexpected backend response shape:", data);

return {
  ok: false,
  error: "UNEXPECTED_RESPONSE",
  message: "Unexpected backend response",
  raw: data,
};


   

  } catch (err) {
    console.error("🔴 [functionsApi] Callable invocation FAILED:", {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      stack: err?.stack,
    });

    throw err; // 🔥 IMPORTANT: let Items.js catch this
  }
};

// =====================================================
// TRIAL CREDIT — UNCHANGED
// =====================================================

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

  try {
    const res = await callable({
      requestId,
      deliveryAddress: deliveryAddress.trim(),
      deliveryPhone: deliveryPhone.trim(),
      deliveryInstructions,
      submittedAt: new Date().toISOString(),
    });

    return res?.data || { ok: false };

  } catch (err) {
    /**
     * Firebase callable errors come back like:
     * err.code === "already-exists"
     * err.message includes backend message
     */
    if (
      err?.code === "already-exists" ||
      err?.message?.includes("already been submitted")
    ) {
      return {
        ok: true,
        alreadySubmitted: true,
      };
    }

    // Re-throw all other errors
    throw err;
  }
};

export const recipientConfirmDelivery = async ({ requestId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "recipientConfirmDelivery");
  const res = await callable({ requestId });
  return res?.data || { ok: false };
};


export const triggerShipmentBooking = async ({ donationId }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "triggerShipmentBooking");// @deprecated — Phase-2 does not auto-book shipment
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
// PICKUP SCHEDULING (PHASE 2)
// =====================================================

// Seller proposes pickup dates
export const submitSellerPickupOptions = async ({
  requestId,
  pickupOptions,
}) => {
  await ensureFreshIdToken();

  const callable = httpsCallable(
    functionsRegion,
    "submitSellerPickupOptions"
  );

  const res = await callable({
    requestId,
    pickupOptions,
  });

  return res?.data || { ok: false };
};


// Admin confirms one pickup date
export const confirmPickupDate = async ({
  requestId,
  selectedOption,
}) => {
  await ensureFreshIdToken();

  const callable = httpsCallable(
    functionsRegion,
    "confirmPickupDate"
  );

  const res = await callable({
    requestId,
    selectedOption,
  });

  return res?.data || { ok: false };
};

export const rejectPickupOptions = async ({
  requestId,
  reason,
}) => {
  await ensureFreshIdToken();

  const callable = httpsCallable(
    functionsRegion,
    "rejectPickupOptions"
  );

  const res = await callable({
    requestId,
    reason,
  });

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
// ADMIN: USER DONATION APPROVAL (PHASE 2 CANONICAL)
// =====================================================

export const adminApproveDonation = async ({ donationId }) => {
  await ensureFreshIdToken();

  const callable = httpsCallable(
    functionsRegion,
    "adminApproveDonation"
  );

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
// ADMIN: APPROVE PAYMENT & START DELIVERY (PHASE 2)
// =====================================================

export const adminApprovePaymentAndCreateDelivery = async ({ paymentId }) => {
  await ensureFreshIdToken();

  const callable = httpsCallable(
    functionsRegion,
    "adminApprovePaymentAndCreateDelivery"
  );

  const res = await callable({ paymentId });
  return res?.data || { ok: false };
};
export const adminRejectPayment = async ({ paymentId, reason }) => {
  await ensureFreshIdToken();
  const callable = httpsCallable(functionsRegion, "adminRejectPayment");
  const res = await callable({ paymentId, reason });
  return res?.data || { ok: false };
};

// =====================================================
// ADMIN: DELIVERY BACKFILL (PHASE 2)
// =====================================================

export const adminBackfillDelivery = async ({
  itemId,
  donorType = "seller",
}) => {
  await ensureFreshIdToken();

  const callable = httpsCallable(
    functionsRegion,
    "adminBackfillDelivery"
  );

  const res = await callable({
    itemId,
    donorType,
  });

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
// =====================================================
// FREE ITEM — SELLER HANDOFF CONFIRMATION (PHASE-2)
// =====================================================
export const sellerConfirmDelivery = async ({ requestId }) => {
  if (!requestId) {
    throw new Error("requestId is required");
  }

  const fn = httpsCallable(functions, "sellerConfirmDelivery");
  const res = await fn({ requestId });
  return res.data;
};
