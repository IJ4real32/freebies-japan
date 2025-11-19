// ✅ FILE: src/pages/AdminMoneyDonations.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { checkAdminStatus } from "../utils/adminUtils";


import {
  adminVerifyMoneyDonation,
  adminGetMoneyDonationsQueue,
  ping,
} from "../services/functionsApi";
import toast from "react-hot-toast";
import { 
  Menu, X, Home, ChevronRight, ArrowLeft, 
  Search, Filter, RefreshCcw, Calendar, Clock,
  Loader2, ArrowUpDown, ArrowDown, ArrowUp
} from "lucide-react";

export default function AdminMoneyDonations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ field: "createdAt", direction: "desc" });

  /* ---------------- Load Donations ---------------- */
  useEffect(() => {
    const loadDonations = async () => {
      try {
        setLoading(true);
        const ok = await checkAdminStatus();
        if (!ok) {
          navigate("/unauthorized");
          return;
        }

        const res = await adminGetMoneyDonationsQueue();
        const donationsList = res?.donations || [];
        
        // ✅ ENSURE descending order by createdAt (most recent first)
        const sortedDonations = donationsList.sort((a, b) => {
          const aTime = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
          const bTime = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
          return bTime - aTime; // Descending order
        });

        setDonations(sortedDonations);

        // If we have an ID in URL, find and set the selected donation
        if (id) {
          const target = sortedDonations.find((d) => d.id === id);
          if (target) {
            setSelectedDonation(target);
          } else {
            setError("Donation not found.");
          }
        }

        setDebug({
          totalCount: sortedDonations.length,
          _ts: Date.now(),
        });
      } catch (err) {
        console.error("Load failed:", err);
        setError(err.message || "Failed to load donation records");
      } finally {
        setLoading(false);
      }
    };
    loadDonations();
  }, [id, navigate]);

  /* ---------------- Helpers ---------------- */
  const formatAmount = (a) => {
    try {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(a ?? 0);
    } catch {
      return `${a ?? 0} JPY`;
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    const d = new Date(v.seconds ? v.seconds * 1000 : v);
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

  const formatTimeAgo = (v) => {
    if (!v) return "—";
    const d = new Date(v.seconds ? v.seconds * 1000 : v);
    
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "reported":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "verified":
        return "Verified";
      case "rejected":
        return "Rejected";
      case "reported":
        return "Reported";
      case "pending":
        return "Pending";
      default:
        return status || "Unknown";
    }
  };

  /* ---------------- Filtering & Sorting ---------------- */
  const filteredDonations = useMemo(() => {
    let result = donations;
    
    // Apply search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (d) =>
          (d.userName || "").toLowerCase().includes(s) ||
          (d.userEmail || "").toLowerCase().includes(s) ||
          (d.id || "").toLowerCase().includes(s) ||
          (d.message || "").toLowerCase().includes(s)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((d) => (d.status || "pending") === statusFilter);
    }
    
    // Apply sorting
    if (sort.field) {
      result = [...result].sort((a, b) => {
        const dir = sort.direction === "asc" ? 1 : -1;
        if (sort.field === "amount") {
          const aAmt = a.amountJPY ?? 0;
          const bAmt = b.amountJPY ?? 0;
          return (aAmt - bAmt) * dir;
        }
        if (sort.field === "createdAt") {
          const aDate = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
          const bDate = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
          return (aDate - bDate) * dir;
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
  }, [donations, search, statusFilter, sort]);

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

  /* ---------------- Statistics ---------------- */
  const stats = useMemo(() => {
    const total = donations.length;
    const pending = donations.filter(d => (d.status || "pending") === "pending").length;
    const reported = donations.filter(d => d.status === "reported").length;
    const verified = donations.filter(d => d.status === "verified").length;
    const rejected = donations.filter(d => d.status === "rejected").length;
    
    return { total, pending, reported, verified, rejected };
  }, [donations]);

  /* ---------------- Status Change ---------------- */
  const handleStatusChange = async (donation, newStatus) => {
    const verify = newStatus === "verified";
    if (
      !window.confirm(
        `Are you sure you want to mark this donation as "${newStatus}"?`
      )
    )
      return;

    try {
      setUpdating(true);
      const result = await adminVerifyMoneyDonation({
        donationId: donation.id,
        verify,
        note: verify ? "Donation verified by admin" : "Rejected by admin",
      });

      // Update local state
      setDonations(prev => prev.map(d => 
        d.id === donation.id 
          ? { ...d, status: verify ? "verified" : "rejected", verifiedAt: new Date() }
          : d
      ));

      // Update selected donation if it's the one being modified
      if (selectedDonation && selectedDonation.id === donation.id) {
        setSelectedDonation(prev => ({
          ...prev,
          status: verify ? "verified" : "rejected",
          verifiedAt: new Date(),
        }));
      }

      toast.success(
        result.ok
          ? `Donation marked as ${newStatus}.`
          : "Update completed."
      );
    } catch (err) {
      console.error("Failed to update donation:", err);
      toast.error("Failed to update donation status.");
    } finally {
      setUpdating(false);
    }
  };

  /* ---------------- Health Check ---------------- */
  const runHealthCheck = async () => {
    try {
      const res = await ping();
      setDebug((d) => ({ ...(d || {}), health: res, _tsPing: Date.now() }));
      toast.success("✅ Backend OK");
    } catch (e) {
      setDebug((d) => ({
        ...(d || {}),
        healthError: {
          code: e?.code || String(e),
          message: e?.message || "Ping failed",
        },
        _tsPing: Date.now(),
      }));
      toast.error("❌ Backend ping failed");
    }
  };

  /* ---------------- Loading/Error ---------------- */
  if (loading && !selectedDonation)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading donations…
      </div>
    );

  if (error && !selectedDonation)
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );

  /* ---------------- Detail View ---------------- */
  if (selectedDonation) {
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
            <Link
              to="/admin/money-donations"
              className="block px-3 py-2 rounded bg-white/20"
            >
              ❤️ Money Donations
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
                <Link to="/admin/money-donations" className="hover:text-indigo-600">
                  Money Donations
                </Link>
                <ChevronRight size={14} className="mx-1" />
                <span className="text-gray-800 font-medium truncate">
                  Details / {selectedDonation.id?.slice(0, 10)}…
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDonation(null)}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <ArrowLeft size={12} /> Back to List
              </button>
              <button
                onClick={runHealthCheck}
                className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
              >
                Ping
              </button>
            </div>
          </header>

          {/* Body */}
          <section className="p-8">
            <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8">
              <h1 className="text-2xl font-bold mb-6">Donation Details</h1>

              {/* Donation Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
                <div>
                  <div className="text-gray-500">Donation ID</div>
                  <div className="font-mono">{selectedDonation.id}</div>
                </div>
                <div>
                  <div className="text-gray-500">User</div>
                  <div className="font-medium">
                    {selectedDonation.userName || "Anonymous"}
                  </div>
                  <div className="text-gray-500">{selectedDonation.userEmail || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500">Amount</div>
                  <div className="font-semibold">
                    {formatAmount(selectedDonation.amountJPY)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedDonation.status)}`}
                  >
                    {getStatusText(selectedDonation.status)}
                  </span>
                </div>
                <div>
                  <div className="text-gray-500">Created</div>
                  <div className="flex flex-col">
                    <span>{formatDate(selectedDonation.createdAt)}</span>
                    <span className="text-xs text-gray-400">{formatTimeAgo(selectedDonation.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <div className="text-gray-500 mb-1">Message</div>
                <div className="italic text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                  {selectedDonation.message || "—"}
                </div>
              </div>

              {/* Proof */}
              {selectedDonation.proofUrl && (
                <div className="mb-6">
                  <div className="text-gray-500 mb-2">Proof of Donation</div>
                  <a
                    href={selectedDonation.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedDonation.proofUrl}
                      alt="Proof"
                      className="rounded border border-gray-300 shadow-sm max-h-80 object-contain"
                    />
                  </a>
                </div>
              )}

              {/* Alert */}
              {selectedDonation.status === "reported" && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 text-sm text-blue-800">
                  ⚠️ User submitted payment proof. Please verify and mark as
                  "Verified" or "Rejected."
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedDonation, "verified")}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Mark as Verified
                </button>
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedDonation, "rejected")}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Donation
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ---------------- List View ---------------- */
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
          <Link
            to="/admin/money-donations"
            className="block px-3 py-2 rounded bg-white/20"
          >
            ❤️ Money Donations
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
              <span className="text-gray-800 font-medium">Money Donations</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              <RefreshCcw size={12} /> Refresh
            </button>
            <button
              onClick={runHealthCheck}
              className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Ping
            </button>
          </div>
        </header>

        {/* Statistics */}
        <section className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-6xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Reported</p>
              <p className="text-2xl font-bold text-blue-800">{stats.reported}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700 font-medium">Verified</p>
              <p className="text-2xl font-bold text-green-800">{stats.verified}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-sm text-red-700 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
              <h1 className="text-2xl font-bold text-gray-800">Money Donations</h1>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by user, email, or ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 border rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-72"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="reported">Reported</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              {loading ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                  <p>Loading donations...</p>
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No donations found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Message</th>
                        <th
                          className="px-4 py-3 font-semibold cursor-pointer select-none"
                          onClick={() => toggleSort("amount")}
                        >
                          Amount {renderSortIcon("amount")}
                        </th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th
                          className="px-4 py-3 font-semibold cursor-pointer select-none"
                          onClick={() => toggleSort("createdAt")}
                        >
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            Created {renderSortIcon("createdAt")}
                          </div>
                        </th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonations.map((donation) => (
                        <tr key={donation.id} className="border-t hover:bg-gray-50 align-top">
                          <td className="px-4 py-3 font-mono text-xs">{donation.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{donation.userName || "Anonymous"}</div>
                            <div className="text-xs text-gray-500">{donation.userEmail}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                            {donation.message || "—"}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatAmount(donation.amountJPY)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(donation.status)}`}
                            >
                              {getStatusText(donation.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex flex-col">
                              <span className="text-sm">{formatDate(donation.createdAt)}</span>
                              <span className="text-xs text-gray-400">{formatTimeAgo(donation.createdAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedDonation(donation)}
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