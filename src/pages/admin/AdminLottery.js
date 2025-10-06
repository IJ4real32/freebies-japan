// ✅ FILE: src/pages/admin/AdminLottery.js - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLottery() {
  const { currentUser } = useAuth();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLotteries = useCallback(async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'lotteries'));
      
      const lotteriesData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let itemData = {};
          let requestCount = 0;
          let winnerDetails = [];
          
          // Get item details
          if (data.itemId) {
            const itemDoc = await getDoc(doc(db, 'donations', data.itemId));
            if (itemDoc.exists()) {
              itemData = itemDoc.data();
            }
          }

          // Get request count for this item
          if (data.itemId) {
            const requestsSnap = await getDocs(
              query(collection(db, 'requests'), where('itemId', '==', data.itemId))
            );
            requestCount = requestsSnap.size;
          }

          // Get winner details
          if (data.winners && data.winners.length > 0) {
            winnerDetails = await Promise.all(
              data.winners.map(async (winnerId) => {
                const userDoc = await getDoc(doc(db, 'users', winnerId));
                return userDoc.exists() ? userDoc.data() : { uid: winnerId, displayName: 'Unknown User' };
              })
            );
          }

          return {
            id: docSnap.id,
            ...data,
            itemTitle: itemData?.title || 'No linked item',
            itemImage: itemData?.images?.[0] || '/default-item.jpg',
            requestCount,
            winnerDetails,
            // Auto-detected properties
            isAutoCreated: !data.createdBy || data.createdBy === 'system',
            hasItem: !!data.itemId,
          };
        })
      );
      
      // Sort: auto-created lotteries first, then manual ones
      setLotteries(lotteriesData.sort((a, b) => {
        if (a.isAutoCreated && !b.isAutoCreated) return -1;
        if (!a.isAutoCreated && b.isAutoCreated) return 1;
        return 0;
      }));
    } catch (error) {
      console.error('Error fetching lotteries:', error);
      alert('Failed to load lotteries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotteries();
  }, [fetchLotteries]); // FIXED: Changed from fetchLottery to fetchLotteries

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-yellow-100 text-yellow-800';
      case 'drawn': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) return timestamp.toDate().toLocaleString();
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading lotteries...</div>
        </div>
      </div>
    );
  }

  const autoLotteries = lotteries.filter(l => l.isAutoCreated);
  const manualLotteries = lotteries.filter(l => !l.isAutoCreated);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Lottery Management</h1>

        {/* Auto-Created Lotteries Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Auto-Created Lotteries ({autoLotteries.length})
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Created automatically for free items)
            </span>
          </h2>

          {autoLotteries.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No auto-created lotteries found. Free item donations will automatically create lotteries.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winners</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closes At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {autoLotteries.map((lottery) => (
                      <tr key={lottery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={lottery.itemImage}
                              alt={lottery.itemTitle}
                              onError={(e) => e.target.src = '/default-item.jpg'}
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {lottery.itemTitle}
                              </div>
                              <div className="text-sm text-gray-500">
                                Lottery: {lottery.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lottery.status)}`}>
                            {lottery.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lottery.requestCount}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lottery.ticketCount || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lottery.winners ? (
                            <div>
                              {lottery.winnerDetails.map((winner, index) => (
                                <div key={index} className="text-xs">
                                  {winner.displayName || winner.uid}
                                </div>
                              ))}
                            </div>
                          ) : (
                            'Not drawn'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(lottery.closesAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Manual Lotteries Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Manual Lotteries ({manualLotteries.length})
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Created manually by admins)
            </span>
          </h2>

          {manualLotteries.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No manual lotteries created yet.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winners</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked Item</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {manualLotteries.map((lottery) => (
                      <tr key={lottery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {lottery.title}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lottery.status)}`}>
                            {lottery.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lottery.ticketCount || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lottery.winners ? lottery.winners.length : 0} / {lottery.maxWinners}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lottery.hasItem ? lottery.itemTitle : 'No item linked'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}