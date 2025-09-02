// File: src/pages/TestFirestore.jsx
import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function TestFirestore() {
  useEffect(() => {
    const createTestDonation = async () => {
      try {
        await setDoc(doc(db, 'donations', 'demo-item'), {
          title: 'Test Item',
          description: 'This is a test donation',
          status: 'approved'
        });
        console.log('✅ Donation document created');
      } catch (error) {
        console.error('❌ Error creating document:', error.message);
      }
    };

    createTestDonation();
  }, []);

  return (
    <div className="p-4 text-center text-green-700">
      Creating test donation document in Firestore...
    </div>
  );
}
