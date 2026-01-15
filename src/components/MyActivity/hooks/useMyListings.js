// ============================================================================
// FILE: src/components/MyActivity/hooks/useMyListings.js
// PHASE-2 CANONICAL — SELLER LISTINGS (DELIVERY-AUTHORITATIVE)
// ============================================================================
// RULES:
// - Seller listings come ONLY from donations
// - At most ONE active delivery per donation
// - deliveryDetails is the SINGLE source of truth
// - request.status is NON-authoritative (UI only)
// - NEVER crash on permission or missing docs
// ============================================================================

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../firebase";

/* ------------------------------------------------------------
 * DELIVERY TERMINAL STATES — PHASE-2
 * ---------------------------------------------------------- */
const TERMINAL_DELIVERY_STATES = [
  "completed",
  "force_closed",
  "cancelled",
];

/* ------------------------------------------------------------
 * HELPERS
 * ---------------------------------------------------------- */
const isActiveDelivery = (delivery) => {
  if (!delivery?.deliveryStatus) return false;
  return !TERMINAL_DELIVERY_STATES.includes(
    delivery.deliveryStatus
  );
};

export default function useMyListings(uid) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setListings([]);
      setLoading(false);
      return;
    }

    /* ----------------------------------------------------------
     * 1️⃣ LISTEN TO SELLER DONATIONS (AUTHORITATIVE)
     * -------------------------------------------------------- */
    const q = query(
      collection(db, "donations"),
      where("donorId", "==", uid)
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const donations = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        /* ------------------------------------------------------
         * 2️⃣ ENRICH EACH DONATION WITH ACTIVE DELIVERY
         * ---------------------------------------------------- */
        const enriched = await Promise.all(
          donations.map(async (donation) => {
            let activeRequestId = null;
            let deliveryData = null;

            try {
              /* ----------------------------------------------
               * A️⃣ FAST PATH — ADMIN / LOTTERY AWARD
               * -------------------------------------------- */
              if (
                donation.status === "awarded" &&
                donation.winnerId
              ) {
                try {
                  const reqSnap = await getDocs(
                    query(
                      collection(db, "requests"),
                      where("itemId", "==", donation.id),
                      where("userId", "==", donation.winnerId)
                    )
                  );

                  if (!reqSnap.empty) {
                    const reqDoc = reqSnap.docs[0];
                    const deliverySnap = await getDoc(
                      doc(db, "deliveryDetails", reqDoc.id)
                    );

                    if (
                      deliverySnap.exists() &&
                      isActiveDelivery(deliverySnap.data())
                    ) {
                      activeRequestId = reqDoc.id;
                      deliveryData = {
                        id: deliverySnap.id,
                        ...deliverySnap.data(),
                      };
                    }
                  }
                } catch {
                  // ignore — seller may not have request read permission
                }
              }

              /* ----------------------------------------------
               * B️⃣ CANONICAL SELLER DELIVERY DISCOVERY
               * -------------------------------------------- */
              if (!activeRequestId) {
                try {
                  const deliverySnap = await getDocs(
                    query(
                      collection(db, "deliveryDetails"),
                      where("itemId", "==", donation.id),
                      where("sellerId", "==", uid)
                    )
                  );

                  for (const d of deliverySnap.docs) {
                    const data = d.data();

                    if (isActiveDelivery(data)) {
                      activeRequestId = d.id;
                      deliveryData = {
                        id: d.id,
                        ...data,
                      };
                      break;
                    }
                  }
                } catch {
                  // permission-safe no-op
                }
              }
            } catch {
              // 🔒 HARD SAFETY — NEVER CRASH SELLER UI
              activeRequestId = null;
              deliveryData = null;
            }

            return {
              ...donation,

              // 🔑 Phase-2 canonical exposure
              activeRequestId,
              hasActiveRequest: Boolean(activeRequestId),
              deliveryData,
            };
          })
        );

        setListings(enriched);
        setLoading(false);
      },
      (error) => {
        console.warn(
          "[useMyListings] Snapshot blocked or permission error",
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
