// ===================================================================
// firestoreBatchFetch.js
// Safe batched Firestore document fetching (NO listeners)
// ===================================================================

import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

/* ---------------------------------------------------------
   Utility: chunk array
--------------------------------------------------------- */
const chunkArray = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/* ---------------------------------------------------------
   Fetch documents by IDs (batched)
--------------------------------------------------------- */
/**
 * @param {string} collectionName - Firestore collection
 * @param {string[]} ids - document IDs
 * @param {number} batchSize - max 10 (Firestore limit)
 */
export async function fetchDocsByIds(
  collectionName,
  ids = [],
  batchSize = 10
) {
  if (!ids.length) return [];

  const uniqueIds = [...new Set(ids)];
  const batches = chunkArray(uniqueIds, batchSize);

  const results = [];

  await Promise.all(
    batches.map(async (batch) => {
      const q = query(
        collection(db, collectionName),
        where("__name__", "in", batch)
      );

      const snap = await getDocs(q);
      snap.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
        });
      });
    })
  );

  return results;
}
