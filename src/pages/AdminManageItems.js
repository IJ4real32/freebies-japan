// ✅ FILE: src/pages/AdminManageItems.js (Unified Admin Layout)
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { sendAdminItemStatusEmail } from "../services/functionsApi";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Plus,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Trash2,
  Mail,
  MapPin,
  User,
  Search,
  Filter,
  Menu,
  X,
  Home,
  ChevronRight,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function AdminManageItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relisting, setRelisting] = useState({});
  const [verifying, setVerifying] = useState({});
  const [deleting, setDeleting] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  /* --------------------------------------------------------
   * 🔄 Load Donations
   * -------------------------------------------------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "donations"), async (snap) => {
      try {
        const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const enriched = await Promise.all(
          base.map(async (donation) => {
            const reqQ = query(
              collection(db, "requests"),
              where("itemId", "==", donation.id)
            );
            const reqSnap = await getDocs(reqQ);
            const requests = reqSnap.docs.map((r) => ({
              id: r.id,
              ...r.data(),
            }));
            return { ...donation, requests };
          })
        );
        setItems(enriched);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Failed to load items");
      }
    });
    return () => unsub();
  }, []);

  const formatDate = (v) =>
    v?.seconds
      ? format(new Date(v.seconds * 1000), "MMM d, yyyy HH:mm")
      : v
      ? format(new Date(v), "MMM d, yyyy HH:mm")
      : "—";

  const statusColors = {
    approved: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-yellow-100 text-yellow-800",
    delivered: "bg-green-100 text-green-800",
  };

  /* --------------------------------------------------------
   * ♻️ Relist Item
   * -------------------------------------------------------- */
  const handleRelist = async (item) => {
    if (!window.confirm(`Reopen request period for "${item.title}"?`)) return;
    setRelisting((p) => ({ ...p, [item.id]: true }));

    try {
      const callable = httpsCallable(functions, "adminRelistDonation");
      await callable({ donationId: item.id, durationHours: 48 });
      toast.success(`✅ "${item.title}" reopened successfully!`);
    } catch (err) {
      console.error("Relist failed:", err);
      toast.error("❌ Failed to reopen item.");
    } finally {
      setRelisting((p) => ({ ...p, [item.id]: false }));
    }
  };

  /* --------------------------------------------------------
   * ✅ Verify Item
   * -------------------------------------------------------- */
  const handleVerify = async (item, flag = true) => {
    setVerifying((p) => ({ ...p, [item.id]: true }));
    try {
      await updateDoc(doc(db, "donations", item.id), { verified: flag });
      toast.success(flag ? "✅ Item verified" : "🚫 Verification removed");
    } catch (err) {
      console.error("Verify failed:", err);
      toast.error("Failed to update verification status");
    } finally {
      setVerifying((p) => ({ ...p, [item.id]: false }));
    }
  };

  /* --------------------------------------------------------
   * ❌ Delete Item
   * -------------------------------------------------------- */
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}" permanently?`)) return;
    setDeleting((p) => ({ ...p, [item.id]: true }));
    try {
      await deleteDoc(doc(db, "donations", item.id));
      toast.success(`🗑️ "${item.title}" deleted successfully`);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete item");
    } finally {
      setDeleting((p) => ({ ...p, [item.id]: false }));
    }
  };

  /* --------------------------------------------------------
   * 🔍 Filtering
   * -------------------------------------------------------- */
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.ownerEmail?.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }
    if (filter !== "all") {
      filtered = filtered.filter((i) => {
        if (filter === "verified") return i.verified === true;
        if (filter === "unverified") return !i.verified;
        if (filter === "premium")
          return i.type === "premium" || i.accessType === "premium";
        if (filter === "free")
          return i.type === "free" || i.accessType === "free";
        return true;
      });
    }
    return filtered;
  }, [items, search, filter]);

  /* --------------------------------------------------------
   * 🖥️ Unified Admin UI
   * -------------------------------------------------------- */
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
          <button onClick={() => setSidebarOpen(false)} className="text-white hover:text-gray-300">
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
          <Link
            to="/admin/items"
            className="block px-3 py-2 rounded bg-white/20"
          >
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
          <Link to="/admin/pickups" className="block px-3 py-2 rounded hover:bg-white/10">
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
              <span className="text-gray-800 font-medium">Manage Items</span>
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
            <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
              <h1 className="text-2xl font-bold text-gray-800">Manage Donated Items</h1>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, email, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 border rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Filter size={16} className="text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                    <option value="premium">Premium</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <button
                  onClick={() =>
                    navigate("/donate", { state: { mode: "adminSponsored" } })
                  }
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm shadow"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
            </div>

            {loading && <p className="text-gray-500">Loading items…</p>}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-4">
                {error}
              </div>
            )}

            {!loading &&
              filteredItems.map((item) => {
                const isPremium =
                  item.type === "premium" || item.accessType === "premium";
                const cycle = item.availabilityCycle || 1;
                return (
                  <div
                    key={item.id}
                    className="border rounded-lg mb-6 bg-white shadow-sm hover:shadow-md transition p-5 relative"
                  >
                    <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                      {item.verified && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                          ✅ Verified
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          isPremium
                            ? "bg-purple-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {isPremium ? "Premium" : "Free"}
                      </span>
                    </div>

                    <div className="flex items-start gap-5">
                      <div className="w-32 flex-shrink-0">
                        <img
                          src={item.images?.[0] || "/default-item.jpg"}
                          alt="Item"
                          className="w-28 h-28 object-cover rounded border"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Status: {item.status || "pending"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Cycle: {cycle}</p>
                      </div>

                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.title || "Untitled"}
                        </h2>
                        <p className="text-sm text-gray-600 mb-3">
                          {item.description || "No description provided."}
                        </p>

                        <div className="text-sm mb-3 space-y-1">
                          {item.ownerEmail && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <Mail size={14} /> <span>{item.ownerEmail}</span>
                            </div>
                          )}
                          {item.ownerId && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <User size={14} /> <span>ID: {item.ownerId}</span>
                            </div>
                          )}
                          {item.delivery && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <MapPin size={14} />{" "}
                              <span>
                                {item.delivery === "pickup"
                                  ? `Pickup at: ${item.pickupLocation || "N/A"}`
                                  : "Delivery"}
                              </span>
                            </div>
                          )}
                        </div>

                        {item.requests?.length ? (
                          <div className="border-t pt-3 mt-3">
                            <h3 className="font-medium text-sm mb-2">
                              Requests ({item.requests.length})
                            </h3>
                            <div className="space-y-2">
                              {item.requests.map((r) => (
                                <div
                                  key={r.id}
                                  className="border rounded p-2 bg-gray-50 text-sm"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium">
                                        👤 {r.userName || "Unknown"}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {r.userEmail || "—"}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`inline-block px-2 py-1 rounded text-xs ${
                                          statusColors[r.status] ||
                                          "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {r.status}
                                      </span>
                                      {r.lastStatusUpdate && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          {formatDate(r.lastStatusUpdate)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic mt-3">
                            No requests yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 justify-end">
                      <button
                        disabled={relisting[item.id]}
                        onClick={() => handleRelist(item)}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                          relisting[item.id]
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <RefreshCcw size={14} />
                        {relisting[item.id] ? "Reopening..." : "Reopen Requests"}
                      </button>

                      <button
                        disabled={verifying[item.id]}
                        onClick={() => handleVerify(item, !item.verified)}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                          item.verified
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {item.verified ? (
                          <XCircle size={14} />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        {item.verified ? "Unverify" : "Verify"}
                      </button>

                      <button
                        disabled={deleting[item.id]}
                        onClick={() => handleDelete(item)}
                        className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 size={14} />
                        {deleting[item.id] ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </main>
    </div>
  );
}
