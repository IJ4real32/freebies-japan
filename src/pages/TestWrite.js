import { useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function TestWrite() {
  useEffect(() => {
    const runTest = async () => {
      try {
        await addDoc(collection(db, 'donations'), {
          title: "Static Test",
          description: "Hardcoded write test",
          status: "pending",
          createdAt: serverTimestamp()
        });
        console.log("✅ Firestore write succeeded");
      } catch (err) {
        console.error("❌ Firestore write failed:", err.message);
      }
    };
    runTest();
  }, []);

  return (
    <div className="p-10 text-center text-green-700 text-xl">
      🔄 Running Firestore write test... check the console!
    </div>
  );
}
