// ============================================================================
// FILE: useMyPurchases.js — PREMIUM PURCHASES (Buyer Only)
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

export default function useMyPurchases(uid) {
  const [purchases, setPurchases] = useState([]);

  const hydrate = async (payment) => {
    const itemId = payment.itemId;
    if (!itemId) return payment;

    try {
      const donationSnap = await getDoc(doc(db, "donations", itemId));
      const deliverySnap = await getDoc(doc(db, "deliveryDetails", itemId));

      return {
        ...payment,

        donation: donationSnap.exists() ? donationSnap.data() : null,
        deliveryData: deliverySnap.exists() ? deliverySnap.data() : null,
      };
    } catch (err) {
      console.error("hydratePurchase error:", err);
      return payment;
    }
  };

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "payments"),
      where("userId", "==", uid),
      where("type", "==", "item") // PREMIUM ONLY
    );

    const unsub = onSnapshot(q, async (snap) => {
      const out = [];

      for (const d of snap.docs) {
        const payment = { id: d.id, ...d.data() };
        const full = await hydrate(payment);
        out.push(full);
      }

      setPurchases(out);
    });

    return () => unsub();
  }, [uid]);

  return purchases;
}
