// ✅ FILE: src/pages/Admin/PaymentsQueue.jsx
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import PaymentReviewCard from './PaymentReviewCard';

export default function PaymentsQueue() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('reported'); // 'reported' | 'pending' | 'all'
  const [search, setSearch] = useState('');

  useEffect(() => {
    let q;
    if (filter === 'reported') {
      q = query(
        collection(db, 'payments'),
        where('status', '==', 'reported'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (filter === 'pending') {
      q = query(
        collection(db, 'payments'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPayments(rows);
    });
    return () => unsub();
  }, [filter]);

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const hay = `${p.id} ${p.userId || ''} ${p.code || ''} ${p.type || ''} ${p.itemId || ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Deposit Payments</h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="reported">Reported</option>
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search id / user / code"
            className="border rounded px-2 py-1 text-sm w-56"
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-600 border rounded p-4 bg-white">
          No payments in this queue.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <PaymentReviewCard key={p.id} paymentId={p.id} />
          ))}
        </div>
      )}
    </div>
  );
}
