import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertAuthedUser, assertAdmin } from "../../utils/backendUtils.js";
import { parseIsoOrNull, randomPick, serverTS, nowTS } from "../../utils/backendUtils.js";
import { admin } from "../../config/index.js";
import { 
  CreateLotteryRequest, 
  LotteryActionRequest, 
  DrawLotteryRequest, 
  LotteryStatusRequest 
} from "../../types/index.js";

const db = admin.firestore();

// Collection reference helper
const colLotteries = () => db.collection("lotteries");

// Common configuration for all lottery functions
const lotteryConfig = {
  region: "asia-northeast1",
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB" as any, // Fixed: Type assertion to resolve memory type error
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80
};

// ------------------------------------------------------------------
// CREATE LOTTERY (Admin)
// ------------------------------------------------------------------
export const createLottery = onCall<CreateLotteryRequest>(lotteryConfig, async (req) => {
  try {
    const uid = assertAuthedUser(req.auth);
    await assertAdmin(req.auth);

    const { title, itemId, description, maxWinners, opensAt, closesAt, status } = req.data || ({} as any);
    if (!title || typeof title !== "string") throw new HttpsError("invalid-argument", "title required");
    if (!Number.isInteger(maxWinners) || maxWinners < 1) {
      throw new HttpsError("invalid-argument", "maxWinners must be integer >= 1");
    }

    const doc = {
      title,
      itemId,
      description,
      maxWinners,
      status: status ?? "draft",
      opensAt: parseIsoOrNull(opensAt) ?? null,
      closesAt: parseIsoOrNull(closesAt) ?? null,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: uid,
      updatedAt: admin.firestore.Timestamp.now(),
      ticketCount: 0,
    };

    const ref = await colLotteries().add(doc);
    logger.info("Lottery created", { lotteryId: ref.id, by: uid });
    return { lotteryId: ref.id };
  } catch (error: any) {
    logger.error("createLottery error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to create lottery");
  }
});

// ------------------------------------------------------------------
// OPEN LOTTERY (Admin)
// ------------------------------------------------------------------
export const openLottery = onCall<LotteryActionRequest>(lotteryConfig, async (req) => {
  try {
    assertAuthedUser(req.auth);
    await assertAdmin(req.auth);
    const { lotteryId } = req.data || {};
    if (!lotteryId) throw new HttpsError("invalid-argument", "lotteryId required");

    const ref = colLotteries().doc(lotteryId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Lottery not found");

    const data = snap.data() as any;
    if (data.status === "drawn") throw new HttpsError("failed-precondition", "Already drawn");

    await ref.update({
      status: "open",
      updatedAt: admin.firestore.Timestamp.now(),
      opensAt: data.opensAt ?? admin.firestore.Timestamp.now(),
    });
    return { ok: true };
  } catch (error: any) {
    logger.error("openLottery error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to open lottery");
  }
});

// ------------------------------------------------------------------
// CLOSE LOTTERY (Admin)
// ------------------------------------------------------------------
export const closeLottery = onCall<LotteryActionRequest>(lotteryConfig, async (req) => {
  try {
    assertAuthedUser(req.auth);
    await assertAdmin(req.auth);
    const { lotteryId } = req.data || {};
    if (!lotteryId) throw new HttpsError("invalid-argument", "lotteryId required");

    const ref = colLotteries().doc(lotteryId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Lottery not found");
    const data = snap.data() as any;

    if (data.status !== "open") throw new HttpsError("failed-precondition", "Lottery not open");

    await ref.update({
      status: "closed",
      updatedAt: admin.firestore.Timestamp.now(),
      closesAt: data.closesAt ?? admin.firestore.Timestamp.now(),
    });
    return { ok: true };
  } catch (error: any) {
    logger.error("closeLottery error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to close lottery");
  }
});

// ------------------------------------------------------------------
// JOIN LOTTERY (User)
// ------------------------------------------------------------------
export const joinLottery = onCall<LotteryActionRequest>(lotteryConfig, async (req) => {
  try {
    const uid = assertAuthedUser(req.auth);
    const { lotteryId } = req.data || {};
    if (!lotteryId) throw new HttpsError("invalid-argument", "lotteryId required");

    const lotRef = colLotteries().doc(lotteryId);
    const lotSnap = await lotRef.get();
    if (!lotSnap.exists) throw new HttpsError("not-found", "Lottery not found");
    const lot = lotSnap.data() as any;

    if (lot.status !== "open") throw new HttpsError("failed-precondition", "Lottery not open");

    const now = admin.firestore.Timestamp.now();
    if (lot.opensAt && now.toMillis() < lot.opensAt.toMillis()) {
      throw new HttpsError("failed-precondition", "Lottery not opened yet");
    }
    if (lot.closesAt && now.toMillis() > lot.closesAt.toMillis()) {
      throw new HttpsError("failed-precondition", "Lottery closed");
    }

    const ticketRef = lotRef.collection("tickets").doc(uid);
    await db.runTransaction(async (tx) => {
      const t = await tx.get(ticketRef);
      if (t.exists) return; // already joined
      tx.set(ticketRef, { uid, createdAt: serverTS() });
      tx.update(lotRef, {
        ticketCount: admin.firestore.FieldValue.increment(1),
        updatedAt: serverTS(),
      });
    });

    return { joined: true };
  } catch (error: any) {
    logger.error("joinLottery error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to join lottery");
  }
});

// ------------------------------------------------------------------
// DRAW LOTTERY (Admin)
// ------------------------------------------------------------------
export const drawLottery = onCall<DrawLotteryRequest>({
  ...lotteryConfig,
  timeoutSeconds: 120, // Longer timeout for drawing process
  memory: "512MiB" as any, // Fixed: Increased memory for drawing process
}, async (req) => {
  try {
    assertAuthedUser(req.auth);
    await assertAdmin(req.auth);
    const { lotteryId, seed } = req.data || {};
    if (!lotteryId) throw new HttpsError("invalid-argument", "lotteryId required");

    const lotRef = colLotteries().doc(lotteryId);
    const lotSnap = await lotRef.get();
    if (!lotSnap.exists) throw new HttpsError("not-found", "Lottery not found");
    const lot = lotSnap.data() as any;

    if (lot.status === "drawn") {
      return { status: "drawn", winners: lot.winners ?? [] };
    }
    if (lot.status !== "closed") throw new HttpsError("failed-precondition", "Close lottery first");

    const ticketsCol = lotRef.collection("tickets");
    const allUids: string[] = [];
    const pageSize = 1000;
    let lastId: string | null = null;

    while (true) {
      let q = ticketsCol.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (lastId) q = q.startAfter(lastId);
      const page = await q.get();
      if (page.empty) break;

      for (const d of page.docs) {
        const data = d.data() as { uid?: string };
        if (data?.uid) allUids.push(data.uid);
      }
      lastId = page.docs[page.docs.length - 1].id;
      if (page.size < pageSize) break;
    }

    const selected = allUids.length ? randomPick(allUids, lot.maxWinners, seed) : [];

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(lotRef);
      const curr = snap.data() as any;
      if (!curr) throw new HttpsError("not-found", "Lottery missing");
      if (curr.status === "drawn") return;

      if (selected.length) {
        const winnersCol = lotRef.collection("winners");
        selected.forEach((u) => {
          tx.set(winnersCol.doc(u), { uid: u, drawnAt: serverTS() });
        });
      }

      tx.update(lotRef, {
        status: "drawn",
        winners: selected,
        updatedAt: serverTS(),
      });
    });

    logger.info("Lottery drawn", { lotteryId, winners: selected, by: req.auth?.uid ?? null });
    return { status: "drawn", winners: selected };
  } catch (error: any) {
    logger.error("drawLottery error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to draw lottery");
  }
});

// ------------------------------------------------------------------
// GET MY LOTTERY STATUS (User)
// ------------------------------------------------------------------
export const getMyLotteryStatus = onCall<LotteryStatusRequest>(lotteryConfig, async (req) => {
  try {
    const uid = assertAuthedUser(req.auth);
    const { lotteryId } = req.data || {};
    if (!lotteryId) throw new HttpsError("invalid-argument", "lotteryId required");

    const lotRef = colLotteries().doc(lotteryId);
    const [lotSnap, tSnap] = await Promise.all([
      lotRef.get(),
      lotRef.collection("tickets").doc(uid).get(),
    ]);
    if (!lotSnap.exists) throw new HttpsError("not-found", "Lottery not found");
    const data = lotSnap.data() as any;

    return {
      lottery: {
        title: data.title,
        status: data.status,
        maxWinners: data.maxWinners,
        opensAt: data.opensAt?.toMillis() ?? null,
        closesAt: data.closesAt?.toMillis() ?? null,
        ticketCount: data.ticketCount ?? 0,
        winners: data.winners ?? null,
      },
      joined: tSnap.exists,
    };
  } catch (error: any) {
    logger.error("getMyLotteryStatus error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get lottery status");
  }
});

// ------------------------------------------------------------------
// GET LOTTERY PUBLIC INFO (Public)
// ------------------------------------------------------------------
export const getLotteryPublic = onCall<LotteryStatusRequest>(lotteryConfig, async (req) => {
  try {
    const { lotteryId } = req.data || {};
    if (!lotteryId) throw new HttpsError("invalid-argument", "lotteryId required");

    const lotSnap = await colLotteries().doc(lotteryId).get();
    if (!lotSnap.exists) throw new HttpsError("not-found", "Lottery not found");
    const data = lotSnap.data() as any;

    return {
      lottery: {
        title: data.title,
        itemId: data.itemId ?? null,
        description: data.description ?? null,
        status: data.status,
        maxWinners: data.maxWinners,
        opensAt: data.opensAt?.toMillis() ?? null,
        closesAt: data.closesAt?.toMillis() ?? null,
        ticketCount: data.ticketCount ?? 0,
        winners: data.winners ?? null,
      },
    };
  } catch (error: any) {
    logger.error("getLotteryPublic error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get lottery info");
  }
});