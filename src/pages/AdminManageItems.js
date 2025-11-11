// ✅ FILE: src/pages/AdminManageItems.js (Optimized & Unified)
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getCountFromServer,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { sendAdminItemStatusEmail } from "../services/functionsApi";
import toast from "react-hot-toast";
import {
  Plus, RefreshCcw, CheckCircle, XCircle, Trash2,
  Mail, MapPin, User, Search, Filter, Menu, X,
  Home, ChevronRight, Loader2
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function AdminManageItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [busy, setBusy] = useState({});
  const navigate = useNavigate();

  /* --------------------------------------------------------
   * 🔄 Real-time Items Stream
   * -------------------------------------------------------- */
  useEffect(() => {
    const q = query(collection(db, "donations"));
    const unsub = onSnapshot(q, async (snap) => {
      try {
        const list = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const reqQ = query(collection(db, "requests"), where("itemId", "==", d.id));
            const reqCount = await getCountFromServer(reqQ);
            return { id: d.id, ...data, requestsCount: reqCount.data().count };
          })
        );
        setItems(list);
      } catch (err) {
        console.error("❌ Failed loading donations:", err);
        toast.error("Error loading donations");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    awarded: "bg-purple-100 text-purple-800",
    closed: "bg-gray-200 text-gray-600",
    delivered: "bg-green-100 text-green-800",
  };

  /* --------------------------------------------------------
   * ♻️ Relist Donation (48h)
   * -------------------------------------------------------- */
  const handleRelist = async (item) => {
    if (!window.confirm(`Reopen request window for "${item.title}"?`)) return;
    setBusy((p) => ({ ...p, [item.id]: "relist" }));
    try {
      const callable = httpsCallable(functions, "adminRelistDonation");
      await callable({ donationId: item.id, durationHours: 48 });
      await sendAdminItemStatusEmail(item.ownerEmail, "Item Relisted", item.title);
      toast.success(`✅ "${item.title}" reopened`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reopen item");
    } finally {
      setBusy((p) => ({ ...p, [item.id]: null }));
    }
  };

  /* --------------------------------------------------------
   * ✅ Verify / Unverify
   * -------------------------------------------------------- */
  const handleVerify = async (item, flag = true) => {
    setBusy((p) => ({ ...p, [item.id]: "verify" }));
    try {
      await updateDoc(doc(db, "donations", item.id), { verified: flag });
      if (flag)
        await sendAdminItemStatusEmail(item.ownerEmail, "Item Verified", item.title);
      toast.success(flag ? "✅ Verified" : "❌ Unverified");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update verification");
    } finally {
      setBusy((p) => ({ ...p, [item.id]: null }));
    }
  };

  /* --------------------------------------------------------
   * 🗑️ Delete Donation
   * -------------------------------------------------------- */
  const handleDelete = async (item) => {
    if (!window.confirm(`Permanently delete "${item.title}"?`)) return;
    setBusy((p) => ({ ...p, [item.id]: "delete" }));
    try {
      await deleteDoc(doc(db, "donations", item.id));
      toast.success(`🗑️ "${item.title}" removed`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item");
    } finally {
      setBusy((p) => ({ ...p, [item.id]: null }));
    }
  };

  /* --------------------------------------------------------
   * 🔍 Filter Logic
   * -------------------------------------------------------- */
  const filtered = useMemo(() => {
    let arr = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.ownerEmail?.toLowerCase().includes(q) ||
          i.id?.toLowerCase().includes(q)
      );
    }
    if (filter === "verified") arr = arr.filter((i) => i.verified);
    if (filter === "unverified") arr = arr.filter((i) => !i.verified);
    if (filter === "premium") arr = arr.filter((i) => i.type === "premium");
    if (filter === "free") arr = arr.filter((i) => i.type !== "premium");
    return arr;
  }, [items, search, filter]);

  /* --------------------------------------------------------
   * 🖥️ Admin Layout
   * -------------------------------------------------------- */
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)} className="hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 hover:bg-white/10 rounded">
            🏠 Dashboard
          </Link>
          <Link to="/admin/requests" className="block px-3 py-2 hover:bg-white/10 rounded">
            📋 Requests
          </Link>
          <Link to="/admin/items" className="block px-3 py-2 bg-white/20 rounded">
            🎁 Items
          </Link>
          <Link to="/admin/payments" className="block px-3 py-2 hover:bg-white/10 rounded">
            💰 Payments
          </Link>
          <Link to="/admin/money-donations" className="block px-3 py-2 hover:bg-white/10 rounded">
            ❤️ Money Donations
          </Link>
          <Link to="/admin/lottery" className="block px-3 py-2 hover:bg-white/10 rounded">
            🎰 Lottery
          </Link>
          <Link to="/admin/pickups" className="block px-3 py-2 hover:bg-white/10 rounded">
            🚚 Pickups
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 hover:bg-white/10 rounded">
            👥 Users
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-30 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center text-sm text-gray-600">
              <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-1">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} className="mx-1" />
              Manage Items
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
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
              <h1 className="text-2xl font-bold">Manage Donated Items</h1>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search title, email, ID"
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
                    <option value="all">All</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                    <option value="premium">Premium</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <button
                  onClick={() => navigate("/donate", { state: { mode: "adminSponsored" } })}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm shadow"
                >
                  <Plus size={16} /> Add Item
                </button>
              </div>
            </div>

            {loading && <p className="text-gray-500">Loading donations…</p>}

            {!loading &&
              filtered.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-5 mb-6 bg-white shadow-sm hover:shadow-md transition relative"
                >
                  {/* Item top tags */}
                  <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                    {item.verified && (
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                        ✅ Verified
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.type === "premium"
                          ? "bg-purple-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {item.type === "premium" ? "Premium" : "Free"}
                    </span>
                  </div>

                  <div className="flex gap-5">
                    <img
                      src={item.images?.[0] || "/default-item.jpg"}
                      alt="Item"
                      className="w-28 h-28 object-cover rounded border"
                    />
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold mb-1">{item.title}</h2>
                      <p className="text-sm text-gray-600 mb-2">
                        {item.description || "No description provided."}
                      </p>
                      <div className="text-sm text-gray-600 space-y-1">
                        {item.ownerEmail && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} /> {item.ownerEmail}
                          </div>
                        )}
                        {item.ownerId && (
                          <div className="flex items-center gap-1">
                            <User size={14} /> ID: {item.ownerId}
                          </div>
                        )}
                        {item.delivery && (
                          <div className="flex items-center gap-1">
                            <MapPin size={14} />{" "}
                            {item.delivery === "pickup"
                              ? `Pickup at: ${item.pickupLocation || "N/A"}`
                              : "Delivery"}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        Requests: {item.requestsCount || 0} | Status:{" "}
                        <span
                          className={`px-2 py-0.5 rounded ${
                            statusColors[item.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.status || "pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 justify-end">
                    <AdminButton
                      icon={RefreshCcw}
                      label="Reopen"
                      onClick={() => handleRelist(item)}
                      busy={busy[item.id] === "relist"}
                      color="blue"
                    />
                    <AdminButton
                      icon={item.verified ? XCircle : CheckCircle}
                      label={item.verified ? "Unverify" : "Verify"}
                      onClick={() => handleVerify(item, !item.verified)}
                      busy={busy[item.id] === "verify"}
                      color={item.verified ? "yellow" : "green"}
                    />
                    <AdminButton
                      icon={Trash2}
                      label="Delete"
                      onClick={() => handleDelete(item)}
                      busy={busy[item.id] === "delete"}
                      color="red"
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/* --------------------------------------------------------
 * 🧩 Subcomponent: Action Button
 * -------------------------------------------------------- */
const colorMap = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  yellow: "bg-yellow-500 hover:bg-yellow-600 text-white",
  red: "bg-red-600 hover:bg-red-700 text-white",
};

const AdminButton = ({ icon: Icon, label, busy, onClick, color }) => (
  <button
    onClick={onClick}
    disabled={busy}
    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md shadow ${colorMap[color]} ${
      busy ? "opacity-70 cursor-wait" : ""
    }`}
  >
    {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
    {label}
  </button>
);
