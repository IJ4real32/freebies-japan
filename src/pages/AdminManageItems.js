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
  orderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { sendAdminItemStatusEmail } from "../services/functionsApi";
import toast from "react-hot-toast";
import { checkAdminStatus } from "../utils/adminUtils";

import {
  Plus, RefreshCcw, CheckCircle, XCircle, Trash2,
  Mail, MapPin, User, Search, Filter, Menu, X,
  Home, ChevronRight, Loader2, Calendar, Clock
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
   * 🎯 STATUS CONFIGURATION & NORMALIZATION
   * -------------------------------------------------------- */
  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    awarded: "bg-purple-100 text-purple-800",
    expired: "bg-red-100 text-red-800",
    requestClosed: "bg-gray-300 text-gray-800",
  };

  const premiumStatusColors = {
    available: "bg-green-100 text-green-800",
    depositPaid: "bg-yellow-100 text-yellow-800",
    preparingDelivery: "bg-blue-100 text-blue-800",
    inTransit: "bg-purple-100 text-purple-800",
    delivered: "bg-indigo-100 text-indigo-800",
    sold: "bg-gray-100 text-gray-800",
  };

  // Data normalization function
  const normalizeItemData = (item) => {
    const normalized = { ...item };
    
    // Normalize legacy status values for free items
    if (item.type !== "premium") {
      if (!item.status || item.status === "sponsored" || item.status === "") {
        normalized.status = "active";
      }
    }
    
    // Normalize premiumStatus for premium items
    if (item.type === "premium") {
      if (!item.premiumStatus || item.premiumStatus === "") {
        normalized.premiumStatus = "available";
      }
    }
    
    return normalized;
  };

  /* --------------------------------------------------------
   * 🔄 Real-time Items Stream WITH DATA NORMALIZATION
   * -------------------------------------------------------- */
  useEffect(() => {
    const q = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc")
    );
    
    const unsub = onSnapshot(q, async (snap) => {
      try {
        const list = await Promise.all(
          snap.docs.map(async (d) => {
            let data = d.data();
            
            // ✅ Apply data normalization
            data = normalizeItemData(data);
            
            // Update document if normalization changed anything
            const originalData = d.data();
            const needsUpdate = 
              (data.type !== "premium" && data.status !== originalData.status) ||
              (data.type === "premium" && data.premiumStatus !== originalData.premiumStatus);
              
            if (needsUpdate) {
              try {
                await updateDoc(doc(db, "donations", d.id), {
                  ...(data.type !== "premium" && { status: data.status }),
                  ...(data.type === "premium" && { premiumStatus: data.premiumStatus }),
                  updatedAt: new Date()
                });
              } catch (updateErr) {
                console.warn("Could not auto-update legacy data:", updateErr);
              }
            }
            
            const reqQ = query(collection(db, "requests"), where("itemId", "==", d.id));
            const reqCount = await getCountFromServer(reqQ);
            
            return { 
              id: d.id, 
              ...data, 
              requestsCount: reqCount.data().count 
            };
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
   * 🔄 Update Item Status (FREE ITEMS)
   * -------------------------------------------------------- */
  const handleStatusChange = async (item, newStatus) => {
    setBusy((p) => ({ ...p, [item.id]: "status" }));
    try {
      await updateDoc(doc(db, "donations", item.id), { 
        status: newStatus,
        updatedAt: new Date()
      });
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setBusy((p) => ({ ...p, [item.id]: null }));
    }
  };

  /* --------------------------------------------------------
   * 🚀 Update PREMIUM STATUS (PREMIUM ITEMS)
   * -------------------------------------------------------- */
  const handlePremiumStatusChange = async (item, newStatus) => {
    setBusy((p) => ({ ...p, [item.id]: "premiumStatus" }));
    try {
      await updateDoc(doc(db, "donations", item.id), {
        premiumStatus: newStatus,
        updatedAt: new Date(),
      });
      toast.success(`Premium status updated to "${newStatus}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update premium status");
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
      await updateDoc(doc(db, "donations", item.id), { 
        verified: flag,
        updatedAt: new Date()
      });
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
   * 🔍 Filter Logic with ENSURED DESCENDING ORDER
   * -------------------------------------------------------- */
  const filtered = useMemo(() => {
    let arr = items;
    
    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.ownerEmail?.toLowerCase().includes(q) ||
          i.id?.toLowerCase().includes(q)
      );
    }
    
    // Apply status filters
    if (filter === "verified") arr = arr.filter((i) => i.verified);
    if (filter === "unverified") arr = arr.filter((i) => !i.verified);
    if (filter === "premium") arr = arr.filter((i) => i.type === "premium");
    if (filter === "free") arr = arr.filter((i) => i.type !== "premium");
    
    // ✅ ENSURE descending order by createdAt (most recent first)
    return arr.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime; // Descending order
    });
  }, [items, search, filter]);

  /* --------------------------------------------------------
   * 📊 Statistics
   * -------------------------------------------------------- */
  const stats = useMemo(() => {
    const total = items.length;
    const verified = items.filter(item => item.verified).length;
    const premium = items.filter(item => item.type === "premium").length;
    const active = items.filter(item => item.status === "active").length;
    
    return { total, verified, premium, active };
  }, [items]);

  /* --------------------------------------------------------
   * 🕒 Date Formatting Helpers
   * -------------------------------------------------------- */
  const formatDate = (v) => {
    if (!v) return "—";
    const d = v?.toDate?.() || new Date(v);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (v) => {
    if (!v) return "—";
    const d = v?.toDate?.() || new Date(v);
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

        {/* Statistics */}
        <section className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700 font-medium">Verified</p>
              <p className="text-2xl font-bold text-green-800">{stats.verified}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-purple-700 font-medium">Premium</p>
              <p className="text-2xl font-bold text-purple-800">{stats.premium}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <p className="text-sm text-orange-700 font-medium">Active</p>
              <p className="text-2xl font-bold text-orange-800">{stats.active}</p>
            </div>
          </div>
        </section>

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

            {loading && (
              <div className="text-center text-gray-500 py-6">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <p>Loading items...</p>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                <p>No items found</p>
              </div>
            )}

            {!loading &&
              filtered.map((item) => {
                const normalizedItem = normalizeItemData(item);
                
                return (
                  <div
                    key={normalizedItem.id}
                    className="border rounded-lg p-5 mb-6 bg-white shadow-sm hover:shadow-md transition relative"
                  >
                    {/* Item top tags */}
                    <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                      {normalizedItem.verified && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                          ✅ Verified
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          normalizedItem.type === "premium"
                            ? "bg-purple-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {normalizedItem.type === "premium" ? "Premium" : "Free"}
                      </span>
                    </div>

                    <div className="flex gap-5">
                      <img
                        src={normalizedItem.images?.[0] || "/default-item.jpg"}
                        alt="Item"
                        className="w-28 h-28 object-cover rounded border"
                      />
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold mb-1">{normalizedItem.title}</h2>
                        <p className="text-sm text-gray-600 mb-2">
                          {normalizedItem.description || "No description provided."}
                        </p>
                        
                        {/* Time Information */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>Created: {formatDate(normalizedItem.createdAt)}</span>
                            <span className="text-gray-400 ml-1">({formatTimeAgo(normalizedItem.createdAt)})</span>
                          </div>
                          {normalizedItem.updatedAt && (
                            <div className="flex items-center gap-1">
                              <span>Updated: {formatDate(normalizedItem.updatedAt)}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          {normalizedItem.ownerEmail && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} /> {normalizedItem.ownerEmail}
                            </div>
                          )}
                          {normalizedItem.ownerId && (
                            <div className="flex items-center gap-1">
                              <User size={14} /> ID: {normalizedItem.ownerId}
                            </div>
                          )}
                          {normalizedItem.delivery && (
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />{" "}
                              {normalizedItem.delivery === "pickup"
                                ? `Pickup at: ${normalizedItem.pickupLocation || "N/A"}`
                                : "Delivery"}
                            </div>
                          )}
                        </div>

                        {/* STATUS MANAGEMENT SECTION */}
                        <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-2">
                          <span>Requests: {normalizedItem.requestsCount || 0}</span>
                          
                          {/* FREE ITEM STATUS */}
                          {normalizedItem.type !== "premium" && (
                            <>
                              <span
                                className={`px-2 py-0.5 rounded ${statusColors[normalizedItem.status] || "bg-gray-200 text-gray-800"}`}
                              >
                                {normalizedItem.status || "active"}
                              </span>
                              <select
                                className="border px-2 py-1 rounded text-xs"
                                value={normalizedItem.status || "active"}
                                onChange={(e) => handleStatusChange(normalizedItem, e.target.value)}
                                disabled={busy[normalizedItem.id] === "status"}
                              >
                                <option value="active">Active</option>
                                <option value="awarded">Awarded</option>
                                <option value="expired">Expired</option>
                                <option value="requestClosed">Request Closed</option>
                              </select>
                            </>
                          )}
                          
                          {/* PREMIUM ITEM STATUS */}
                          {normalizedItem.type === "premium" && (
                            <>
                              <span
                                className={`px-2 py-0.5 rounded ${premiumStatusColors[normalizedItem.premiumStatus] || "bg-gray-200 text-gray-800"}`}
                              >
                                Premium: {normalizedItem.premiumStatus || "available"}
                              </span>
                              <select
                                className="border px-2 py-1 rounded text-xs"
                                value={normalizedItem.premiumStatus || "available"}
                                onChange={(e) => handlePremiumStatusChange(normalizedItem, e.target.value)}
                                disabled={busy[normalizedItem.id] === "premiumStatus"}
                              >
                                <option value="available">Available</option>
                                <option value="depositPaid">Deposit Paid</option>
                                <option value="preparingDelivery">Preparing Delivery</option>
                                <option value="inTransit">In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="sold">Sold</option>
                              </select>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 justify-end">
                      {/* Only show Reopen for free items */}
                      {normalizedItem.type !== "premium" && (
                        <AdminButton
                          icon={RefreshCcw}
                          label="Reopen"
                          onClick={() => handleRelist(normalizedItem)}
                          busy={busy[normalizedItem.id] === "relist"}
                          color="blue"
                        />
                      )}
                      <AdminButton
                        icon={normalizedItem.verified ? XCircle : CheckCircle}
                        label={normalizedItem.verified ? "Unverify" : "Verify"}
                        onClick={() => handleVerify(normalizedItem, !normalizedItem.verified)}
                        busy={busy[normalizedItem.id] === "verify"}
                        color={normalizedItem.verified ? "yellow" : "green"}
                      />
                      <AdminButton
                        icon={Trash2}
                        label="Delete"
                        onClick={() => handleDelete(normalizedItem)}
                        busy={busy[normalizedItem.id] === "delete"}
                        color="red"
                      />
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