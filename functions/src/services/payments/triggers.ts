import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { serverTS, nowTS } from "../../utils/backendUtils.js";
import { admin } from "../../config/index.js";

const db = admin.firestore();

// ------------------------------------------------------------------
// ON PAYMENT CREATE TRIGGER
// ------------------------------------------------------------------
export const onPaymentCreate = onDocumentCreated("payments/{paymentId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  try {
    const p = snap.data() as any;
    const paymentId = event.params.paymentId;

    const updates: Record<string, any> = {
      status: p?.status || "pending_deposit",
      updatedAt: serverTS(),
    };

    // Single user doc read, reused below
    let userData: any = null;
    try {
      const userDoc = await db.doc(`users/${p.userId}`).get();
      userData = userDoc.exists ? userDoc.data() : null;
    } catch (userError) {
      logger.warn("Failed to fetch user data", { paymentId, error: userError });
    }

    if (!p.userEmail || !p.userName) {
      updates.userEmail = userData?.email ?? null;
      updates.userName = userData?.displayName ?? userData?.name ?? null;
    }

    // backfill address if missing
    if (!p.address) {
      updates.address = {
        recipientName: userData?.displayName || userData?.name || null,
        phone: userData?.phone || null,
        postalCode: userData?.postalCode || null,
        prefecture: userData?.prefecture || null,
        city: userData?.city || null,
        street: userData?.street || null,
        building: userData?.building || null,
      };
    }

    if (p.type === "item" && p.targetId && (!p.itemTitle || !p.itemPriceJPY)) {
      try {
        const itemDoc = await db.doc(`donations/${p.targetId}`).get();
        if (itemDoc.exists) {
          const item = itemDoc.data();
          updates.itemTitle = item?.title ?? null;
          updates.itemPriceJPY = item?.priceJPY ?? null;
          updates.itemOwnerId = item?.userId ?? null;
        }
      } catch (itemError) {
        logger.warn("Failed to fetch item data", { paymentId, error: itemError });
      }
    }

    await snap.ref.set(updates, { merge: true });

    const ticketId = `pay_${paymentId}`;
    const inboxData = {
      kind: "payment",
      type: p.type,
      status: "pending",
      paymentId,
      itemId: p.targetId ?? null,
      amountJPY: p.amount,
      userId: p.userId,
      userEmail: updates.userEmail || p.userEmail || null,
      userName: updates.userName || p.userName || null,
      currency: "JPY",
      code: p.code,
      address: updates.address || p.address || null,
      createdAt: p.createdAt || nowTS(),
      updatedAt: serverTS(),
      priority: p.amount > 5000 ? "high" : "normal",
    };

    await db.doc(`adminInbox/${ticketId}`).set(inboxData, { merge: true });
    logger.info("Admin inbox ticket created", { paymentId, ticketId, status: "pending" });
  } catch (error) {
    logger.error("Error in onPaymentCreate", error);
  }
});

// ------------------------------------------------------------------
// ON PAYMENT UPDATE TRIGGER
// ------------------------------------------------------------------
export const onPaymentUpdate = onDocumentUpdated("payments/{paymentId}", async (event) => {
  const before = event.data?.before;
  const after = event.data?.after;
  if (!before || !after) return;

  const beforeData = before.data() as any;
  const afterData = after.data() as any;
  const paymentId = event.params.paymentId;

  try {
    if (beforeData.status !== "reported" && afterData.status === "reported") {
      const ticketId = `pay_${paymentId}`;
      const inboxUpdate = {
        status: "awaiting_approval",
        reportedAt: afterData.lastReport?.when || serverTS(),
        reportedAmount: afterData.lastReport?.amount,
        reportedMethod: afterData.lastReport?.method,
        updatedAt: serverTS(),
      };

      await db.doc(`adminInbox/${ticketId}`).set(inboxUpdate, { merge: true });
      logger.info("Admin inbox updated to awaiting_approval", { paymentId });
    }

    if (afterData.status === "confirmed" || afterData.status === "rejected") {
      const ticketId = `pay_${paymentId}`;
      const inboxUpdate = {
        status: afterData.status === "confirmed" ? "approved" : "rejected",
        decidedAt: serverTS(),
        updatedAt: serverTS(),
      };

      await db.doc(`adminInbox/${ticketId}`).set(inboxUpdate, { merge: true });
      logger.info("Admin inbox decision recorded", { paymentId, status: afterData.status });
    }
  } catch (error) {
    logger.error("Error in onPaymentUpdate", error);
  }
});