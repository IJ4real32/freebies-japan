import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const RequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAdmin } = useAuth();
  const [adminStatus, setAdminStatus] = useState(false);

  // Verify admin status
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const admin = await isAdmin();
        setAdminStatus(admin);
        if (!admin) {
          setError('Admin privileges required');
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to verify permissions');
        setLoading(false);
      }
    };
    verifyAdmin();
  }, [isAdmin]);

  useEffect(() => {
    if (!adminStatus) return;

    const fetchAllRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get only pending requests by default
        const q = query(
          collection(db, 'requests'),
          where('status', 'in', ['pending', 'approved', 'rejected'])
        );
        
        const querySnapshot = await getDocs(q);
        const enriched = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            try {
              const request = docSnap.data();
              const itemDoc = await getDoc(doc(db, 'donations', request.itemId));
              return {
                id: docSnap.id,
                ...request,
                itemTitle: itemDoc.exists() ? itemDoc.data().title : 'Unknown Item',
                createdAt: request.createdAt?.toDate?.() || new Date(),
              };
            } catch (err) {
              console.error(`Error processing request ${docSnap.id}:`, err);
              return null;
            }
          })
        );
        
        setRequests(enriched
          .filter(r => r !== null)
          .sort((a, b) => b.createdAt - a.createdAt)
        );
      } catch (err) {
        console.error('Error fetching requests:', err);
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchAllRequests();
  }, [adminStatus]);

  const handleAction = async (id, status) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'requests', id), { status });
      setRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error('Error updating request:', err);
      setError(`Failed to ${status} request`);
    } finally {
      setLoading(false);
    }
  };

  if (!adminStatus && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Admin access required'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Request Management</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          No requests found
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className={`border p-4 rounded-lg shadow-sm ${
                r.status === 'approved' ? 'bg-green-50 border-green-200' :
                r.status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-white border-gray-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{r.itemTitle}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">User:</span> {r.userEmail}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Date:</span> {format(r.createdAt, 'PPpp')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Status:</span>{' '}
                        <span
                          className={
                            r.status === 'pending'
                              ? 'text-yellow-600'
                              : r.status === 'approved'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>

                  {(r.fullName || r.address) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium text-sm mb-1">Delivery Details</h4>
                      {r.fullName && <p className="text-sm"><strong>Name:</strong> {r.fullName}</p>}
                      {r.address && <p className="text-sm"><strong>Address:</strong> {r.address}</p>}
                    </div>
                  )}
                </div>

                {r.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2">
                    <button
                      onClick={() => handleAction(r.id, 'approved')}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, 'rejected')}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestsAdmin;