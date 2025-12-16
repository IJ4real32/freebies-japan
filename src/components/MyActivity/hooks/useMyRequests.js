// ============================================================================
// FILE: useMyRequests.js — FREE ITEM REQUESTS (Buyer Only)
// Phase-2 Final Hook
// ============================================================================

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

// SAFE FILTER
const filterVisible = (list) =>
  list?.filter((i) => i && !i.softDeleted) ?? [];

export default function useMyRequests(uid) {
  const [requests, setRequests] = useState([]);

  const hydrate = async (req) => {
    const itemId = req.itemId;
    if (!itemId) return req;

    try {
      const donationSnap = await getDoc(doc(db, "donations", itemId));
      const deliverySnap = await getDoc(doc(db, "deliveryDetails", itemId));

      return {
        ...req,
        donation: donationSnap.exists() ? donationSnap.data() : null,
        deliveryData: deliverySnap.exists() ? deliverySnap.data() : null,
      };
    } catch (err) {
      console.error("hydrateRequest error:", err);
      return req;
    }
  };

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "requests"),
      where("userId", "==", uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const out = [];

      for (const d of snap.docs) {
        const base = { id: d.id, ...d.data() };
        if (!base || base.softDeleted) continue;

        const full = await hydrate(base);
        out.push(full);
      }

      setRequests(filterVisible(out));
    });

    return () => unsub();
  }, [uid]);

  return requests;
}
