// ✅ FILE: src/pages/AdminManageUsers.js
import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import BackToDashboardButton from '../components/Admin/BackToDashboardButton';
import { checkAdminStatus } from "../utils/adminUtils";


import { 
  Search, Filter, RefreshCcw, Calendar, Clock, 
  Loader2, ArrowUpDown, ArrowDown, ArrowUp, User,
  Mail, CreditCard, Crown
} from 'lucide-react';

const AdminManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowBusy, setRowBusy] = useState({});
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ field: 'createdAt', direction: 'desc' });

  // Pre-bind the callables with the correct names
  const callToggleTestSub = httpsCallable(functions, 'adminSetTestSubscriber');
  const callTopUpCredits = httpsCallable(functions, 'adminTopUpTrialCredits');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // ✅ FIXED: Query with descending order by createdAt
        const q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc') // Most recent first
        );
        const snap = await getDocs(q);
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

  /* -------------------------------------------------------
   * Filtering & Sorting with ENSURED DESCENDING ORDER
   * ------------------------------------------------------- */
  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Apply search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(u =>
        (u.displayName || '').toLowerCase().includes(s) ||
        (u.userName || '').toLowerCase().includes(s) ||
        (u.email || '').toLowerCase().includes(s) ||
        (u.id || '').toLowerCase().includes(s)
      );
    }
    
    // Apply status filter
    if (filter !== 'all') {
      switch (filter) {
        case 'subscribed':
          result = result.filter(u => u.isSubscribed);
          break;
        case 'testSubscriber':
          result = result.filter(u => u.testSubscriber);
          break;
        case 'hasCredits':
          result = result.filter(u => (u.trialCreditsLeft || 0) > 0);
          break;
        case 'noCredits':
          result = result.filter(u => (u.trialCreditsLeft || 0) <= 0);
          break;
        default:
          break;
      }
    }
    
    // Apply sorting
    if (sort.field) {
      result = [...result].sort((a, b) => {
        const dir = sort.direction === 'asc' ? 1 : -1;
        if (sort.field === 'createdAt') {
          const aDate = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
          const bDate = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
          return (aDate - bDate) * dir;
        }
        if (sort.field === 'trialCredits') {
          const aCredits = a.trialCreditsLeft || 0;
          const bCredits = b.trialCreditsLeft || 0;
          return (aCredits - bCredits) * dir;
        }
        if (sort.field === 'name') {
          const aName = (a.displayName || a.userName || a.email || '').toLowerCase();
          const bName = (b.displayName || b.userName || b.email || '').toLowerCase();
          return aName.localeCompare(bName) * dir;
        }
        return 0;
      });
    } else {
      // ✅ DEFAULT: Ensure descending order by createdAt (most recent first)
      result = [...result].sort((a, b) => {
        const aDate = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
        const bDate = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
        return bDate - aDate; // Descending order
      });
    }

    return result;
  }, [users, search, filter, sort]);

  const toggleSort = (field) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return { field: null, direction: null };
    });
  };

  const renderSortIcon = (field) => {
    if (sort.field !== field) return <ArrowUpDown size={14} className="inline text-gray-400" />;
    return sort.direction === 'asc' ? (
      <ArrowUp size={14} className="inline text-blue-600" />
    ) : (
      <ArrowDown size={14} className="inline text-blue-600" />
    );
  };

  /* -------------------------------------------------------
   * Formatters
   * ------------------------------------------------------- */
  const formatDate = (v) => {
    if (!v) return '—';
    const d = new Date(v.seconds ? v.seconds * 1000 : v);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const formatTimeAgo = (v) => {
    if (!v) return '—';
    const d = new Date(v.seconds ? v.seconds * 1000 : v);
    
    if (isNaN(d.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(v);
  };

  /* -------------------------------------------------------
   * Statistics
   * ------------------------------------------------------- */
  const stats = useMemo(() => {
    const total = users.length;
    const subscribed = users.filter(u => u.isSubscribed).length;
    const testSubscribers = users.filter(u => u.testSubscriber).length;
    const withCredits = users.filter(u => (u.trialCreditsLeft || 0) > 0).length;
    
    return { total, subscribed, testSubscribers, withCredits };
  }, [users]);

  /* -------------------------------------------------------
   * User Management Functions
   * ------------------------------------------------------- */
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
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to top up credits');
    } finally {
      setRowBusy(p => ({ ...p, [user.id]: false }));
    }
  };

  /* -------------------------------------------------------
   * Refresh Function
   * ------------------------------------------------------- */
  const refreshUsers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (e) {
      console.error(e);
      setError('Failed to refresh users.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <BackToDashboardButton />
      
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User size={24} />
          Manage Users
        </h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Users</option>
              <option value="subscribed">Subscribed</option>
              <option value="testSubscriber">Test Subscribers</option>
              <option value="hasCredits">Has Credits</option>
              <option value="noCredits">No Credits</option>
            </select>
          </div>
          
          <button
            onClick={refreshUsers}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm text-blue-700 font-medium">Total Users</p>
          <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-green-700 font-medium">Subscribed</p>
          <p className="text-2xl font-bold text-green-800">{stats.subscribed}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-sm text-purple-700 font-medium">Test Subs</p>
          <p className="text-2xl font-bold text-purple-800">{stats.testSubscribers}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <p className="text-sm text-orange-700 font-medium">With Credits</p>
          <p className="text-2xl font-bold text-orange-800">{stats.withCredits}</p>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-gray-500 py-8">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none"
                    onClick={() => toggleSort('name')}
                  >
                    Name {renderSortIcon('name')}
                  </th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none"
                    onClick={() => toggleSort('trialCredits')}
                  >
                    Credits {renderSortIcon('trialCredits')}
                  </th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      Created {renderSortIcon('createdAt')}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {u.displayName || u.userName || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail size={12} />
                            {u.email || 'No email'}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">ID: {u.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {u.displayName || u.userName || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          u.isSubscribed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <Crown size={12} />
                          {u.isSubscribed ? 'Subscribed' : 'Not Subscribed'}
                        </span>
                        {u.testSubscriber && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                            Test Subscriber
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-gray-400" />
                        <span className={`font-medium ${
                          (u.trialCreditsLeft || 0) > 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {typeof u.trialCreditsLeft === 'number' ? u.trialCreditsLeft : 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex flex-col">
                        <span className="text-sm">{formatDate(u.createdAt)}</span>
                        <span className="text-xs text-gray-400">{formatTimeAgo(u.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleTestSubscriber(u)}
                          disabled={!!rowBusy[u.id]}
                          className="px-3 py-1 rounded text-xs disabled:opacity-50 flex items-center gap-1 justify-center"
                          style={{
                            backgroundColor: u.testSubscriber ? '#dc2626' : '#2563eb',
                            color: 'white'
                          }}
                        >
                          {rowBusy[u.id] ? '...' : (u.testSubscriber ? 'Disable Test' : 'Enable Test')}
                        </button>
                        <button
                          onClick={() => topUpTrialCredits(u)}
                          disabled={!!rowBusy[u.id]}
                          className="px-3 py-1 rounded bg-green-600 text-white text-xs disabled:opacity-50 flex items-center gap-1 justify-center"
                        >
                          {rowBusy[u.id] ? '...' : 'Add Credits'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManageUsers;