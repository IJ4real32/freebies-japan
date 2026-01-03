// FILE: src/components/MyActivity/hooks/useMyPurchases.js

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

export default function useMyPurchases(uid) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'payments'),
      where('userId', '==', uid),
      where('type', '==', 'item')
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const baseList = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            }))
            .filter((p) => p.userId === uid); // Additional safety filter

          const itemIds = [...new Set(baseList.map((p) => p.itemId).filter(Boolean))];

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

          const enhanced = baseList.map((purchase) => {
            const donation = donationMap[purchase.itemId] || null;
            const deliveryData = deliveryMap[purchase.itemId] || null;

            return {
              ...purchase,
              donation,
              deliveryData,
              isPremium: true,
            };
          });

          setPurchases(enhanced);
        } catch (error) {
          console.error('Error enhancing purchases:', error);
          // Fallback to basic list if enhancement fails
          const baseList = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            }))
            .filter((p) => p.userId === uid);
          setPurchases(baseList);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn('Payments permission blocked', error);
        setPurchases([]); // Graceful fallback
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return purchases;
}