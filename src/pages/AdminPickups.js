// ✅ FILE: src/pages/AdminPickups.js (Unified + Polished)
import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Truck,
  Search,
  Menu,
  X,
  Home,
  ChevronRight,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { sendAdminItemStatusEmail } from "../services/functionsApi";

export default function AdminPickups() {
  const { isAdmin, isAuthenticated } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* --------------------------------------------------------
   * 🕹️ Load Data (Real-time)
   * -------------------------------------------------------- */
  useEffect(() => {
    if (!isAuthenticated) return (window.location.href = "/login");
    if (!isAdmin()) return (window.location.href = "/unauthorized");

    const q = query(collection(db, "pickups"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPickups(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [isAuthenticated, isAdmin]);

  /* --------------------------------------------------------
   * 📅 Helper: Format Date
   * -------------------------------------------------------- */
  const formatDate = (v) => {
    if (!v) return "—";
    const d = v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* --------------------------------------------------------
   * 🔍 Filter and Search Logic
   * -------------------------------------------------------- */
  const filtered = pickups.filter(
    (p) =>
      (!filter || p.status === filter) &&
      (!search ||
        p.adminNote?.toLowerCase().includes(search.toLowerCase()) ||
        p.method?.toLowerCase().includes(search.toLowerCase()))
  );

  /* --------------------------------------------------------
   * 🧾 Update Pickup Status
   * -------------------------------------------------------- */
  const handleUpdate = async (p, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    setUpdating((prev) => ({ ...prev, [p.id]: true }));

    try {
      await updateDoc(doc(db, "pickups", p.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      await sendAdminItemStatusEmail({
        userEmail: p.userEmail,
        status: `Pickup ${newStatus}`,
        itemTitle: `Item ID: ${p.itemId}`,
      });

      toast.success(
        `✅ Pickup for Item ${p.itemId} marked as ${newStatus.toUpperCase()}`
      );
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to update pickup status");
    } finally {
      setUpdating((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  /* --------------------------------------------------------
   * 🖥️ UI
   * -------------------------------------------------------- */
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Loading pickups…
      </div>
    );

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
          <Link to="/admin/lottery" className="block px-3 py-2 rounded hover:bg-white/10">
            🎰 Lottery
          </Link>
          <Link
            to="/admin/pickups"
            className="block px-3 py-2 rounded bg-white/20"
          >
            🚚 Pickups
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
              <span className="text-gray-800 font-medium">
                Pickups & Deliveries
              </span>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
          >
            <RefreshCcw size={12} /> Refresh
          </button>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Truck size={22} /> Pickups & Deliveries
            </h1>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-2 top-2.5 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search note or method"
                  className="border rounded-md pl-8 pr-3 py-2 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-gray-500">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Pickup list */}
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No pickup or delivery records found.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="border rounded-xl bg-white shadow-sm p-4 flex flex-col sm:flex-row justify-between hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      <p className="text-sm text-gray-700 font-medium">
                        Method:{" "}
                        <span className="font-semibold text-indigo-700">
                          {p.method || "—"}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Scheduled:{" "}
                        <b>{p.scheduledDate ? formatDate(p.scheduledDate) : "N/A"}</b>
                      </p>
                      {p.adminNote && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Note: {p.adminNote}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {formatDate(p.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          p.status === "scheduled"
                            ? "bg-yellow-100 text-yellow-700"
                            : p.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {p.status}
                      </span>

                      {p.status === "scheduled" && (
                        <>
                          <button
                            disabled={updating[p.id]}
                            onClick={() => handleUpdate(p, "completed")}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-full"
                          >
                            {updating[p.id] ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            Done
                          </button>
                          <button
                            disabled={updating[p.id]}
                            onClick={() => handleUpdate(p, "cancelled")}
                            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1 rounded-full"
                          >
                            {updating[p.id] ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <XCircle size={12} />
                            )}
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
