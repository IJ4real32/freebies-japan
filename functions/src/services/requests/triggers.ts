import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { admin } from "../../config/index.js";
import { applySelectionResults } from "../lottery/triggers.js";

const db = admin.firestore();
const colLotteries = () => db.collection("lotteries");

// ------------------------------------------------------------------
// ON REQUEST CREATE - ADD TICKET TO LOTTERY
// ------------------------------------------------------------------
export const onRequestCreateAddTicket = onDocumentCreated("requests/{requestId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  try {
    const r = snap.data() as any;
    const { userId, itemId, status } = r || {};
    if (!userId || !itemId) return;
    if (status && status !== "pending") return; // only pending requests

    const lotQ = await colLotteries().where("itemId", "==", itemId).limit(1).get();
    if (lotQ.empty) return;

    const lotRef = lotQ.docs[0].ref;
    const lot = lotQ.docs[0].data() as any;
    if (lot.status !== "open") return;

    const now = admin.firestore.Timestamp.now();
    if (lot.opensAt && now.toMillis() < lot.opensAt.toMillis()) return;
    if (lot.closesAt && now.toMillis() > lot.closesAt.toMillis()) return;

    const ticketRef = lotRef.collection("tickets").doc(userId);
    const tSnap = await ticketRef.get();
    if (!tSnap.exists) {
      const batch = db.batch();
      batch.set(ticketRef, { 
        uid: userId, 
        requestId: event.params.requestId, 
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
      });
      batch.update(lotRef, {
        ticketCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
      logger.info("Ticket added", { lotteryId: lotRef.id, itemId, userId });
    }
  } catch (e) {
    logger.error("onRequestCreateAddTicket error", { error: (e as any)?.message });
  }
});

// ------------------------------------------------------------------
// ON REQUEST STATUS UPDATE - SEND EMAIL NOTIFICATIONS
// ------------------------------------------------------------------
export const onRequestStatusUpdate = onDocumentUpdated("requests/{requestId}", async (event) => {
  const before = event.data?.before?.data() as any;
  const after = event.data?.after?.data() as any;
  if (!before || !after) return;

  // This function handles status changes (selected/not_selected)
  // Delivery status emails are handled in the email service triggers
  if (before.status !== after.status) {
    logger.info("Request status changed", {
      requestId: event.params.requestId,
      from: before.status,
      to: after.status
    });
  }
});