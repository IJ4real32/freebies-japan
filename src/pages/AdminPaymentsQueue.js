// ✅ FILE: src/pages/AdminPaymentsQueue.js (Unified Admin UI)
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  RefreshCcw,
  HeartHandshake,
  AlertCircle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Menu,
  X,
  Home,
  ChevronRight,
} from "lucide-react";
import { isAdmin } from "../utils/adminUtils";
import { adminGetPaymentQueue, ping } from "../services/functionsApi";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
  { key: "all", label: "All", values: ["pending", "awaiting_approval", "approved", "rejected", "verified"] },
  { key: "pending", label: "Pending Review", values: ["pending"] },
  { key: "awaiting", label: "Awaiting Approval", values: ["awaiting_approval"] },
  { key: "approved", label: "Approved", values: ["approved"] },
  { key: "rejected", label: "Rejected", values: ["rejected"] },
  { key: "verified", label: "Verified Donations", values: ["verified"] },
];

export default function AdminPaymentsQueue() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [statusKey, setStatusKey] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "createdAt", direction: "desc" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const aliveRef = useRef(true);

  /* -------------------------------------------------------
   * Lifecycle & Load
   * ------------------------------------------------------- */
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const ok = await isAdmin();
      if (!ok) {
        navigate("/unauthorized");
        return;
      }

      const statusValue =
        statusKey === "all"
          ? undefined
          : STATUS_FILTERS.find((f) => f.key === statusKey)?.values[0];

      const res = await adminGetPaymentQueue(statusValue, 100);
      if (!aliveRef.current) return;

      const list = res?.payments || res?.data?.payments || [];
      const enriched = list.map((p) => ({
        ...p,
        _type:
          p.type === "subscription" || p.type === "item"
            ? "payment"
            : p.type === "donation" || p.collection === "moneyDonations"
            ? "moneyDonation"
            : "unknown",
      }));

      setPayments(enriched);
      setDebug({
        hasMore: res?.hasMore ?? res?.data?.hasMore,
        totalCount: res?.totalCount ?? res?.data?.totalCount,
        statusSent: statusValue ?? "(all)",
        _ts: Date.now(),
      });
    } catch (err) {
      console.error("Error fetching payment queue:", err);
      setError(err.message || "Failed to load payments");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [statusKey, navigate]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  /* -------------------------------------------------------
   * Formatters
   * ------------------------------------------------------- */
  const formatAmount = (amount, currency = "JPY") => {
    try {
      return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${currency}`;
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    const d =
      typeof v === "object" && typeof v.seconds === "number"
        ? new Date(v.seconds * 1000)
        : new Date(v);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("ja-JP", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "awaiting_approval":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "verified":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending Review";
      case "awaiting_approval":
        return "Awaiting Approval";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "verified":
        return "Verified Donation";
      default:
        return status || "Unknown";
    }
  };

  /* -------------------------------------------------------
   * Search + Sort
   * ------------------------------------------------------- */
  const filteredPayments = useMemo(() => {
    let result = payments;
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.userName || "").toLowerCase().includes(s) ||
          (p.userEmail || "").toLowerCase().includes(s) ||
          (p.id || "").toLowerCase().includes(s)
      );
    }

    if (sort.field) {
      result = [...result].sort((a, b) => {
        const dir = sort.direction === "asc" ? 1 : -1;
        if (sort.field === "amount") {
          const aAmt = a.amount ?? a.amountJPY ?? 0;
          const bAmt = b.amount ?? b.amountJPY ?? 0;
          return (aAmt - bAmt) * dir;
        }
        if (sort.field === "createdAt") {
          const aDate = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
          const bDate = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
          return (aDate - bDate) * dir;
        }
        return 0;
      });
    }

    return result;
  }, [payments, search, sort]);

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

  /* -------------------------------------------------------
   * UI
   * ------------------------------------------------------- */
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
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">
            🎁 Items
          </Link>
          <Link
            to="/admin/payments"
            className="block px-3 py-2 rounded bg-white/20"
          >
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
              <span className="text-gray-800 font-medium">Payment Queue</span>
            </div>
          </div>
          <button
            onClick={() => loadPayments()}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
          >
            <RefreshCcw size={12} /> Refresh
          </button>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <HeartHandshake size={22} />
                Payment Queue
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by user or ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 border rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-72"
                  />
                </div>

                <button
                  onClick={() => ping().then(() => toast.success("✅ Backend OK"))}
                  className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-sm px-3 py-2 rounded"
                >
                  <AlertCircle size={14} />
                  Health
                </button>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusKey(f.key)}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    statusKey === f.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              {loading ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  Loading payments…
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">User / Address</th>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th
                          className="px-4 py-3 font-semibold cursor-pointer select-none"
                          onClick={() => toggleSort("amount")}
                        >
                          Amount {renderSortIcon("amount")}
                        </th>
                        <th className="px-4 py-3 font-semibold">Delivery</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th
                          className="px-4 py-3 font-semibold cursor-pointer select-none"
                          onClick={() => toggleSort("createdAt")}
                        >
                          Created {renderSortIcon("createdAt")}
                        </th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="border-t hover:bg-gray-50 align-top">
                          <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{p.userName || "Unknown"}</div>
                            <div className="text-xs text-gray-500">{p.userEmail}</div>
                          </td>
                          <td className="px-4 py-3">
                            {p.itemThumbnails?.length ? (
                              <div className="flex gap-1">
                                {p.itemThumbnails.map((img, i) => (
                                  <img
                                    key={i}
                                    src={img}
                                    alt="item"
                                    className="w-10 h-10 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No image</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatAmount(p.amount ?? p.amountJPY)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                            {p.deliveryInfo?.memo ||
                              p.deliveryInfo?.transferName ||
                              p.method ||
                              "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(
                                p.status
                              )}`}
                            >
                              {getStatusText(p.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(p.createdAt)}
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
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
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
