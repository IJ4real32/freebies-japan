import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Auto-detects missing Firestore indexes for key collections.
 * Logs index creation URLs if Firestore throws a "FAILED_PRECONDITION" error.
 */
export async function verifyFirestoreIndexes() {
  const testQueries = [
    query(collection(db, "requests"), where("userId", "==", "TEST"), orderBy("status")),
    query(collection(db, "donations"), where("donorId", "==", "TEST"), orderBy("updatedAt")),
    query(collection(db, "deposits"), where("userId", "==", "TEST"), orderBy("createdAt")),
  ];

  for (const q of testQueries) {
    try {
      await getDocs(q);
    } catch (err) {
      if (err.code === "failed-precondition" && err.message.includes("index")) {
        const match = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        console.warn("⚠️ Missing Firestore index detected. Create it here:", match ? match[0] : err.message);
      }
    }
  }
}
