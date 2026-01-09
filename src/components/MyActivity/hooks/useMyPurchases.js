// FILE: src/components/MyActivity/hooks/useMyPurchases.js

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../../firebase';

// Safe fetch function with individual error handling
const safeFetchDocsByIds = async (collectionName, ids) => {
  if (!ids.length) return [];
  
  const docs = [];
  for (const id of ids) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        docs.push({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      // Silent permission fallback - don't crash
      console.warn(`Permission denied for ${collectionName}/${id}:`, error.code);
    }
  }
  return docs;
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
            .filter((p) => p.userId === uid);

          const itemIds = [...new Set(baseList.map((p) => p.itemId).filter(Boolean))];

          // 🔴 CRITICAL FIX: DO NOT fetch deliveryDetails for purchases
          // COD payments don't have deliveryDetails immediately
          // Only fetch donations
          
          let donations = [];
          if (itemIds.length > 0) {
            try {
              donations = await safeFetchDocsByIds('donations', itemIds);
            } catch (donationErr) {
              console.warn('Donation fetch blocked', donationErr);
              donations = [];
            }
          }

          const donationMap = donations.reduce((acc, d) => {
            if (d) acc[d.id] = d;
            return acc;
          }, {});

          // 🔴 IMPORTANT: DO NOT include deliveryData for purchases
          // Delivery details are fetched separately when needed
          const enhanced = baseList.map((purchase) => {
            const donation = donationMap[purchase.itemId] || null;
            
            return {
              ...purchase,
              donation,
              isPremium: true,
              // 🔴 NO deliveryData here - it's fetched separately if needed
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