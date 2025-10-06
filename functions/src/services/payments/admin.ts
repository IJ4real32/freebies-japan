import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertAuthedUser, assertAdmin } from "../../utils/backendUtils.js";
import { serverTS } from "../../utils/backendUtils.js";
import { admin } from "../../config/index.js";
import { 
  PaymentQueueRequest, 
  PaymentDetailsRequest, 
  ApproveDepositRequest, 
  RejectDepositRequest 
} from "../../types/index.js";

const db = admin.firestore();

// Common configuration for all payment functions
const paymentConfig = {
  region: "asia-northeast1",
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB" as any, // Fixed: Type assertion to resolve memory type error
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80
};

// ------------------------------------------------------------------
// GET PAYMENT QUEUE (Admin)
// ------------------------------------------------------------------
export const getPaymentQueue = onCall<PaymentQueueRequest>(paymentConfig, async (request) => {
  try {
    assertAuthedUser(request.auth);
    await assertAdmin(request.auth);

    const { status, startAfter } = request.data || {};
    const rawLimit = Number((request.data as any)?.limit ?? 50);
    const safeLimit = Math.min(Math.max(1, rawLimit), 100);

    let queryRef = db.collection("adminInbox") as FirebaseFirestore.Query;

    if (status) {
      queryRef = queryRef.where("status", "==", status);
    }

    queryRef = queryRef.orderBy("createdAt", "desc").limit(safeLimit);

    if (startAfter) {
      const cursorDoc = await db.collection("adminInbox").doc(startAfter).get();
      const cursorCreatedAt = cursorDoc.exists ? cursorDoc.get("createdAt") : null;
      if (cursorCreatedAt) {
        queryRef = queryRef.startAfter(cursorCreatedAt);
      }
    }

    const snapshot = await queryRef.get();

    const allDocs = snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      };
    });

    const payments = allDocs.filter((d: any) => d.kind === "payment");

    const hasMore = snapshot.size === safeLimit;
    const lastVisible = snapshot.docs.length
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return {
      payments: payments.map((p: any) => ({
        id: p.id,
        type: p.type,
        paymentType: p.type,
        status: p.status,
        amount: p.amountJPY,
        targetId: p.itemId,
        paymentId: p.paymentId,
        userId: p.userId,
        userEmail: p.userEmail ?? null,
        userName: p.userName ?? null,
        currency: p.currency,
        code: p.code,
        address: p.address || null,
        createdAt: p.createdAt,
      })),
      hasMore,
      totalCount: payments.length,
      lastVisible,
    };
  } catch (error: any) {
    logger.error("getPaymentQueue error", error);
    throw new HttpsError("internal", "Failed to fetch payment queue");
  }
});

// ------------------------------------------------------------------
// GET PAYMENT DETAILS + REPORTS (Admin)
// ------------------------------------------------------------------
export const getPaymentDetails = onCall<PaymentDetailsRequest>(paymentConfig, async (request) => {
  try {
    assertAuthedUser(request.auth);
    await assertAdmin(request.auth);

    const { paymentId } = request.data || {};
    if (!paymentId) throw new HttpsError("invalid-argument", "Payment ID required");

    // Helpers
    const toMillis = (v: any): number | null => {
      if (!v) return null;
      if (typeof v === "number") return v;
      if (v?.toDate) try { return v.toDate().getTime(); } catch {}
      if (typeof v?.seconds === "number") return Math.round(v.seconds * 1000);
      const t = Date.parse(v as any);
      return isNaN(t) ? null : t;
    };
    const isEmptyAddress = (a: any): boolean => {
      if (!a || typeof a !== "object") return true;
      const keys = ["recipientName","phone","postalCode","prefecture","city","street","building"];
      return !keys.some(k => a[k]);
    };

    // --- Load payment
    const paymentRef = db.doc(`payments/${paymentId}`);
    const snap = await paymentRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Payment not found");
    const raw = snap.data() as any;

    // Normalize timestamps for response
    const createdAtMs = toMillis(raw?.createdAt) ?? toMillis((snap as any).createTime);
    const updatedAtMs = toMillis(raw?.updatedAt) ?? toMillis((snap as any).updateTime);

    // Hydrate address if missing OR empty
    let address = raw?.address && !isEmptyAddress(raw.address) ? raw.address : null;
    if (!address && raw?.userId) {
      try {
        const userDoc = await db.doc(`users/${raw.userId}`).get();
        if (userDoc.exists) {
          const u = userDoc.data() as any;
          const da = u?.defaultAddress;
          if (da && typeof da === "object") {
            address = {
              recipientName: u?.displayName ?? u?.name ?? null,
              phone: da.phone ?? null,
              postalCode: da.zipCode ?? null,
              street: da.address ?? null,
              building: da.roomNumber ?? null,
              prefecture: null,
              city: null,
            };
          }
        }
      } catch (e) {
        logger.warn("Address hydration failed", { paymentId, error: (e as any)?.message });
      }
    }

    // Persist backfills (light merge)
    const mergeUpdate: Record<string, any> = {};
    if (!raw?.createdAt && createdAtMs) mergeUpdate.createdAt = admin.firestore.Timestamp.fromMillis(createdAtMs);
    if (!raw?.updatedAt && updatedAtMs) mergeUpdate.updatedAt = admin.firestore.Timestamp.fromMillis(updatedAtMs);
    if ((!raw?.address || isEmptyAddress(raw.address)) && address) mergeUpdate.address = address;
    if (Object.keys(mergeUpdate).length) {
      try { await paymentRef.set(mergeUpdate, { merge: true }); } catch (e) {
        logger.warn("Non-fatal: backfill merge failed", { paymentId, error: (e as any)?.message });
      }
    }

    // Build normalized payment payload
    const payment = {
      id: snap.id,
      ...raw,
      address: address ?? raw?.address ?? null,
      createdAt: createdAtMs ?? null,
      updatedAt: updatedAtMs ?? null,
    };

    // Reports (newest first) with millis times
    const repSnap = await db.collection(`payments/${paymentId}/reports`)
      .orderBy("when", "desc")
      .limit(50)
      .get();

    const reports = repSnap.docs.map((d) => {
      const r = d.data() as any;
      const toMillis2 = (v: any): number | null => {
        if (!v) return null;
        if (typeof v === "number") return v;
        if (v?.toDate) try { return v.toDate().getTime(); } catch {}
        if (typeof v?.seconds === "number") return Math.round(v.seconds * 1000);
        const t = Date.parse(v as any);
        return isNaN(t) ? null : t;
      };
      return {
        id: d.id,
        ...r,
        when: toMillis2(r?.when),
        createdAt: toMillis2(r?.createdAt) ?? toMillis2(r?.when),
        depositorName: r.depositorName ?? r.transferName ?? null,
        paymentCode: r.paymentCode ?? r.txId ?? null,
        note: r.note ?? r.memo ?? null,
        proofUrls: Array.isArray(r.proofUrls) ? r.proofUrls : (r.receiptUrl ? [r.receiptUrl] : []),
      };
    });

    // Item details if type=item
    let item: any = null;
    if ((payment.type === "item" || payment.paymentType === "item") && payment.targetId) {
      try {
        const itemDoc = await db.doc(`donations/${payment.targetId}`).get();
        if (itemDoc.exists) {
          const it = itemDoc.data() as any;
          const toMillis3 = (v: any): number | null => {
            if (!v) return null;
            if (typeof v === "number") return v;
            if (v?.toDate) try { return v.toDate().getTime(); } catch {}
            if (typeof v?.seconds === "number") return Math.round(v.seconds * 1000);
            const t = Date.parse(v as any);
            return isNaN(t) ? null : t;
          };
          item = {
            id: itemDoc.id,
            title: it?.title ?? null,
            priceJPY: it?.priceJPY ?? null,
            category: it?.category ?? null,
            userId: it?.userId ?? null,
            images: Array.isArray(it?.images) ? it.images : (it?.image ? [it.image] : []),
            createdAt: toMillis3(it?.createdAt),
          };
        }
      } catch (e) {
        logger.warn("Item hydration failed", { paymentId, error: (e as any)?.message });
      }
    }

    return { payment, reports, item };
  } catch (error: any) {
    logger.error("getPaymentDetails error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to fetch payment details");
  }
});

// ------------------------------------------------------------------
// APPROVE DEPOSIT (Admin)
// ------------------------------------------------------------------
export const approveDeposit = onCall<ApproveDepositRequest>(paymentConfig, async (request) => {
  try {
    assertAuthedUser(request.auth);
    await assertAdmin(request.auth);

    const { paymentId, reportId } = request.data || {};
    if (!paymentId || !reportId) {
      throw new HttpsError("invalid-argument", "paymentId and reportId required");
    }

    const paymentRef = db.doc(`payments/${paymentId}`);
    const reportRef = paymentRef.collection("reports").doc(reportId);

    await db.runTransaction(async (tx) => {
      const repSnap = await tx.get(reportRef);
      if (!repSnap.exists) throw new HttpsError("not-found", "Report not found");

      tx.update(reportRef, {
        status: "approved",
        reviewedBy: request.auth?.uid ?? null,
        reviewedAt: serverTS(),
      });
      tx.update(paymentRef, {
        status: "confirmed",
        updatedAt: serverTS(),
      });
    });

    return { ok: true };
  } catch (error: any) {
    logger.error("approveDeposit error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to approve deposit");
  }
});

// ------------------------------------------------------------------
// REJECT DEPOSIT (Admin)
// ------------------------------------------------------------------
export const rejectDeposit = onCall<RejectDepositRequest>(paymentConfig, async (request) => {
  try {
    assertAuthedUser(request.auth);
    await assertAdmin(request.auth);

    const { paymentId, reportId, reason } = request.data || {};
    if (!paymentId || !reportId) {
      throw new HttpsError("invalid-argument", "paymentId and reportId required");
    }

    const paymentRef = db.doc(`payments/${paymentId}`);
    const reportRef = paymentRef.collection("reports").doc(reportId);

    await db.runTransaction(async (tx) => {
      const repSnap = await tx.get(reportRef);
      if (!repSnap.exists) throw new HttpsError("not-found", "Report not found");

      tx.update(reportRef, {
        status: "rejected",
        note: reason ?? null,
        reviewedBy: request.auth?.uid ?? null,
        reviewedAt: serverTS(),
      });
      tx.update(paymentRef, {
        status: "rejected",
        updatedAt: serverTS(),
      });
    });

    return { ok: true };
  } catch (error: any) {
    logger.error("rejectDeposit error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to reject deposit");
  }
});