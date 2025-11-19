// ✅ FILE: src/pages/RequestsAdmin.js (FULLY PATCHED VERSION)
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  adminUpdateRequestStatus,
  sendAdminItemStatusEmail,
} from "../services/functionsApi";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Menu,
  X,
  Home,
  ChevronRight,
  Filter,
  Loader2,
  Clock,
  Calendar,
} from "lucide-react";

/* --------------------------------------------------------
 * 🧩 Helper Functions
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

const statusColors = {
  pending: "bg-gray-100 text-gray-700",
  approved: "bg-blue-100 text-blue-800",
  awarded: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  lost: "bg-red-100 text-red-800",
};

const colorMap = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  red: "bg-red-600 hover:bg-red-700 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white",
  gray: "bg-gray-500 hover:bg-gray-600 text-white",
};

/* --------------------------------------------------------
 * 🧱 Reusable Button Component
 * -------------------------------------------------------- */
const AdminButton = ({ label, onClick, busy, color }) => (
  <button
    onClick={onClick}
    disabled={busy}
    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md shadow ${colorMap[color]} ${
      busy ? "opacity-70 cursor-wait" : ""
    }`}
  >
    {busy && <Loader2 size={12} className="animate-spin" />}
    {label}
  </button>
);

const Stat = ({ label, value, color }) => (
  <div className="text-center">
    <p className={`text-sm font-semibold text-${color}-700`}>{label}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);

/* --------------------------------------------------------
 * 🧭 MAIN COMPONENT
 * -------------------------------------------------------- */
export default function RequestsAdmin() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [actionBusy, setActionBusy] = useState({
    approve: null,
    deliver: null,
    view: null,
  });

  /* --------------------------------------------------------
   * 🔐 Guard: Only admins can access - FIXED
   * -------------------------------------------------------- */
  useEffect(() => {
    console.log("🔐 RequestsAdmin - Auth check:", { isAuthenticated, isAdmin });
    
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // ✅ FIXED: Use isAdmin property directly instead of checkAdminStatus function
    if (!isAdmin) {
      console.warn("⚠️ User is not admin, redirecting to unauthorized");
      navigate("/unauthorized");
      return;
    }
    
    console.log("✅ Admin access granted to RequestsAdmin");
  }, [isAuthenticated, isAdmin, navigate]);

  /* --------------------------------------------------------
   * 📡 Load all requests in real-time WITH DESCENDING ORDER
   * -------------------------------------------------------- */
  useEffect(() => {
    // Only load requests if user is authenticated and admin
    if (!isAuthenticated || !isAdmin) return;

    // ✅ FIXED: Query with descending order by createdAt
    const q = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc") // Most recent first
    );
    
    const unsub = onSnapshot(q, async (snap) => {
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const enriched = await Promise.all(
        base.map(async (r) => {
          if (!r.userName && r.userId) {
            try {
              const u = await getDoc(doc(db, "users", r.userId));
              if (u.exists()) {
                const udata = u.data();
                return {
                  ...r,
                  userName:
                    udata.username ||
                    udata.name ||
                    udata.email?.split("@")[0] ||
                    "Anonymous",
                  userEmail: udata.email || r.userEmail,
                };
              }
            } catch {}
          }
          return r;
        })
      );
      setRequests(enriched);
      setLoading(false);
    }, (err) => {
      console.error("Error loading requests:", err);
      setError("Failed to load requests");
      setLoading(false);
    });

    return () => unsub();
  }, [isAuthenticated, isAdmin]);

  /* --------------------------------------------------------
   * ✅ Manual Approve - FIXED: Changed "approved" to "awarded"
   * -------------------------------------------------------- */
  const handleManualApprove = async (req) => {
    if (
      !window.confirm(
        `Approve ${req.userName || "this user"} manually for "${req.itemTitle}"?`
      )
    )
      return;
    setActionBusy((s) => ({ ...s, approve: req.id }));
    try {
      // 🎯 CRITICAL FIX: Changed "approved" to "awarded" to trigger delivery flow
      await adminUpdateRequestStatus({ requestId: req.id, status: "awarded" });
      await sendAdminItemStatusEmail({
        requestId: req.id,
        userEmail: req.userEmail,
        status: "awarded", // Also update email status
        itemTitle: req.itemTitle,
      });
      toast.success(`✅ ${req.userName} manually approved.`);
    } catch (err) {
      console.error("Manual approve error:", err);
      toast.error("Failed to approve manually.");
    } finally {
      setActionBusy((s) => ({ ...s, approve: null }));
    }
  };

  /* --------------------------------------------------------
   * 🚚 Mark Delivered
   * -------------------------------------------------------- */
  const handleDelivered = async (req) => {
    setActionBusy((s) => ({ ...s, deliver: req.id }));
    try {
      await adminUpdateRequestStatus({ requestId: req.id, status: "delivered" });
      await sendAdminItemStatusEmail({
        requestId: req.id,
        userEmail: req.userEmail,
        status: "delivered",
        itemTitle: req.itemTitle,
      });
      toast.success(`📦 "${req.itemTitle}" marked delivered.`);
    } catch (e) {
      console.error("Mark delivered error:", e);
      toast.error("Failed to mark delivered.");
    } finally {
      setActionBusy((s) => ({ ...s, deliver: null }));
    }
  };

  /* --------------------------------------------------------
   * 👤 View User Details (extended stats)
   * -------------------------------------------------------- */
  const handleViewUser = async (uid) => {
    setActionBusy((s) => ({ ...s, view: uid }));
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const user = snap.exists() ? snap.data() : {};
      const reqsSnap = await getDocs(
        query(collection(db, "requests"), where("userId", "==", uid))
      );
      const all = reqsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ✅ Normalize statuses and compute totals
      const normalize = (s = "") => s.toLowerCase().trim();
      const total = all.length;
      const won = all.filter((r) =>
        ["approved", "awarded"].includes(normalize(r.status))
      ).length;
      const lost = all.filter((r) =>
        ["rejected", "lost"].includes(normalize(r.status))
      ).length;
      const delivered = all.filter((r) =>
        ["delivered", "completed"].includes(normalize(r.status))
      ).length;

      setUserDetails({
        name: user.username || user.name || "Unnamed",
        email: user.email,
        total,
        approved: won,
        rejected: lost,
        delivered,
        address: user.addressInfo || user.deliveryInfo || {},
        requests: all,
      });
    } catch (err) {
      console.error("View user error:", err);
      toast.error("Failed to load user info.");
    } finally {
      setActionBusy((s) => ({ ...s, view: null }));
    }
  };

  /* --------------------------------------------------------
   * 🔍 Filter Requests by Status
   * -------------------------------------------------------- */
  const filtered = useMemo(() => {
    let result = requests;
    
    // Apply status filter
    if (filter !== "all") {
      result = result.filter((r) => (r.status || "pending") === filter);
    }
    
    // ✅ ENSURE descending order by createdAt (most recent first)
    return result.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime; // Descending order
    });
  }, [requests, filter]);

  /* --------------------------------------------------------
   * 📊 Statistics - UPDATED: Changed "approved" to "awarded"
   * -------------------------------------------------------- */
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => (r.status || "pending") === "pending").length;
    const awarded = requests.filter(r => ["approved", "awarded"].includes(r.status || "")).length;
    const delivered = requests.filter(r => ["delivered", "completed"].includes(r.status || "")).length;
    
    return { total, pending, awarded, delivered };
  }, [requests]);

  /* --------------------------------------------------------
   * ⏳ Loading State for Non-Admins
   * -------------------------------------------------------- */
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------
   * 🖥️ Render Layout
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
          <h2 className="text-lg font-bold tracking-wide">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-white hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">
            🏠 Dashboard
          </Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded bg-white/20">
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
          <Link to="/admin/pickups" className="block px-3 py-2 rounded hover:bg-white/10">
            🚚 Pickups
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">
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
              <Link to="/admin" className="flex items-center gap-1 hover:text-indigo-600">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} className="mx-1" /> Requests
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="awarded">Awarded</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </header>

        {/* Statistics */}
        <section className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              {/* ✅ UPDATED: Changed "Approved" to "Awarded" */}
              <p className="text-sm text-green-700 font-medium">Awarded</p>
              <p className="text-2xl font-bold text-green-800">{stats.awarded}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-purple-700 font-medium">Delivered</p>
              <p className="text-2xl font-bold text-purple-800">{stats.delivered}</p>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="p-8">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center text-gray-500 py-6">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <p>Loading requests...</p>
              </div>
            ) : error ? (
              <p className="text-red-600 p-4">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">User</th>
                      <th className="px-4 py-3 text-left font-semibold">Item</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          Requested
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">
                            {r.userName || "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {r.userEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {r.itemTitle || r.itemId}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              statusColors[r.status] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.status || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(r.createdAt)}</span>
                            <span className="text-gray-400">{formatTimeAgo(r.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          <div className="flex flex-col">
                            <span>{formatDate(r.lastStatusUpdate)}</span>
                            <span className="text-gray-400">{formatTimeAgo(r.lastStatusUpdate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {r.status === "pending" && (
                              <AdminButton
                                label="Manual Approve"
                                onClick={() => handleManualApprove(r)}
                                busy={actionBusy.approve === r.id}
                                color="blue"
                              />
                            )}
                            {/* ✅ UPDATED: Include both "approved" and "awarded" statuses */}
                            {["approved", "awarded"].includes(r.status) && (
                              <AdminButton
                                label="Delivered"
                                onClick={() => handleDelivered(r)}
                                busy={actionBusy.deliver === r.id}
                                color="green"
                              />
                            )}
                            <AdminButton
                              label="View Details"
                              onClick={() => handleViewUser(r.userId)}
                              busy={actionBusy.view === r.userId}
                              color="purple"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>No requests found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* User Details Modal */}
      {userDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setUserDetails(null)}
              className="absolute top-3 right-4 text-gray-600 hover:text-gray-900 font-bold text-lg"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-3">User Details</h2>
            <p className="text-sm text-gray-700 mb-1">{userDetails.name}</p>
            <p className="text-xs text-gray-500 mb-4">{userDetails.email}</p>

            {/* ✅ Extended Stats Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">📋 Total</p>
                <p className="font-bold text-gray-800">{userDetails.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-700">🏆 Won</p>
                <p className="font-bold text-green-800">{userDetails.approved}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-700">❌ Lost</p>
                <p className="font-bold text-red-800">{userDetails.rejected}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-700">📦 Delivered</p>
                <p className="font-bold text-blue-800">{userDetails.delivered}</p>
              </div>
            </div>

            {userDetails.address && (
              <div className="bg-gray-50 p-3 rounded-lg mb-3 text-sm text-gray-700">
                <p>{userDetails.address.address || "No address on file"}</p>
                {userDetails.address.phone && <p>📞 {userDetails.address.phone}</p>}
              </div>
            )}

            <h3 className="font-semibold text-gray-700 mb-2">Recent Requests</h3>
            <ul className="divide-y max-h-48 overflow-y-auto border rounded-md">
              {userDetails.requests.map((r) => (
                <li key={r.id} className="p-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">
                      {r.itemTitle || r.itemId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        statusColors[r.status] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDate(r.createdAt)} • {formatTimeAgo(r.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}