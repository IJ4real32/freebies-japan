// ============================================================================
// FILE: useMyListings.js — SELLER LISTINGS (Free + Premium)
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

const filterVisible = (list) =>
  list?.filter((i) => i && !i.softDeleted) ?? [];

export default function useMyListings(uid) {
  const [listings, setListings] = useState([]);

  const hydrate = async (donation) => {
    const itemId = donation.id;
    if (!itemId) return donation;

    try {
      const deliverySnap = await getDoc(doc(db, "deliveryDetails", itemId));

      return {
        ...donation,
        deliveryData: deliverySnap.exists() ? deliverySnap.data() : null,
      };
    } catch (err) {
      console.error("hydrateListing error:", err);
      return donation;
    }
  };

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "donations"),
      where("donorId", "==", uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const out = [];

      for (const d of snap.docs) {
        const donation = { id: d.id, donation: d.data() };

        if (donation.donation?.softDeleted) continue;

        const full = await hydrate(donation);
        out.push(full);
      }

      setListings(filterVisible(out));
    });

    return () => unsub();
  }, [uid]);

  return listings;
}
