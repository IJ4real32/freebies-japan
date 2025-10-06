// ✅ FILE: src/pages/AdminManageItems.js

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import BackToDashboardButton from '../components/Admin/BackToDashboardButton';
import { useNavigate } from 'react-router-dom';

/** Compute selection (lottery) state from donation doc */
const selectionStateFromDonation = (donation) => {
  const end = donation?.requestWindowEnd;
  const endMs =
    end?.seconds ? end.seconds * 1000 : typeof end === 'number' ? end : null;

  if (!endMs) return { label: 'Selection', status: 'open', endsAtMs: null };

  const now = Date.now();
  if (now < endMs) return { label: 'Selection', status: 'open', endsAtMs: endMs };
  return { label: 'Selection', status: 'closed', endsAtMs: endMs };
};

const AdminManageItems = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'donations'));
      const baseItems = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      // Enrich free items with request stats
      const enriched = await Promise.all(
        baseItems.map(async (item) => {
          const accessType = item.accessType || item.type || 'free';
          let reqCount = 0;
          let hasWinner = false;
          let winnerEmail = null;
          let selection = selectionStateFromDonation(item);

          if (accessType === 'free') {
            try {
              // total requests for this item
              const qAll = query(collection(db, 'requests'), where('itemId', '==', item.id));
              const snapAll = await getDocs(qAll);
              reqCount = snapAll.size;

              // winner (status == selected)
              const qWin = query(
                collection(db, 'requests'),
                where('itemId', '==', item.id),
                where('status', '==', 'selected'),
                limit(1)
              );
              const snapWin = await getDocs(qWin);
              if (!snapWin.empty) {
                hasWinner = true;
                const w = snapWin.docs[0].data();
                winnerEmail = w.userEmail || w.userName || w.userId || 'Selected user';
              }
            } catch (e) {
              // fail soft
              console.warn('Stats fetch failed for item', item.id, e);
            }
          }

          return {
            ...item,
            accessType,
            selection,
            reqCount,
            hasWinner,
            winnerEmail
          };
        })
      );

      setItems(enriched);
      setLoading(false);
    };

    fetchItems();
  }, []);

  const handleApprove = async (itemId) => {
    if (!window.confirm('Approve this item?')) return;
    await updateDoc(doc(db, 'donations', itemId), { status: 'approved', updatedAt: new Date() });
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'approved' } : item));
  };

  const handleReject = async (itemId) => {
    if (!window.confirm('Reject this item?')) return;
    await updateDoc(doc(db, 'donations', itemId), { status: 'rejected', updatedAt: new Date() });
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'rejected' } : item));
  };

  const handleEdit = async (itemId, field, value) => {
    await updateDoc(doc(db, 'donations', itemId), { [field]: value, updatedAt: new Date() });
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.status === filter);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <BackToDashboardButton />
        <h1 className="text-2xl font-bold mb-4">Manage Donated Items</h1>
        <p>Loading items…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackToDashboardButton />
      <h1 className="text-2xl font-bold mb-4">Manage Donated Items</h1>

      <div className="mb-4 flex items-center gap-3">
        <label className="mr-2 font-medium">Filter by status:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border px-3 py-1 rounded"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="text-sm text-gray-600">
          Note: Selection applies to <span className="font-medium">free</span> items only.
        </div>
      </div>

      {filteredItems.map(item => (
        <div key={item.id} className="border p-4 rounded mb-4 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Left: Images and basic info */}
            <div className="sm:w-48">
              {item.images?.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto mb-2">
                  {item.images.map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-20 h-20 object-cover rounded border" />
                  ))}
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded border mb-2" />
              )}
              <p className="text-xs text-gray-500">
                Access: <span className="font-medium capitalize">{item.accessType || item.type || 'free'}</span>
              </p>
              <p className="text-xs text-gray-500">
                Status: <span className="font-medium">{item.status || 'pending'}</span>
              </p>
              {/* Selection chip for free items */}
              { (item.accessType === 'free' || item.type === 'free') && (
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${
                      item.selection?.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    title={item.selection?.endsAtMs ? `Closes: ${new Date(item.selection.endsAtMs).toLocaleString()}` : undefined}
                  >
                    Selection {item.selection?.status === 'open' ? 'open' : 'closed'}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Editable fields + actions */}
            <div className="flex-1">
              <input
                type="text"
                className="border w-full p-2 mb-2 rounded"
                value={item.title || ''}
                onChange={(e) => handleEdit(item.id, 'title', e.target.value)}
                placeholder="Title"
              />
              <textarea
                className="border w-full p-2 mb-2 rounded"
                value={item.description || ''}
                onChange={(e) => handleEdit(item.id, 'description', e.target.value)}
                placeholder="Description"
              />

              {/* Selection summary for free items */}
              {(item.accessType === 'free' || item.type === 'free') && (
                <div className="mt-2 p-2 border rounded bg-gray-50 text-sm">
                  <div>
                    <span className="font-medium">Selection summary:</span>{' '}
                    Requests: <span className="font-semibold">{item.reqCount ?? 0}</span>{' '}
                    • Winner:{' '}
                    {item.hasWinner ? (
                      <span className="text-emerald-700 font-medium">{item.winnerEmail}</span>
                    ) : (
                      <span className="text-gray-600">none</span>
                    )}
                  </div>
                  {item.selection?.endsAtMs && item.selection.status === 'open' && (
                    <div className="text-gray-600 mt-1">
                      Closes: {new Date(item.selection.endsAtMs).toLocaleString()}
                    </div>
                  )}
                  {/* Shortcut to Requests page to pick a winner */}
                  {item.selection?.status === 'closed' && !item.hasWinner && (
                    <div className="mt-2">
                      <button
                        onClick={() => navigate('/admin/requests')}
                        className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
                        title="Go to Requests and pick a single winner for this item"
                      >
                        Go pick winner
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminManageItems;
