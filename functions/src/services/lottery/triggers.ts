import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { serverTS, nowTS } from "../../utils/backendUtils.js";
import { admin } from "../../config/index.js";
import { sendEmail, emailTemplates } from "../email/emailService.js";

const db = admin.firestore();
const colLotteries = () => db.collection("lotteries");

// ------------------------------------------------------------------
// AUTO-CREATE LOTTERY WHEN FREE DONATION IS CREATED
// ------------------------------------------------------------------
export const onDonationCreateMakeLottery = onDocumentCreated("donations/{donationId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const donationId = event.params.donationId;
  const d = snap.data() as any;

  try {
    if (d?.type !== "free") return;

    // skip if one already exists for this donation
    const existing = await colLotteries().where("itemId", "==", donationId).limit(1).get();
    if (!existing.empty) return;

    const closesAt = d?.requestWindowEnd?.toMillis ? (d.requestWindowEnd as any) : null;

    const doc = {
      title: d?.title || "Selection",
      itemId: donationId,
      description: d?.description || null,
      maxWinners: 1, // ✅ single winner
      status: "open",
      opensAt: admin.firestore.Timestamp.now(),
      closesAt: closesAt ?? null, // if null, cron will ignore
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: d?.ownerId || "system",
      updatedAt: admin.firestore.Timestamp.now(),
      ticketCount: 0,
    };

    await colLotteries().add(doc);
    logger.info("Auto-lottery created for donation", { donationId });
  } catch (e) {
    logger.error("onDonationCreateMakeLottery error", { donationId, error: (e as any)?.message });
  }
});

// ------------------------------------------------------------------
// ADD TICKET WHEN USER CREATES REQUEST
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
      batch.set(ticketRef, { uid: userId, requestId: event.params.requestId, createdAt: serverTS() });
      batch.update(lotRef, {
        ticketCount: admin.firestore.FieldValue.increment(1),
        updatedAt: serverTS(),
      });
      await batch.commit();
      logger.info("Ticket added", { lotteryId: lotRef.id, itemId, userId });
    }
  } catch (e) {
    logger.error("onRequestCreateAddTicket error", { error: (e as any)?.message });
  }
});

// ------------------------------------------------------------------
// HELPER: APPLY SELECTION RESULTS TO REQUESTS
// ------------------------------------------------------------------
export async function applySelectionResults(lotteryId: string, donationId: string, winners: string[]) {
  const reqSnap = await db.collection("requests")
    .where("itemId", "==", donationId)
    .where("status", "==", "pending")
    .limit(1000)
    .get();

  if (reqSnap.empty) return;

  const winnerSet = new Set(winners);
  const batch = db.batch();

  // Get donation details for email
  const donationDoc = await db.doc(`donations/${donationId}`).get();
  const donation = donationDoc.exists ? donationDoc.data() : null;
  const itemName = donation?.title || "Item";

  for (const d of reqSnap.docs) {
    const r = d.data() as any;
    const isWin = winnerSet.has(r.userId);
    
    batch.update(d.ref, {
      status: isWin ? "selected" : "not_selected",
      selectionId: lotteryId,
      decidedAt: serverTS(),
      selectedAt: isWin ? serverTS() : null,
      updatedAt: serverTS(),
    });

    // Send email notification to user
    if (r.userEmail) {
      try {
        const userDoc = await db.doc(`users/${r.userId}`).get();
        const user = userDoc.exists ? userDoc.data() : null;
        const userName = user?.displayName || "User";

        if (isWin) {
          await sendEmail(
            r.userEmail,
            "🎉 You've been selected!",
            emailTemplates.selectionWinner(userName, itemName)
          );
        } else {
          await sendEmail(
            r.userEmail,
            "Update on your request",
            emailTemplates.selectionNotSelected(userName, itemName)
          );
        }
      } catch (emailError) {
        logger.error("Failed to send selection email", { userId: r.userId, error: emailError });
      }
    }

    // user-level notification
    const noteRef = db.collection(`users/${r.userId}/notifications`).doc();
    batch.set(noteRef, {
      type: "selection_result",
      itemId: donationId,
      selectionId: lotteryId,
      status: isWin ? "selected" : "not_selected",
      createdAt: serverTS(),
      read: false,
    });
  }

  await batch.commit();

  // admin summary inbox item
  await db.doc(`adminInbox/sel_${donationId}`).set({
    kind: "selection",
    type: "free",
    lotteryId,
    itemId: donationId,
    winners,
    decidedAt: serverTS(),
    updatedAt: serverTS(),
    status: "completed",
  }, { merge: true });

  logger.info("Selection results applied with emails", { donationId, winnersCount: winners.length });
}