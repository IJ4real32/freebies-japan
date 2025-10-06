// ✅ FILE: src/pages/AdminManageUsers.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import BackToDashboardButton from '../components/Admin/BackToDashboardButton';

const AdminManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowBusy, setRowBusy] = useState({});
  const [error, setError] = useState(null);

  // Pre-bind the callables with the correct names
  const callToggleTestSub = httpsCallable(functions, 'adminSetTestSubscriber');
  const callTopUpCredits = httpsCallable(functions, 'adminTopUpTrialCredits');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(list);
      } catch (e) {
        console.error(e);
        setError('Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const toggleTestSubscriber = async (user) => {
    if (!window.confirm(`Toggle testSubscriber for ${user.displayName || user.email || user.id}?`)) return;

    try {
      setRowBusy(p => ({ ...p, [user.id]: true }));
      const next = !user.testSubscriber;

      // Call with correct payload
      const { data } = await callToggleTestSub({
        targetUid: user.id,
        value: next,
        alsoSetIsSubscribed: true, // mirror to isSubscribed for frontend UX
      });

      const applied = !!data?.testSubscriber; // backend echoes final value
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, testSubscriber: applied, isSubscribed: applied } : u
        )
      );
      alert(`Test subscriber ${applied ? 'ENABLED' : 'DISABLED'} for ${user.displayName || user.email || user.id}`);
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to toggle testSubscriber');
    } finally {
      setRowBusy(p => ({ ...p, [user.id]: false }));
    }
  };

  const topUpTrialCredits = async (user) => {
    const raw = prompt(`Enter number of trial credits to add for ${user.displayName || user.email || user.id} (can be negative):`, '5');
    if (raw == null) return;

    const amount = Number(raw);
    if (!Number.isFinite(amount)) {
      alert('Please enter a valid number.');
      return;
    }

    try {
      setRowBusy(p => ({ ...p, [user.id]: true }));

      // Call with correct payload
      const { data } = await callTopUpCredits({
        targetUid: user.id,
        amount: Math.trunc(amount),
      });

      // Prefer server-returned newBalance when provided
      const newBalance = typeof data?.newBalance === 'number'
        ? data.newBalance
        : (user.trialCreditsLeft || 0) + Math.trunc(amount);

      setUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, trialCreditsLeft: newBalance } : u
        )
      );

      alert('Trial credits updated.');
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to top up credits');
    } finally {
      setRowBusy(p => ({ ...p, [user.id]: false }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackToDashboardButton />
      <h1 className="text-2xl font-bold mb-4">Manage Users</h1>

      {error && <div className="bg-red-100 text-red-600 p-2 mb-4">{error}</div>}

      {loading ? (
        <p>Loading users…</p>
      ) : (
        <div className="space-y-4">
          {users.map(u => (
            <div key={u.id} className="border p-4 rounded bg-white flex justify-between items-center">
              <div>
                <p><strong>{u.displayName || u.userName || 'Unnamed User'}</strong></p>
                <p className="text-sm text-gray-600">{u.email || 'No email'}</p>
                <p className="text-xs text-gray-500">ID: {u.id}</p>
                <p><strong>Subscribed:</strong> {u.isSubscribed ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Test Subscriber:</strong> {u.testSubscriber ? '✅ Enabled' : '❌ Disabled'}</p>
                <p><strong>Trial Credits:</strong> {typeof u.trialCreditsLeft === 'number' ? u.trialCreditsLeft : 0}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => toggleTestSubscriber(u)}
                  disabled={!!rowBusy[u.id]}
                  className="px-3 py-1 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
                >
                  {rowBusy[u.id] ? 'Working…' : (u.testSubscriber ? 'Disable Test Sub' : 'Enable Test Sub')}
                </button>
                <button
                  onClick={() => topUpTrialCredits(u)}
                  disabled={!!rowBusy[u.id]}
                  className="px-3 py-1 rounded bg-green-600 text-white text-sm disabled:opacity-50"
                >
                  {rowBusy[u.id] ? 'Working…' : 'Top-up Trial Credits'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminManageUsers;
