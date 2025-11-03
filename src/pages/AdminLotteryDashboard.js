// ✅ FILE: src/pages/AdminLotteryDashboard.js
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  adminRunLottery,
  adminRelistDonation,
} from "../services/functionsApi";
import { isAdmin } from "../utils/adminUtils";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  ChevronRight,
  RefreshCcw,
  RotateCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export default function AdminLotteryDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [relisting, setRelisting] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortField, setSortField] = useState("expiryAt");
  const [sortDir, setSortDir] = useState("desc");
  const navigate = useNavigate();

  /* ------------------------------------------------------------
   * 🧩 Fetch expired or awarded free items
   * ------------------------------------------------------------ */
  const fetchItems = async () => {
    setLoading(true);
    try {
      const ok = await isAdmin();
      if (!ok) {
        navigate("/unauthorized");
        return;
      }

      const now = Timestamp.now();
      const q = query(
        collection(db, "donations"),
        where("type", "==", "free"),
        where("status", "in", ["open", "awarded"]),
        where("expiryAt", "<=", now),
        orderBy("expiryAt", "desc")
      );
      const snap = await getDocs(q);

      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };

          const rq = query(collection(db, "requests"), where("itemId", "==", d.id));
          const rqSnap = await getDocs(rq);

          let winner = null;
          let totalRequests = rqSnap.size;
          let winnerCount = 0;
          let loserCount = 0;

          rqSnap.docs.forEach((r) => {
            const req = r.data();
            if (req.status === "approved") {
              winnerCount++;
              if (!winner) {
                winner = {
                  name: req.userName || req.displayName || "Unknown",
                  email: req.userEmail || "—",
                  approvedAt:
                    req.updatedAt?.toDate?.().toLocaleString("ja-JP") || "—",
                };
              }
            } else if (req.status === "rejected") {
              loserCount++;
            }
          });

          return {
            ...data,
            winner,
            totalRequests,
            winnerCount,
            loserCount,
          };
        })
      );

      setItems(list);
    } catch (err) {
      console.error("❌ Failed to load lottery items:", err);
      toast.error("Failed to fetch lottery items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  /* ------------------------------------------------------------
   * 🎯 Run all expired lotteries
   * ------------------------------------------------------------ */
  const handleRunLottery = async () => {
    if (!window.confirm("Run unified lottery for all expired items now?")) return;
    setRunning(true);
    toast.loading("🎲 Running lottery process via lottery.ts...");
    try {
      const res = await adminRunLottery({ allExpired: true });
      toast.dismiss();

      if (res?.ok) {
        toast.success("✅ Lottery completed successfully!");
        await fetchItems();
      } else {
        toast.error("⚠️ Unexpected lottery result or no expired items.");
      }
    } catch (err) {
      toast.dismiss();
      console.error("Lottery error:", err);
      toast.error(err?.message || "Lottery run failed.");
    } finally {
      setRunning(false);
    }
  };

  /* ------------------------------------------------------------
   * 🔁 Relist expired or awarded items
   * ------------------------------------------------------------ */
  const handleRelist = async (item) => {
    if (!window.confirm(`Reopen "${item.title}" for a new round?`)) return;
    setRelisting((p) => ({ ...p, [item.id]: true }));
    try {
      const res = await adminRelistDonation({
        donationId: item.id,
        durationHours: 48,
      });
      if (res?.ok) {
        toast.success("🔁 Item relisted successfully!");
        await fetchItems();
      } else {
        toast.error("Failed to relist item.");
      }
    } catch (err) {
      console.error("Relist failed:", err);
      toast.error("Failed to relist item.");
    } finally {
      setRelisting((p) => ({ ...p, [item.id]: false }));
    }
  };

  /* ------------------------------------------------------------
   * 🔽 Sorting Logic
   * ------------------------------------------------------------ */
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const valA =
        sortField === "winnerCount"
          ? a.winnerCount || 0
          : sortField === "totalRequests"
          ? a.totalRequests || 0
          : a.expiryAt?.toDate?.()?.getTime?.() || 0;
      const valB =
        sortField === "winnerCount"
          ? b.winnerCount || 0
          : sortField === "totalRequests"
          ? b.totalRequests || 0
          : b.expiryAt?.toDate?.()?.getTime?.() || 0;

      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return sorted;
  }, [items, sortField, sortDir]);

  /* ------------------------------------------------------------
   * 🖥️ UI
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

      {/* Main */}
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

          <div className="flex items-center gap-2">
            <button
              onClick={fetchItems}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              <RefreshCcw size={12} /> Refresh
            </button>
            <button
              onClick={handleRunLottery}
              disabled={running}
              className={`flex items-center gap-1 px-3 py-1 text-xs text-white rounded ${
                running
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <RotateCw size={12} />
              {running ? "Running..." : "Run All Lotteries"}
            </button>
          </div>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white shadow-md border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">🎰 Lottery Management</h1>

            {loading ? (
              <p className="text-gray-500 text-center py-10">Loading expired items…</p>
            ) : sortedItems.length === 0 ? (
              <p className="text-gray-600 text-center py-10">
                No expired or awarded items found.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-left text-gray-700 select-none">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => toggleSort("expiryAt")}
                      >
                        Expiry{" "}
                        {sortField === "expiryAt" &&
                          (sortDir === "asc" ? (
                            <ArrowUp size={12} className="inline" />
                          ) : (
                            <ArrowDown size={12} className="inline" />
                          ))}
                      </th>
                      <th className="px-4 py-3">Status</th>
                      <th
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => toggleSort("totalRequests")}
                      >
                        Participants{" "}
                        {sortField === "totalRequests" &&
                          (sortDir === "asc" ? (
                            <ArrowUp size={12} className="inline" />
                          ) : (
                            <ArrowDown size={12} className="inline" />
                          ))}
                      </th>
                      <th
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => toggleSort("winnerCount")}
                      >
                        Winner Count{" "}
                        {sortField === "winnerCount" &&
                          (sortDir === "asc" ? (
                            <ArrowUp size={12} className="inline" />
                          ) : (
                            <ArrowDown size={12} className="inline" />
                          ))}
                      </th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item) => (
                      <tr key={item.id} className="border-t hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 font-medium">
                          {item.title}
                          <div className="text-xs text-gray-500">{item.id}</div>
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {item.expiryAt?.toDate?.().toLocaleString() || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              item.status === "open"
                                ? "bg-yellow-100 text-yellow-700"
                                : item.status === "awarded"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.totalRequests || 0}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {item.winnerCount || 0}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRelist(item)}
                            disabled={relisting[item.id]}
                            className={`flex items-center gap-1 px-3 py-1 rounded text-xs text-white ${
                              relisting[item.id]
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            <RefreshCcw size={12} />
                            {relisting[item.id] ? "Reopening..." : "Reopen"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
