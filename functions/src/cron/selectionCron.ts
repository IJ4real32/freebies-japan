import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin } from "../config/index.js";
import { randomPick, serverTS } from "../utils/backendUtils.js";
import { applySelectionResults } from "../services/lottery/triggers.js";

const db = admin.firestore();

// Collection reference helper
const colLotteries = () => db.collection("lotteries");

// ------------------------------------------------------------------
// CRON: EVERY 5 MINUTES - CLOSE/DRAW DUE SELECTIONS
// ------------------------------------------------------------------
export const selectionCron = onSchedule("every 5 minutes", async () => {
  const now = Date.now();

  // process a small batch each run to avoid timeouts
  const snap = await colLotteries()
    .where("status", "in", ["open", "closed"])
    .orderBy("closesAt", "asc")
    .limit(50)
    .get();

  for (const docSnap of snap.docs) {
    const lotRef = docSnap.ref;
    const lot = docSnap.data() as any;
    const closesMs = lot?.closesAt?.toMillis?.() ?? null;
    if (!closesMs || closesMs > now) continue;

    try {
      // close if still open
      if (lot.status === "open") {
        await lotRef.update({
          status: "closed",
          updatedAt: admin.firestore.Timestamp.now(),
          closesAt: lot.closesAt ?? admin.firestore.Timestamp.now(),
        });
      }

      const fresh = (await lotRef.get()).data() as any;
      if (!fresh || fresh.status !== "closed") continue;

      // collect tickets (uids) in pages
      const uids: string[] = [];
      let lastId: string | null = null;
      const pageSize = 1000;
      while (true) {
        let q = lotRef.collection("tickets")
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(pageSize);
        if (lastId) q = q.startAfter(lastId);
        const page = await q.get();
        if (page.empty) break;
        page.docs.forEach(d => {
          const t = d.data() as any;
          if (t?.uid) uids.push(t.uid);
        });
        lastId = page.docs[page.docs.length - 1].id;
        if (page.size < pageSize) break;
      }

      // ✅ single winner
      const winners = uids.length ? randomPick(uids, 1) : [];

      await db.runTransaction(async (tx) => {
        const s = await tx.get(lotRef);
        const cur = s.data() as any;
        if (!cur || cur.status === "drawn") return;

        if (winners.length) {
          const wCol = lotRef.collection("winners");
          winners.forEach((u) => tx.set(wCol.doc(u), { uid: u, drawnAt: serverTS() }));
        }
        tx.update(lotRef, { status: "drawn", winners, updatedAt: serverTS() });
      });

      await applySelectionResults(lotRef.id, fresh.itemId!, winners);
      logger.info("Selection decided", { lotteryId: lotRef.id, winners });
    } catch (e) {
      logger.error("selectionCron error", { lotteryId: lotRef.id, error: (e as any)?.message });
    }
  }
});