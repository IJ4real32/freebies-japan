// ✅ FILE: src/pages/AdminPickups.js (Desktop-first unified admin layout)
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
} from "lucide-react";
import { sendAdminItemStatusEmail } from "../services/functionsApi";
import { isAdmin } from "../utils/adminUtils";

export default function AdminPickups() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("scheduled");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ Live load pickups
  useEffect(() => {
    const load = async () => {
      const ok = await isAdmin();
      if (!ok) return (window.location.href = "/unauthorized");

      const q = query(collection(db, "pickups"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPickups(rows);
        setLoading(false);
      });
      return () => unsub();
    };
    load();
  }, []);

  // ✅ Filter and search
  const filtered = pickups.filter(
    (p) =>
      (!filter || p.status === filter) &&
      (!search ||
        p.adminNote?.toLowerCase().includes(search.toLowerCase()) ||
        p.method?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUpdate = async (p, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    setUpdating((prev) => ({ ...prev, [p.id]: true }));
    try {
      await updateDoc(doc(db, "pickups", p.id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      toast.success(`Pickup marked as ${newStatus}`);
      await sendAdminItemStatusEmail({
        userEmail: p.userEmail,
        status: `Pickup ${newStatus}`,
        itemTitle: `Item ID: ${p.itemId}`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update pickup");
    } finally {
      setUpdating((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
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
              <span className="text-gray-800 font-medium">Pickups & Deliveries</span>
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
            <div className="flex flex-wrap items-center gap-3 mb-5">
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
                <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search note or method"
                  className="border rounded-md pl-8 pr-3 py-2 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-gray-500">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Pickup list */}
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No records found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="border rounded-xl bg-white shadow-sm p-4 flex flex-col sm:flex-row justify-between"
                  >
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Method:</strong> {p.method}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Scheduled:</strong>{" "}
                        {p.scheduledDate
                          ? new Date(
                              p.scheduledDate.seconds
                                ? p.scheduledDate.seconds * 1000
                                : p.scheduledDate
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                      {p.adminNote && (
                        <p className="text-sm text-gray-500 mt-1">
                          Note: {p.adminNote}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Created:{" "}
                        {p.createdAt?.seconds
                          ? new Date(p.createdAt.seconds * 1000).toLocaleString()
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          p.status === "scheduled"
                            ? "bg-yellow-100 text-yellow-700"
                            : p.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
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
                            <CheckCircle size={12} /> Done
                          </button>
                          <button
                            disabled={updating[p.id]}
                            onClick={() => handleUpdate(p, "cancelled")}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-full"
                          >
                            <XCircle size={12} /> Cancel
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
