// ✅ FILE: src/pages/RequestsAdmin.js
import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { sendAdminItemStatusEmail } from "../services/functionsApi";
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

  /* --------------------------------------------------------
   * 🧠 Real-time sync of requests
   * -------------------------------------------------------- */
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

  /* --------------------------------------------------------
   * 🧾 Helpers
   * -------------------------------------------------------- */
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

  /* --------------------------------------------------------
   * 📨 Admin manual updates
   * -------------------------------------------------------- */
  const updateStatus = async (req, newStatus) => {
    try {
      if (req.status === "pending") {
        toast("⏳ This request is still awaiting lottery results.");
        return;
      }

      await updateDoc(doc(db, "requests", req.id), {
        status: newStatus,
        lastStatusUpdate: serverTimestamp(),
      });

      if (newStatus === "delivered" && req.itemId && req.userId) {
        const donationRef = doc(db, "donations", req.itemId);
        await updateDoc(donationRef, {
          status: "delivered",
          deliveredTo: req.userId,
          deliveryDate: serverTimestamp(),
        });
      }

      await sendAdminItemStatusEmail({
        requestId: req.id,
        status: newStatus,
        userEmail: req.userEmail,
        itemTitle: req.itemTitle || "Your requested item",
      });

      toast.success(`✅ Status updated to "${newStatus}" and user notified.`);
    } catch (e) {
      console.error("Update failed:", e);
      toast.error("Failed to update status");
    }
  };

  /* --------------------------------------------------------
   * 🔍 Fetch User Details
   * -------------------------------------------------------- */
  const handleViewDetails = async (userId) => {
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
    }
  };

  /* --------------------------------------------------------
   * 🧮 Filter Logic
   * -------------------------------------------------------- */
  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => (r.status || "pending") === filter);

  /* --------------------------------------------------------
   * 🖥️ Desktop-first Admin UI
   * -------------------------------------------------------- */
  return (
    <AdminLayout title="Requests Management">
      <div className="min-w-[1024px] px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Requests</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter:</label>
            <select
              className="border rounded-md px-2 py-1 text-sm"
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

        {error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading requests…</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Result</th>
                  <th className="px-4 py-3 font-semibold">Last Update</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.userName || "—"}</div>
                      <div className="text-xs text-gray-500">{r.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">{r.itemTitle || r.itemId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusColors[r.status] || "bg-gray-100"
                        }`}
                      >
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "approved" ? (
                        <span className="text-green-700 font-semibold">
                          🏆 Winner
                        </span>
                      ) : r.status === "rejected" ? (
                        <span className="text-red-600">❌ Lost</span>
                      ) : (
                        <span className="text-gray-500 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.lastStatusUpdate ? formatDate(r.lastStatusUpdate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "approved" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => updateStatus(r, "delivered")}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700"
                          >
                            Mark Delivered
                          </button>
                          <button
                            onClick={() => handleViewDetails(r.userId)}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs hover:bg-indigo-700"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 🪟 Details Modal */}
        {userDetails && (
          <div
            className="modal"
            onClick={() => setUserDetails(null)}
          >
            <div
              className="bg-white w-full max-w-lg rounded-lg p-6 relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={() => setUserDetails(null)}
              >
                ✖
              </button>
              <h2 className="text-lg font-semibold mb-3">
                User Details — {userDetails.name}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                <b>Email:</b> {userDetails.email || "—"}
              </p>
              <div className="text-sm mb-3">
                <b>Stats:</b> {userDetails.stats.won} won /{" "}
                {userDetails.stats.total} total — Lost:{" "}
                {userDetails.stats.lost}
              </div>

              {userDetails.delivery ? (
                <div className="bg-gray-50 border rounded p-3 text-sm mb-3">
                  <b>Delivery Info</b>
                  <div>{userDetails.delivery.address}</div>
                  {userDetails.delivery.recipientName && (
                    <div>👤 {userDetails.delivery.recipientName}</div>
                  )}
                  {userDetails.delivery.phone && (
                    <div>📞 {userDetails.delivery.phone}</div>
                  )}
                </div>
              ) : (
                <p className="italic text-sm text-gray-500">
                  No delivery info found.
                </p>
              )}

              <div className="mt-3 border-t pt-3 max-h-60 overflow-y-auto">
                <h3 className="font-medium text-sm mb-2">Request History</h3>
                {userDetails.requests.map((rq) => (
                  <div
                    key={rq.id}
                    className="border-b py-1 text-sm flex justify-between"
                  >
                    <span>{rq.itemTitle || rq.itemId}</span>
                    <span
                      className={`${
                        rq.status === "approved"
                          ? "text-green-600"
                          : rq.status === "rejected"
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {rq.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
