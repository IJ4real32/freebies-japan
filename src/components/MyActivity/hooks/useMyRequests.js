// ============================================================================
// FILE: useMyRequests.js
// PHASE-2 FINAL — BUYER REQUESTS (DELIVERY-AUTHORITATIVE)
// ============================================================================
// RULES:
// - requests = primary list
// - donations fetched by itemId
// - deliveryDetails fetched by requestId (SINGLE SOURCE OF TRUTH)
// - legacy-safe (approved without deliveryDetails)
// - never crash on permission errors
// ============================================================================

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

/* --------------------------------------------------
 * SAFE FETCH BY IDS (NO CRASH)
 * -------------------------------------------------- */
const fetchDocsByIds = async (collectionName, ids) => {
  if (!ids?.length) return [];

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const ref = doc(db, collectionName, id);
        const snap = await getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
};

/* --------------------------------------------------
 * NORMALIZE DELIVERY STATUS (LEGACY SAFE)
 * -------------------------------------------------- */
const normalizeDelivery = (delivery) => {
  if (!delivery) return null;

  const raw = delivery.deliveryStatus || "";
  const normalized = raw.toLowerCase().replace(/[-_]/g, "");

  return {
    ...delivery,
    deliveryStatus: raw,
    __normalizedStatus: normalized,
  };
};

/* ==================================================
 * useMyRequests — Phase-2 Canonical
 * ================================================== */
export default function useMyRequests(uid) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "requests"),
      where("userId", "==", uid)
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const baseRequests = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        if (!baseRequests.length) {
          setRequests([]);
          setLoading(false);
          return;
        }

        /* ------------------------------------------
         * ID COLLECTION
         * ------------------------------------------ */
        const itemIds = [
          ...new Set(baseRequests.map((r) => r.itemId).filter(Boolean)),
        ];

        const requestIds = baseRequests.map((r) => r.id);

        try {
          /* ------------------------------------------
           * FETCH DONATIONS (SAFE)
           * ------------------------------------------ */
          const donations = await fetchDocsByIds("donations", itemIds);
          const donationMap = donations.reduce((acc, d) => {
            acc[d.id] = d;
            return acc;
          }, {});

          /* ------------------------------------------
           * FETCH DELIVERY DETAILS (REQUEST-KEYED)
           * ------------------------------------------ */
          const deliveries = await fetchDocsByIds(
            "deliveryDetails",
            requestIds
          );

          const deliveryMap = deliveries.reduce((acc, d) => {
            acc[d.id] = normalizeDelivery(d);
            return acc;
          }, {});

          /* ------------------------------------------
           * ENHANCE REQUESTS (PHASE-2 SAFE)
           * ------------------------------------------ */
          const deduped = Object.values(
  baseRequests.reduce((acc, req) => {
    const existing = acc[req.itemId];
    const t1 = req.createdAt?.seconds || 0;
    const t2 = existing?.createdAt?.seconds || 0;

    if (!existing || t1 > t2) {
      acc[req.itemId] = req;
    }
    return acc;
  }, {})
);

const enhanced = deduped.map((req) => {

         
            const delivery = deliveryMap[req.id] || null;

            return {
              ...req,

              // Donation info
              donation: donationMap[req.itemId] || null,

              // Delivery (authoritative)
              deliveryData: delivery,

              // 🔑 Legacy safety:
              // approved request WITHOUT deliveryDetails still shows AWARDED
           __legacyApproved: false,

            };
          });

          setRequests(enhanced);
        } catch (err) {
          console.error("[useMyRequests] hydration failed", err);
          setRequests(baseRequests);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn("[useMyRequests] permission blocked", error);
        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return requests;
}
