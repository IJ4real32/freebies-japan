// ✅ FILE: src/pages/AdminPaymentsQueue.js (PHASE-2 — FINAL)
// Fully patched: Phase-2 approval buttons, unified amount resolver, correct sorting, stable listener.
// NO REGRESSIONS - Maintains all existing functionality while adding Phase-2 features

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
  CheckCircle,
  Truck,
} from "lucide-react";

import { checkAdminStatus } from "../utils/adminUtils";
import toast from "react-hot-toast";

import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { adminApprovePaymentAndCreateDelivery } from "../services/functionsApi";


// =============================================================
// PAYMENT STATUS FILTERS (PHASE 2)
// =============================================================
const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending Review" },
  { key: "reported", label: "Reported (Deposit)" },
  { key: "pending_cod_confirmation", label: "COD Pending Confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected", label: "Rejected" },
  { key: "delivered", label: "Delivered (COD)" },
];


// =============================================================
// Helpers
// =============================================================
const formatAmount = (amount, currency = "JPY") => {
  try {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount ?? 0);
  } catch {
    return `${amount ?? 0} ${currency}`;
  }
};

// Unified amount resolver (Phase-2 standard)
const getEffectiveAmount = (p) => {
  return p.amount && p.amount > 0
    ? p.amount
    : p.itemPriceJPY || p.amountJPY || 0;
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
      return "bg-gray-200 text-gray-800";
  }
};

// Phase-2: Check if payment is eligible for admin approval
const isEligibleForApproval = (payment) => {
  if (!payment) return false;
  
  return (
    (payment.method === 'deposit' && payment.status === 'reported') ||
    (payment.method === 'cash_on_delivery' && payment.status === 'pending_cod_confirmation') ||
    (payment.method === 'cod' && payment.status === 'pending_cod_confirmation')
  );
};

// Phase-2: Get approval button label
const getApprovalButtonLabel = (payment) => {
  if (!payment) return "Approve";
  
  if (payment.method === 'cash_on_delivery' || payment.method === 'cod') {
    return "Approve COD";
  }
  return "Approve Deposit";
};

// Phase-2: Get approval button color
const getApprovalButtonColor = (payment) => {
  if (!payment) return "green";
  
  if (payment.method === 'cash_on_delivery' || payment.method === 'cod') {
    return "purple";
  }
  return "green";
};


// =============================================================
// Component
// =============================================================
export default function AdminPaymentsQueue() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusKey, setStatusKey] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "createdAt", direction: "desc" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const navigate = useNavigate();
  const aliveRef = useRef(true);

  // Track component mounted state safely
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);


  // =============================================================
  // LIVE FIRESTORE LISTENER (SAFE)
  // =============================================================
  useEffect(() => {
    let unsubscribe = () => {};

    const init = async () => {
      const ok = await checkAdminStatus();
      if (!ok) return navigate("/unauthorized");

      const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));

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
          toast.error("Failed to load payments");
          setLoading(false);
        }
      );
    };

    init();

    return () => {
      unsubscribe && unsubscribe();
    };
  }, [navigate]);


  // =============================================================
  // PHASE-2 APPROVAL HANDLER
  // =============================================================
  const handleApprovePayment = async (payment) => {
    if (!payment) return;
    
    const { id, method, status } = payment;
    
    // Double-check eligibility
    if (!isEligibleForApproval(payment)) {
      toast.error(`Cannot approve: ${method} in status ${status}`);
      return;
    }
    
    const confirmMsg = method === 'cash_on_delivery' || method === 'cod'
      ? "Approve this COD payment and start delivery?\n\nPhase-2: This will create a delivery record automatically."
      : "Approve this deposit payment and start delivery?\n\nPhase-2: This will create a delivery record automatically.";
    
    if (!window.confirm(confirmMsg)) return;
    
    setApprovingId(id);
    
    try {
      console.log("🎯 Phase-2: Approving payment", { id, method, status });
      const result = await adminApprovePaymentAndCreateDelivery({ paymentId: id });
      
      toast.success(
        <div>
          <div className="font-medium">✅ Payment approved!</div>
          <div className="text-sm">Delivery: {result.data.delivery.id}</div>
        </div>,
        { duration: 4000 }
      );
    } catch (error) {
      console.error("Phase-2 approval failed:", error);
      toast.error(`❌ Approval failed: ${error.message}`);
    } finally {
      setApprovingId(null);
    }
  };


  // =============================================================
  // FILTERS + SEARCH + SORTING
  // =============================================================
  const filteredPayments = useMemo(() => {
    let list = payments;

    if (statusKey !== "all") {
      list = list.filter((p) => p.status === statusKey);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.userName || "").toLowerCase().includes(s) ||
          (p.userEmail || "").toLowerCase().includes(s) ||
          (p.id || "").toLowerCase().includes(s) ||
          (p.itemTitle || "").toLowerCase().includes(s)
      );
    }

    if (sort.field) {
      const dir = sort.direction === "asc" ? 1 : -1;

      list = [...list].sort((a, b) => {
        if (sort.field === "amount") {
          const A = getEffectiveAmount(a);
          const B = getEffectiveAmount(b);
          return (A - B) * dir;
        }

        if (sort.field === "createdAt") {
          const A = a.createdAt?.seconds || 0;
          const B = b.createdAt?.seconds || 0;
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
    if (sort.field !== field)
      return <ArrowUpDown size={14} className="inline text-gray-400" />;

    return sort.direction === "asc" ? (
      <ArrowUp size={14} className="inline text-blue-600" />
    ) : (
      <ArrowDown size={14} className="inline text-blue-600" />
    );
  };


  // =============================================================
  // UI
  // =============================================================
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0"} bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">🏠 Dashboard</Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded hover:bg-white/10">📋 Requests</Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">🎁 Items</Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded bg-white/20">💰 Payments</Link>
          <Link to="/admin/money-donations" className="block px-3 py-2 rounded hover:bg-white/10">❤️ Money Donations</Link>
          <Link to="/admin/pickups" className="block px-3 py-2 rounded hover:bg-white/10">🚚 Pickups</Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">👥 Users</Link>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1">

        {/* HEADER */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600">
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
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 mb-2">
                  <HeartHandshake size={22} /> Payment Queue
                </h1>
                <p className="text-sm text-gray-600">
                  Manage deposit and COD payments. Approve payments to start delivery process.
                </p>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by user / email / ID / item…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border rounded-full text-sm w-72 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* PHASE-2 INFO BANNER */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Truck size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-800 text-sm mb-1">🎯 Phase-2 Delivery Flow</h3>
                  <div className="text-sm text-blue-700 grid grid-cols-1 md:grid-cols-2 gap-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-600" />
                      <span>Deposit in <code className="px-1 bg-blue-100 rounded">"reported"</code> → Click "Approve Deposit"</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-purple-600" />
                      <span>COD in <code className="px-1 bg-purple-100 rounded">"pending_cod_confirmation"</code> → Click "Approve COD"</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Truck size={14} className="text-green-600" />
                      <span>System automatically creates delivery record</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>No manual "Mark Delivered" for COD in Phase-2</span>
                    </div>
                  </div>
                </div>
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

                        <th className="px-4 py-3 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPayments.map((p) => {
                        const isEligible = isEligibleForApproval(p);
                        const buttonColor = getApprovalButtonColor(p);
                        const buttonLabel = getApprovalButtonLabel(p);
                        
                        return (
                          <tr key={p.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs">{p.id}</td>

                            <td className="px-4 py-3">
                              <div className="font-medium">{p.userName || "Unknown"}</div>
                              <div className="text-xs text-gray-500">{p.userEmail}</div>
                            </td>

                            <td className="px-4 py-3">
                              {p.itemTitle || (
                                <span className="text-gray-400 italic">No item title</span>
                              )}
                            </td>

                            <td className="px-4 py-3 font-medium">
                              {formatAmount(getEffectiveAmount(p))}
                            </td>

                            <td className="px-4 py-3">
                              {p.deliveryId ? (
                                <div className="flex items-center gap-1">
                                  <Truck size={12} className="text-green-600" />
                                  <span className="text-xs text-green-700">
                                    {p.deliveryId?.slice(0, 8)}...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} className="text-gray-400" />
                                  <span className="text-xs text-gray-500">Pending</span>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${badge(p.status)}`}>
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
                              <div className="flex flex-col gap-2 min-w-[140px]">
                                {/* VIEW DETAILS */}
                                <button
                                  onClick={() =>
                                    navigate(
                                      p._type === "moneyDonation"
                                        ? `/admin/money-donations/${p.id}`
                                        : `/admin/payments/${p.id}`
                                    )
                                  }
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                >
                                  View Details
                                </button>
                                
                                {/* PHASE-2 APPROVE BUTTON */}
                                {isEligible && !p.deliveryId && (
                                  <button
                                    onClick={() => handleApprovePayment(p)}
                                    disabled={approvingId === p.id}
                                    className={`px-3 py-1.5 rounded text-xs text-white transition-colors ${
                                      approvingId === p.id
                                        ? 'opacity-70 cursor-not-allowed'
                                        : 'hover:opacity-90'
                                    } ${
                                      buttonColor === 'purple'
                                        ? 'bg-purple-600 hover:bg-purple-700'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                  >
                                    {approvingId === p.id ? (
                                      <span className="flex items-center justify-center gap-1">
                                        <Loader2 size={12} className="animate-spin" />
                                        Processing...
                                      </span>
                                    ) : (
                                      <span className="flex items-center justify-center gap-1">
                                        <CheckCircle size={12} />
                                        {buttonLabel}
                                      </span>
                                    )}
                                  </button>
                                )}
                                
                                {/* DELIVERY STATUS INDICATOR */}
                                {p.deliveryId && (
                                  <div className="text-center">
                                    <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                      ✅ Delivery Created
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1 truncate">
                                      ID: {p.deliveryId?.slice(0, 10)}...
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>
              )}
              
              {/* SUMMARY FOOTER */}
              {!loading && filteredPayments.length > 0 && (
                <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600 flex justify-between items-center">
                  <div>
                    Showing <span className="font-medium">{filteredPayments.length}</span> payment{filteredPayments.length !== 1 ? 's' : ''}
                    {statusKey !== 'all' && ` (filtered by ${STATUS_FILTERS.find(f => f.key === statusKey)?.label})`}
                  </div>
                  <div className="text-xs text-gray-500">
                    💡 Click "View Details" for complete payment information
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}