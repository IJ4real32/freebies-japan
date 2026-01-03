// FILE: src/components/MyActivity/hooks/useMyRequests.js

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

const fetchDocsByIds = async (collectionName, ids) => {
  if (!ids.length) return [];
  const docs = await Promise.all(
    ids.map(async (id) => {
      try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
      } catch (error) {
        console.warn(`Permission denied for ${collectionName}/${id}`);
        return null;
      }
    })
  );
  return docs.filter(Boolean);
};

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
      collection(db, 'requests'),
      where('userId', '==', uid)
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const baseList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Get unique item IDs for donation lookup
        const itemIds = [...new Set(baseList.map((r) => r.itemId).filter(Boolean))];

        try {
          // ✅ FIX: Safe deliveryDetails fetch with try-catch
          let donations = [];
          let deliveries = [];

          try {
            donations = await fetchDocsByIds('donations', itemIds);
          } catch (donationErr) {
            console.warn('Donation fetch blocked', donationErr);
            donations = [];
          }

          try {
            deliveries = await fetchDocsByIds('deliveryDetails', itemIds);
          } catch (deliveryErr) {
            console.warn('deliveryDetails fetch blocked by rules');
            deliveries = [];
          }

          const donationMap = donations.reduce((acc, d) => {
            if (d) acc[d.id] = d;
            return acc;
          }, {});

          const deliveryMap = deliveries.reduce((acc, d) => {
            if (d) acc[d.id] = d;
            return acc;
          }, {});

          const enhanced = baseList.map((req) => {
            const donation = donationMap[req.itemId] || null;
            const deliveryData = deliveryMap[req.id] || null;

            return {
              ...req,
              donation,
              deliveryData,
            };
          });

          setRequests(enhanced);
        } catch (error) {
          console.error('Error enhancing requests:', error);
          setRequests(baseList); // Fallback to base data
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn('Requests permission blocked', error);
        setRequests([]); // Graceful fallback
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return requests;
}