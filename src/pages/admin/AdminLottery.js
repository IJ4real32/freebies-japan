// ✅ FILE: src/pages/admin/AdminLottery.js (Desktop-first, Collapsible Sidebar)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { checkAdminStatus } from "../../utils/adminUtils";

import { Link, useNavigate } from "react-router-dom";
import { 
  Menu, X, Home, ChevronRight, RefreshCcw, 
  Calendar, Clock, Loader2, Ticket, Crown,
  ArrowUpDown, ArrowDown, ArrowUp, Search, Filter
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLottery() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState({ field: "createdAt", direction: "desc" });

  /* ------------------------------------------------------------
   * Fetch Lotteries (Auto + Manual) WITH DESCENDING ORDER
   * ------------------------------------------------------------ */
  const fetchLotteries = useCallback(async () => {
    try {
      setLoading(true);
      const ok = await checkAdminStatus();
      if (!ok) {
        navigate("/unauthorized");
        return;
      }

      // ✅ FIXED: Query with descending order by createdAt
      const q = query(collection(db, "lotteries"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

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

      // ✅ ENSURE descending order by createdAt (most recent first)
      const sortedLotteries = lotteriesData.sort((a, b) => {
        const aTime = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
        const bTime = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
        return bTime - aTime; // Descending order
      });

      setLotteries(sortedLotteries);
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
   * Filtering & Sorting with ENSURED DESCENDING ORDER
   * ------------------------------------------------------------ */
  const filteredLotteries = useMemo(() => {
    let result = lotteries;
    
    // Apply search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(l =>
        l.title?.toLowerCase().includes(s) ||
        l.itemTitle?.toLowerCase().includes(s) ||
        (l.isAutoCreated ? "auto" : "manual").includes(s)
      );
    }
    
    // Apply status filter
    if (filter !== "all") {
      switch (filter) {
        case "auto":
          result = result.filter(l => l.isAutoCreated);
          break;
        case "manual":
          result = result.filter(l => !l.isAutoCreated);
          break;
        case "open":
          result = result.filter(l => l.status === "open");
          break;
        case "drawn":
          result = result.filter(l => l.status === "drawn");
          break;
        case "closed":
          result = result.filter(l => l.status === "closed");
          break;
        default:
          break;
      }
    }
    
    // Apply sorting
    if (sort.field) {
      result = [...result].sort((a, b) => {
        const dir = sort.direction === "asc" ? 1 : -1;
        if (sort.field === "createdAt") {
          const aDate = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
          const bDate = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
          return (aDate - bDate) * dir;
        }
        if (sort.field === "closesAt") {
          const aDate = new Date(a.closesAt?.seconds * 1000 || a.closesAt || 0);
          const bDate = new Date(b.closesAt?.seconds * 1000 || b.closesAt || 0);
          return (aDate - bDate) * dir;
        }
        if (sort.field === "ticketCount") {
          const aTickets = a.ticketCount || 0;
          const bTickets = b.ticketCount || 0;
          return (aTickets - bTickets) * dir;
        }
        if (sort.field === "title") {
          const aTitle = (a.title || "").toLowerCase();
          const bTitle = (b.title || "").toLowerCase();
          return aTitle.localeCompare(bTitle) * dir;
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
  }, [lotteries, search, filter, sort]);

  const toggleSort = (field) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  };

  const renderSortIcon = (field) => {
    if (sort.field !== field) return <ArrowUpDown size={14} className="inline text-gray-400" />;
    return sort.direction === "asc" ? (
      <ArrowUp size={14} className="inline text-blue-600" />
    ) : (
      <ArrowDown size={14} className="inline text-blue-600" />
    );
  };

  /* ------------------------------------------------------------
   * Statistics
   * ------------------------------------------------------------ */
  const stats = useMemo(() => {
    const total = lotteries.length;
    const auto = lotteries.filter(l => l.isAutoCreated).length;
    const manual = lotteries.filter(l => !l.isAutoCreated).length;
    const open = lotteries.filter(l => l.status === "open").length;
    const drawn = lotteries.filter(l => l.status === "drawn").length;
    
    return { total, auto, manual, open, drawn };
  }, [lotteries]);

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

  const formatTimeAgo = (v) => {
    if (!v) return "—";
    const d = v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
    
    if (isNaN(d.getTime())) return "—";
    
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(v);
  };

  const autoLotteries = filteredLotteries.filter((l) => l.isAutoCreated);
  const manualLotteries = filteredLotteries.filter((l) => !l.isAutoCreated);

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

        {/* Statistics */}
        <section className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-6xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700 font-medium">Auto</p>
              <p className="text-2xl font-bold text-green-800">{stats.auto}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-purple-700 font-medium">Manual</p>
              <p className="text-2xl font-bold text-purple-800">{stats.manual}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-sm text-yellow-700 font-medium">Open</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.open}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <p className="text-sm text-indigo-700 font-medium">Drawn</p>
              <p className="text-2xl font-bold text-indigo-800">{stats.drawn}</p>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white shadow-md border border-gray-200 rounded-lg p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Ticket size={24} />
                Lottery Management
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search lotteries..."
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
                    <option value="all">All Lotteries</option>
                    <option value="auto">Auto Created</option>
                    <option value="manual">Manual</option>
                    <option value="open">Open</option>
                    <option value="drawn">Drawn</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-gray-500 py-10">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <p>Loading lotteries...</p>
              </div>
            ) : filteredLotteries.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                <p>No lotteries found</p>
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
                            <th className="px-4 py-3">
                              <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("closesAt")}>
                                <Clock size={14} />
                                Closes At {renderSortIcon("closesAt")}
                              </div>
                            </th>
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
                                  <div className="text-xs text-gray-400 mt-1">
                                    Created: {formatTimeAgo(lottery.createdAt)}
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
                                <div className="flex items-center gap-1">
                                  <Ticket size={14} className="text-gray-400" />
                                  {lottery.ticketCount || 0}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.winnerDetails.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <Crown size={14} className="text-yellow-500" />
                                    {lottery.winnerDetails.length} winner(s)
                                  </div>
                                ) : (
                                  <span className="italic text-gray-500">
                                    Not drawn
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                <div className="flex flex-col">
                                  <span className="text-sm">{formatDate(lottery.closesAt)}</span>
                                  <span className="text-xs text-gray-400">{formatTimeAgo(lottery.closesAt)}</span>
                                </div>
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
                            <th className="px-4 py-3">
                              <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("createdAt")}>
                                <Clock size={14} />
                                Created {renderSortIcon("createdAt")}
                              </div>
                            </th>
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
                                <div className="flex items-center gap-1">
                                  <Ticket size={14} className="text-gray-400" />
                                  {lottery.ticketCount || 0}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="flex items-center gap-1">
                                  <Crown size={14} className="text-yellow-500" />
                                  {lottery.winners ? lottery.winners.length : 0}{" "}
                                  / {lottery.maxWinners || "—"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {lottery.hasItem
                                  ? lottery.itemTitle
                                  : "No item linked"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                <div className="flex flex-col">
                                  <span className="text-sm">{formatDate(lottery.createdAt)}</span>
                                  <span className="text-xs text-gray-400">{formatTimeAgo(lottery.createdAt)}</span>
                                </div>
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