// FILE: src/components/MyActivity/hooks/useMyListings.js

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function useMyListings(uid) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setListings([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'donations'),
      where('donorId', '==', uid)
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const baseList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // ✅ FIX: Enhanced with safe deliveryDetails fetch
        const enhanced = await Promise.all(
          baseList.map(async (donation) => {
            let deliveryData = null;
            
            try {
              // Try to get delivery details (may fail due to permissions)
              const deliverySnap = await getDoc(
                doc(db, 'deliveryDetails', donation.id)
              );
              deliveryData = deliverySnap.exists()
                ? deliverySnap.data()
                : null;
            } catch (error) {
              // Silent permission fallback
              deliveryData = null;
            }

            // Get request status if this item was awarded
            let requestStatus = null;
            let requestId = null;
            
            if (deliveryData?.requestId) {
              try {
                const requestSnap = await getDoc(
                  doc(db, 'requests', deliveryData.requestId)
                );
                if (requestSnap.exists()) {
                  const requestData = requestSnap.data();
                  requestStatus = requestData.status;
                  requestId = requestSnap.id;
                }
              } catch (error) {
                // Silent fallback
              }
            }

            return {
              ...donation,
              deliveryData,
              requestStatus,
              requestId,
            };
          })
        );

        setListings(enhanced);
        setLoading(false);
      },
      (error) => {
        console.warn('Listings permission blocked', error);
        setListings([]); // Graceful fallback
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return listings;
}