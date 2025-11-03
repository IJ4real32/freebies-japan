// ✅ FILE: src/pages/admin/AdminLottery.js (Desktop-first, Collapsible Sidebar)
import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { isAdmin } from "../../utils/adminUtils";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Home, ChevronRight, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLottery() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ------------------------------------------------------------
   * Fetch Lotteries (Auto + Manual)
   * ------------------------------------------------------------ */
  const fetchLotteries = useCallback(async () => {
    try {
      setLoading(true);
      const ok = await isAdmin();
      if (!ok) {
        navigate("/unauthorized");
        return;
      }

      const snapshot = await getDocs(collection(db, "lotteries"));

      const lotteriesData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let itemData = {};
          let requestCount = 0;
          let winnerDetails = [];

          // Fetch item info
          if (data.itemId) {
            const itemDoc = await getDoc(doc(db, "donations", data.itemId));
            if (itemDoc.exists()) itemData = itemDoc.data();
          }

          // Count requests
          if (data.itemId) {
            const requestsSnap = await getDocs(
              query(collection(db, "requests"), where("itemId", "==", data.itemId))
            );
            requestCount = requestsSnap.size;
          }

          // Fetch winners
          if (data.winners && data.winners.length > 0) {
            winnerDetails = await Promise.all(
              data.winners.map(async (winnerId) => {
                const userDoc = await getDoc(doc(db, "users", winnerId));
                return userDoc.exists()
                  ? userDoc.data()
                  : { uid: winnerId, displayName: "Unknown User" };
              })
            );
          }

          return {
            id: docSnap.id,
            ...data,
            itemTitle: itemData?.title || "No linked item",
            itemImage: itemData?.images?.[0] || "/default-item.jpg",
            requestCount,
            winnerDetails,
            isAutoCreated: !data.createdBy || data.createdBy === "system",
            hasItem: !!data.itemId,
          };
        })
      );

      // Sort auto-created first
      setLotteries(
        lotteriesData.sort((a, b) => (a.isAutoCreated === b.isAutoCreated ? 0 : a.isAutoCreated ? -1 : 1))
      );
    } catch (error) {
      console.error("Error fetching lotteries:", error);
      toast.error("Failed to load lotteries.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLotteries();
  }, [fetchLotteries]);

  /* ------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------ */
  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "open":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-yellow-100 text-yellow-800";
      case "drawn":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    if (timestamp.toDate) return timestamp.toDate().toLocaleString("ja-JP");
    return new Date(timestamp).toLocaleString("ja-JP");
  };

  const autoLotteries = lotteries.filter((l) => l.isAutoCreated);
  const manualLotteries = lotteries.filter((l) => !l.isAutoCreated);

  /* ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------ */
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold tracking-wide">Admin Panel</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">
            🏠 Dashboard
          </Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded hover:bg-white/10">
            📋 Requests
          </Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">
            🎁 Items
          </Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded hover:bg-white/10">
            💰 Payments
          </Link>
          <Link to="/admin/money-donations" className="block px-3 py-2 rounded hover:bg-white/10">
            ❤️ Money Donations
          </Link>
          <Link
            to="/admin/lottery"
            className="block px-3 py-2 rounded bg-white/20"
          >
            🎰 Lottery
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">
            👥 Users
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center text-sm text-gray-600">
              <Link to="/admin" className="flex items-center gap-1 hover:text-indigo-600">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} className="mx-1" />
              <span className="text-gray-800 font-medium">Lottery Management</span>
            </div>
          </div>

          <button
            onClick={fetchLotteries}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
          >
            <RefreshCcw size={12} /> Refresh
          </button>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white shadow-md border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">🎰 Lottery Management</h1>

            {loading ? (
              <div className="text-center text-gray-500 py-10">
                Loading lotteries…
              </div>
            ) : (
              <>
                {/* Auto-Created Lotteries */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Auto-Created Lotteries ({autoLotteries.length})
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Created automatically for free items)
                    </span>
                  </h2>

                  {autoLotteries.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                      No auto-created lotteries found.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left text-gray-700">
                          <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Requests</th>
                            <th className="px-4 py-3">Tickets</th>
                            <th className="px-4 py-3">Winners</th>
                            <th className="px-4 py-3">Closes At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoLotteries.map((lottery) => (
                            <tr
                              key={lottery.id}
                              className="border-t hover:bg-gray-50 align-top"
                            >
                              <td className="px-4 py-3 flex items-center gap-3">
                                <img
                                  src={lottery.itemImage}
                                  alt={lottery.itemTitle}
                                  className="w-10 h-10 rounded object-cover border"
                                  onError={(e) =>
                                    (e.currentTarget.src = "/default-item.jpg")
                                  }
                                />
                                <div>
                                  <div className="font-medium">
                                    {lottery.itemTitle}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {lottery.title}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(
                                    lottery.status
                                  )}`}
                                >
                                  {lottery.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.requestCount}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.ticketCount || 0}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.winnerDetails.length > 0 ? (
                                  lottery.winnerDetails.map((w, i) => (
                                    <div key={i} className="text-xs">
                                      {w.displayName || w.uid}
                                    </div>
                                  ))
                                ) : (
                                  <span className="italic text-gray-500">
                                    Not drawn
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {formatDate(lottery.closesAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Manual Lotteries */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Manual Lotteries ({manualLotteries.length})
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Created manually by admins)
                    </span>
                  </h2>

                  {manualLotteries.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                      No manual lotteries found.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left text-gray-700">
                          <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Tickets</th>
                            <th className="px-4 py-3">Winners</th>
                            <th className="px-4 py-3">Linked Item</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualLotteries.map((lottery) => (
                            <tr
                              key={lottery.id}
                              className="border-t hover:bg-gray-50 align-top"
                            >
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {lottery.title}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(
                                    lottery.status
                                  )}`}
                                >
                                  {lottery.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.ticketCount || 0}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.winners
                                  ? lottery.winners.length
                                  : 0}{" "}
                                / {lottery.maxWinners || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.hasItem
                                  ? lottery.itemTitle
                                  : "No item linked"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
