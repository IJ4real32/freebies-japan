// ============================================================================
// FILE: src/components/MyActivity/hooks/useMyListings.js
// PHASE-2 FINAL — SELLER LISTINGS (AUTHORITATIVE, NO REGRESSIONS)
// ============================================================================

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
} from "firebase/firestore";
import { db } from "../../../firebase";

export default function useMyListings(uid) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setListings([]);
      setLoading(false);
      return;
    }

    // ------------------------------------------------------------------
    // 1️⃣ Seller listings come ONLY from donations (authoritative)
    // ------------------------------------------------------------------
    const q = query(
      collection(db, "donations"),
      where("donorId", "==", uid)
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const baseList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // ------------------------------------------------------------------
        // 2️⃣ Enrich with request + delivery (PHASE-2 CANONICAL)
        // ------------------------------------------------------------------
        const enriched = await Promise.all(
          baseList.map(async (donation) => {
            let requestId = null;
            let requestStatus = null;
            let deliveryData = null;

            try {
              // ------------------------------------------------------------
              // A️⃣ Find request linked to this donation
              // ------------------------------------------------------------
              const reqQuery = query(
                collection(db, "requests"),
                where("itemId", "==", donation.id)
              );

              const reqSnap = await getDocs(reqQuery);

              if (!reqSnap.empty) {
                const reqDoc = reqSnap.docs[0];
                requestId = reqDoc.id;
                requestStatus = reqDoc.data().status;

                // ------------------------------------------------------------
                // B️⃣ Load deliveryDetails using requestId (NOT donationId)
                // ------------------------------------------------------------
                const deliverySnap = await getDoc(
                  doc(db, "deliveryDetails", requestId)
                );

                deliveryData = deliverySnap.exists()
                  ? deliverySnap.data()
                  : null;
              }
            } catch (err) {
              // Permission-safe fallback (never crash UI)
              deliveryData = null;
            }

            return {
              ...donation,

              // Phase-2 enrichment
              requestId,
              requestStatus,
              deliveryData,
            };
          })
        );

        setListings(enriched);
        setLoading(false);
      },
      (error) => {
        console.warn(
          "[useMyListings] Permission blocked or snapshot error",
          error
        );
        setListings([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return listings;
}
