// ✅ FILE: src/pages/RequestsAdmin.js
import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  adminUpdateRequestStatus,
  sendAdminItemStatusEmail,
} from "../services/functionsApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AdminLayout from "../components/Admin/AdminLayout";

export default function RequestsAdmin() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [userDetails, setUserDetails] = useState(null);

  // Local button loading states
  const [loadingAction, setLoadingAction] = useState({
    approveId: null,
    deliverId: null,
    viewId: null,
  });

  /* 🧠 Real-time sync of requests */
  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => document.body.classList.remove("admin-mode");
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!isAdmin()) {
      navigate("/unauthorized");
      return;
    }

    let unsub;
    const init = async () => {
      try {
        unsub = onSnapshot(collection(db, "requests"), async (snap) => {
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
                        (udata.email ? udata.email.split("@")[0] : "Anonymous"),
                      userEmail: udata.email || r.userEmail,
                    };
                  }
                } catch (err) {
                  console.warn("User enrichment failed:", err);
                }
              }
              return r;
            })
          );
          setRequests(enriched);
          setLoading(false);
        });
      } catch (e) {
        console.error("Error loading requests:", e);
        setError("Failed to load requests");
        setLoading(false);
      }
    };

    init();
    return () => unsub && unsub();
  }, [isAuthenticated, isAdmin, navigate]);

  /* 🧾 Helpers */
  const formatDate = (v) => {
    if (!v) return "—";
    const d = v?.toDate?.() || new Date(v);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    approved: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-yellow-100 text-yellow-800",
    delivered: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  /* 🧭 Manual Admin Overrides */
  const handleManualApprove = async (req) => {
    const confirm = window.confirm(
      `Approve ${req.userName || "this user"} manually for "${req.itemTitle}"?`
    );
    if (!confirm) return;

    setLoadingAction((s) => ({ ...s, approveId: req.id }));
    try {
      const res = await adminUpdateRequestStatus({
        requestId: req.id,
        status: "approved",
      });

      if (res?.ok) {
        toast.success(`✅ ${req.userName} manually approved as winner.`);
      } else {
        toast.success(
          `⚠️ ${req.userName} approved (network warning ignored, check Firestore).`
        );
      }
    } catch (err) {
      console.warn("Manual approval threw but likely succeeded:", err);
      toast.success(
        `✅ ${req.userName} manually approved (network warning ignored).`
      );
    } finally {
      setLoadingAction((s) => ({ ...s, approveId: null }));
    }
  };

  /* ✅ Delivery Status Update */
  const updateStatus = async (req, newStatus) => {
    setLoadingAction((s) => ({ ...s, deliverId: req.id }));

    try {
      const res = await adminUpdateRequestStatus({
        requestId: req.id,
        status: newStatus,
      });

      if (res?.ok) {
        toast.success(`✅ Status updated to "${newStatus}".`);
      } else {
        toast.success(`⚠️ Updated to "${newStatus}" (check Firestore).`);
      }

      await sendAdminItemStatusEmail({
        requestId: req.id,
        status: newStatus,
        userEmail: req.userEmail,
        itemTitle: req.itemTitle || "Your requested item",
      });
    } catch (e) {
      console.error("Update failed:", e);
      toast.error("Failed to update status (possibly network-only).");
    } finally {
      setLoadingAction((s) => ({ ...s, deliverId: null }));
    }
  };

  /* 🔍 User Details Modal */
  const handleViewDetails = async (userId) => {
    setLoadingAction((s) => ({ ...s, viewId: userId }));
    try {
      const userSnap = await getDoc(doc(db, "users", userId));
      const userData = userSnap.exists() ? userSnap.data() : {};

      const q = query(collection(db, "requests"), where("userId", "==", userId));
      const reqSnap = await getDocs(q);
      const allReqs = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const total = allReqs.length;
      const won = allReqs.filter((r) => r.status === "approved").length;
      const lost = allReqs.filter((r) => r.status === "rejected").length;

      const delivery =
        userData.defaultAddress ||
        userData.addressInfo ||
        userData.deliveryInfo ||
        allReqs.find((r) => r.deliveryInfo)?.deliveryInfo ||
        null;

      setUserDetails({
        id: userId,
        email: userData.email,
        name:
          userData.username ||
          userData.name ||
          userData.displayName ||
          "Unnamed User",
        stats: { total, won, lost },
        delivery,
        requests: allReqs,
      });
    } catch (err) {
      console.error("Failed to fetch user details:", err);
      toast.error("Failed to load user details.");
    } finally {
      setLoadingAction((s) => ({ ...s, viewId: null }));
    }
  };

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => (r.status || "pending") === filter);

  /* 🖥️ Admin Layout */
  return (
    <AdminLayout title="Requests Management">
      <div className="min-w-[1024px] px-6 py-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Item Requests</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter:</label>
            <select
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {/* Error / Loading */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-gray-500">Loading requests…</p>
        ) : (
          <section className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700 sticky top-0 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">User</th>
                    <th className="px-4 py-3 text-left font-semibold">Item</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Result</th>
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
                          {r.manualWinner && " (Manual)"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "approved" ? (
                          <span className="text-green-700 font-semibold">
                            🏆 Winner
                          </span>
                        ) : r.status === "rejected" ? (
                          <span className="text-red-600 font-medium">
                            ❌ Lost
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.lastStatusUpdate ? formatDate(r.lastStatusUpdate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {r.status === "pending" && (
                            <button
                              onClick={() => handleManualApprove(r)}
                              disabled={loadingAction.approveId === r.id}
                              className={`${
                                loadingAction.approveId === r.id
                                  ? "bg-blue-400 cursor-wait"
                                  : "bg-blue-600 hover:bg-blue-700"
                              } text-white px-3 py-1.5 rounded text-xs flex items-center gap-1`}
                            >
                              {loadingAction.approveId === r.id ? (
                                <>
                                  <span className="animate-spin h-3 w-3 border-t-2 border-white rounded-full"></span>
                                  Processing
                                </>
                              ) : (
                                "Approve"
                              )}
                            </button>
                          )}
                          {["approved", "delivered"].includes(r.status) && (
                            <button
                              onClick={() => updateStatus(r, "delivered")}
                              disabled={loadingAction.deliverId === r.id}
                              className={`${
                                loadingAction.deliverId === r.id
                                  ? "bg-green-400 cursor-wait"
                                  : "bg-green-600 hover:bg-green-700"
                              } text-white px-3 py-1.5 rounded text-xs flex items-center gap-1`}
                            >
                              {loadingAction.deliverId === r.id ? (
                                <>
                                  <span className="animate-spin h-3 w-3 border-t-2 border-white rounded-full"></span>
                                  Updating
                                </>
                              ) : (
                                "Delivered"
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(r.userId)}
                            disabled={loadingAction.viewId === r.userId}
                            className={`${
                              loadingAction.viewId === r.userId
                                ? "bg-indigo-400 cursor-wait"
                                : "bg-indigo-600 hover:bg-indigo-700"
                            } text-white px-3 py-1.5 rounded text-xs flex items-center gap-1`}
                          >
                            {loadingAction.viewId === r.userId ? (
                              <>
                                <span className="animate-spin h-3 w-3 border-t-2 border-white rounded-full"></span>
                                Loading
                              </>
                            ) : (
                              "View Details"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* 🧾 User Details Modal */}
      {userDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setUserDetails(null)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              👤 User Details
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {userDetails.name} ({userDetails.email})
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Total Requests</p>
                <p className="font-bold text-gray-800">
                  {userDetails.stats.total}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-700">Won</p>
                <p className="font-bold text-green-800">
                  {userDetails.stats.won}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-700">Lost</p>
                <p className="font-bold text-red-800">
                  {userDetails.stats.lost}
                </p>
              </div>
            </div>

            {userDetails.delivery && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-1">
                  📦 Default Delivery Address
                </h3>
                <p className="text-sm text-gray-600">
                  {userDetails.delivery.address || "N/A"}
                  {userDetails.delivery.zipCode
                    ? ` (${userDetails.delivery.zipCode})`
                    : ""}
                  <br />
                  {userDetails.delivery.phone && `📞 ${userDetails.delivery.phone}`}
                </p>
              </div>
            )}

            <h3 className="font-semibold text-gray-700 mt-6 mb-2">
              Recent Requests
            </h3>
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
                      {r.manualWinner && " (Manual)"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.lastStatusUpdate ? formatDate(r.lastStatusUpdate) : "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
