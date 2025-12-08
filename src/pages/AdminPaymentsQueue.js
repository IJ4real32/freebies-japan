// ✅ FILE: src/pages/AdminPaymentsQueue.js (PHASE-2 — FIXED & SAFE)
// Eliminated async cleanup bug, stable Firestore listener.

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  Search,
  RefreshCcw,
  HeartHandshake,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Menu,
  X,
  Home,
  ChevronRight,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";

import { checkAdminStatus } from "../utils/adminUtils";
import toast from "react-hot-toast";

import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";


// --------------------------------------------------------------
// PHASE-2 STATUS FILTERS (matches new payments collection)
// --------------------------------------------------------------
const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending Review" },
  { key: "reported", label: "Reported (Deposit)" },
  { key: "pending_cod_confirmation", label: "COD Pending Confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected", label: "Rejected" },
  { key: "delivered", label: "Delivered (COD)" },
];


export default function AdminPaymentsQueue() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusKey, setStatusKey] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "createdAt", direction: "desc" });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = useNavigate();
  const aliveRef = useRef(true);

  // --------------------------------------------------------------
  // Mark alive/unmounted — prevents updates after unmount
  // --------------------------------------------------------------
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);


  // --------------------------------------------------------------
  // 🚀 REAL-TIME FIRESTORE LISTENER — SAFE VERSION
  // --------------------------------------------------------------
  useEffect(() => {
    let unsubscribe = () => {};

    const start = async () => {
      const ok = await checkAdminStatus();
      if (!ok) return navigate("/unauthorized");

      const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));

      // REAL Firestore unsubscribe function
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!aliveRef.current) return;

          const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            _type: d.data().type === "donation" ? "moneyDonation" : "payment",
          }));

          setPayments(list);
          setLoading(false);
        },
        (err) => {
          console.error("Payments listener error:", err);
          toast.error("Failed to load payments.");
          setLoading(false);
        }
      );
    };

    start(); // NO return here — async allowed, cleanup below synchronously.

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);


  // --------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------
  const formatAmount = (amount, currency = "JPY") => {
    try {
      return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${currency}`;
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    const d = v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
  };

  const formatTimeAgo = (v) => {
    if (!v) return "—";
    const d = v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const badge = (status) => {
    switch (status) {
      case "pending":
      case "pending_cod_confirmation":
        return "bg-yellow-100 text-yellow-800";
      case "reported":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };


  // --------------------------------------------------------------
  // Filters + Search + Sorting
  // --------------------------------------------------------------
  const filteredPayments = useMemo(() => {
    let list = payments;

    if (statusKey !== "all") list = list.filter((p) => p.status === statusKey);

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.userName || "").toLowerCase().includes(s) ||
          (p.userEmail || "").toLowerCase().includes(s) ||
          (p.id || "").toLowerCase().includes(s)
      );
    }

    if (sort.field) {
      list = [...list].sort((a, b) => {
        const dir = sort.direction === "asc" ? 1 : -1;

        if (sort.field === "amount") {
          const A = a.amount ?? a.amountJPY ?? 0;
          const B = b.amount ?? b.amountJPY ?? 0;
          return (A - B) * dir;
        }

        if (sort.field === "createdAt") {
          const A = new Date(a.createdAt?.seconds * 1000 || 0);
          const B = new Date(b.createdAt?.seconds * 1000 || 0);
          return (A - B) * dir;
        }

        return 0;
      });
    }

    return list;
  }, [payments, search, sort, statusKey]);


  const toggleSort = (field) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  };

  const sortIcon = (field) => {
    if (sort.field !== field) return <ArrowUpDown size={14} className="inline text-gray-400" />;
    return sort.direction === "asc" ? (
      <ArrowUp size={14} className="inline text-blue-600" />
    ) : (
      <ArrowDown size={14} className="inline text-blue-600" />
    );
  };


  // --------------------------------------------------------------
  // UI
  // --------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">

      {/* SIDEBAR */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"} bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)}>
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
          <Link to="/admin/payments" className="block px-3 py-2 rounded bg-white/20">
            💰 Payments
          </Link>
          <Link to="/admin/money-donations" className="block px-3 py-2 rounded hover:bg-white/10">
            ❤️ Money Donations
          </Link>
          <Link to="/admin/pickups" className="block px-3 py-2 rounded hover:bg-white/10">
            🚚 Pickups
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">
            👥 Users
          </Link>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1">

        {/* HEADER */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center text-sm text-gray-600">
              <Link to="/admin" className="flex items-center gap-1 hover:text-indigo-600">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} className="mx-1" />
              <span className="text-gray-800 font-medium">Payment Queue</span>
            </div>
          </div>

          <button
            onClick={() => toast("Firestore is live-updating automatically")}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded flex items-center gap-1"
          >
            <RefreshCcw size={12} /> Status
          </button>
        </header>


        {/* BODY */}
        <section className="p-8">
          <div className="bg-white border rounded-lg shadow-sm p-6">

            {/* TITLE + SEARCH */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <HeartHandshake size={22} /> Payment Queue
              </h1>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by user / email / ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border rounded-full text-sm w-72 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>


            {/* FILTER BUTTONS */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusKey(f.key)}
                  className={`px-4 py-2 rounded text-sm ${
                    statusKey === f.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>


            {/* TABLE */}
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-6 text-center">
                  <Loader2 size={28} className="animate-spin mx-auto" />
                  <p className="mt-2 text-gray-500">Loading payments…</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                  No payments found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Item</th>

                        <th
                          className="px-4 py-3 font-semibold cursor-pointer select-none"
                          onClick={() => toggleSort("amount")}
                        >
                          Amount {sortIcon("amount")}
                        </th>

                        <th className="px-4 py-3 font-semibold">Delivery</th>

                        <th className="px-4 py-3 font-semibold">Status</th>

                        <th
                          className="px-4 py-3 font-semibold cursor-pointer select-none"
                          onClick={() => toggleSort("createdAt")}
                        >
                          <div className="flex items-center gap-1">
                            <Clock size={14} /> Created {sortIcon("createdAt")}
                          </div>
                        </th>

                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{p.id}</td>

                          <td className="px-4 py-3">
                            <div className="font-medium">{p.userName || "Unknown"}</div>
                            <div className="text-xs text-gray-500">{p.userEmail}</div>
                          </td>

                          <td className="px-4 py-3">
                            {p.itemTitle || <span className="text-gray-400 italic">No item title</span>}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {formatAmount(p.amount ?? p.amountJPY)}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-600">
                            {p.deliveryInfo?.address ||
                              p.deliveryInfo?.roomNumber ||
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${badge(p.status)}`}
                            >
                              {p.status}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-col text-gray-600">
                              <span className="text-sm">{formatDate(p.createdAt)}</span>
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(p.createdAt)}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                navigate(
                                  p._type === "moneyDonation"
                                    ? `/admin/money-donations/${p.id}`
                                    : `/admin/payments/${p.id}`
                                )
                              }
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
