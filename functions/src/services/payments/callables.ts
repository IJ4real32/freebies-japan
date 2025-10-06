import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertAuthedUser } from "../../utils/backendUtils.js";
import { serverTS, nowTS } from "../../utils/backendUtils.js";
import { admin } from "../../config/index.js";
import { CreateDepositRequestData, ReportDepositData } from "../../types/index.js";

const db = admin.firestore();

// ------------------------------------------------------------------
// CREATE DEPOSIT REQUEST (User)
// ------------------------------------------------------------------
export const createDepositRequest = onCall<CreateDepositRequestData>({
  // Explicit configuration for callable function
  region: "asia-northeast1",
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80
}, async (request) => {
  try {
    const uid = assertAuthedUser(request.auth);
    const { type, targetId, amount, address } = request.data || {};

    if (!type || (type !== "subscription" && type !== "item")) {
      throw new HttpsError("invalid-argument", "Bad type");
    }
    if (!amount || typeof amount !== "number" || amount < 100) {
      throw new HttpsError("invalid-argument", "Invalid amount");
    }

    const makeCode = (u: string) => {
      const base = (u.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4) || "USER").toUpperCase();
      const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
      return `FJ-${base}-${rnd}`;
    };

    const getJpPostBank = () => ({
      provider: "jp-post",
      yucho: { symbol: "12345", number: "67890123" },
      otherBanks: {
        bankName: "ゆうちょ銀行",
        bankCode: "9900",
        branchName: "〇一九",
        branchCode: "019",
        accountType: "普通",
        accountNumber: "1234567",
      },
      accountName: "フリービーズジャパン",
      accountNameKana: "ﾌﾘｰﾋﾞｰｽﾞｼﾞｬﾊﾟﾝ",
    });

    const ref = db.collection("payments").doc();
    const code = makeCode(uid);
    const data = {
      id: ref.id,
      userId: uid,
      type,
      targetId: targetId || null,
      amount: Math.round(amount),
      currency: "JPY",
      status: "pending_deposit",
      code,
      bank: getJpPostBank(),
      address: {
        postalCode: address?.postalCode || null,
        prefecture: address?.prefecture || null,
        city: address?.city || null,
        street: address?.street || null,
        recipientName: address?.recipientName || null,
        phone: address?.phone || null,
      },
      createdAt: nowTS(),
      updatedAt: serverTS(),
    };

    await ref.set(data);
    logger.info("createDepositRequest", { paymentId: ref.id, uid, type, targetId, amount });

    return {
      paymentId: ref.id,
      code,
      amount: data.amount,
      bank: getJpPostBank(),
    };
  } catch (error: any) {
    logger.error("createDepositRequest error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to create deposit request");
  }
});

// ------------------------------------------------------------------
// REPORT DEPOSIT (User)
// ------------------------------------------------------------------
export const reportDeposit = onCall<ReportDepositData>({
  // Explicit configuration for callable function
  region: "asia-northeast1",
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80
}, async (request) => {
  try {
    const uid = assertAuthedUser(request.auth);
    const { paymentId, amount, method, transferName, txId, receiptUrl, proofUrls } =
      request.data || {};

    logger.info("reportDeposit called", { paymentId, uid });
    if (!paymentId) throw new HttpsError("invalid-argument", "Missing paymentId");

    const ref = db.doc(`payments/${paymentId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Payment not found");

    const p = snap.data() as any;
    if (p.userId !== uid) throw new HttpsError("permission-denied", "Not owner");

    let reportedAmount = p.amount;
    if (typeof amount === "number") {
      if (amount < 100) throw new HttpsError("invalid-argument", "Amount too low");
      reportedAmount = Math.round(amount);
    }

    const normalizedProofs: string[] = Array.isArray(proofUrls)
      ? proofUrls.filter(Boolean)
      : receiptUrl
      ? [receiptUrl]
      : [];

    const lastReport: any = {
      when: nowTS(),
      amount: reportedAmount,
      status: "pending",
    };
    if (method) lastReport.method = method;
    if (transferName) lastReport.transferName = transferName;
    if (txId) lastReport.txId = txId;
    if (normalizedProofs.length) lastReport.proofUrls = normalizedProofs;

    const parentUpdates: any = {
      status: "reported",
      updatedAt: serverTS(),
      lastReport,
    };
    if (!p.createdAt) parentUpdates.createdAt = nowTS();

    // backfill/overwrite address if provided
    const addr = (request.data as any)?.address;
    if (addr) {
      parentUpdates.address = {
        recipientName: addr.recipientName ?? p?.address?.recipientName ?? null,
        phone: addr.phone ?? p?.address?.phone ?? null,
        postalCode: addr.postalCode ?? p?.address?.postalCode ?? null,
        prefecture: addr.prefecture ?? p?.address?.prefecture ?? null,
        city: addr.city ?? p?.address?.city ?? null,
        street: addr.street ?? p?.address?.street ?? null,
        building: addr.building ?? p?.address?.building ?? null,
      };
    }

    await ref.set(parentUpdates, { merge: true });

    const reportData: any = {
      userId: uid,
      when: nowTS(),
      status: "pending",
      amount: reportedAmount,
      method: method ?? null,
      transferName: transferName ?? null,
      txId: txId ?? null,
      proofUrls: normalizedProofs,
      depositorName: transferName ?? null,
      paymentCode: txId ?? null,
      reviewedAt: null,
      reviewedBy: null,
    };

    await ref.collection("reports").add(reportData);

    logger.info("reportDeposit success", { paymentId, uid });
    return { ok: true };
  } catch (error: any) {
    logger.error("reportDeposit error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "An unexpected error occurred");
  }
});