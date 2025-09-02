// File: src/components/Donation/DonationsList.jsx
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function DonationsList() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDonations() {
      const q = query(collection(db, 'donations'), where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDonations(items);
      setLoading(false);
    }
    fetchDonations();
  }, []);

  if (loading) return <div className="p-4">Loading approved donations...</div>;

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {donations.map(donation => (
        <div key={donation.id} className="border p-4 shadow-md">
          <h3 className="font-bold text-lg mb-2">{donation.title}</h3>
          <p className="text-sm">{donation.description}</p>
          <p className="text-sm">Category: {donation.category}</p>
          <p className="text-sm">Condition: {donation.condition}</p>
          <p className="text-sm">Delivery: {donation.delivery}</p>
          {donation.imageUrls?.length > 0 && (
            <img src={donation.imageUrls[0]} alt={donation.title} className="mt-2 w-full h-40 object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}
