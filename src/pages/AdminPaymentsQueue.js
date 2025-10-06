// ✅ FILE: src/pages/AdminPaymentsQueue.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { functions } from "../firebase";
import BackToDashboardButton from "../components/Admin/BackToDashboardButton";
import Navbar from "../components/UI/Navbar";
import { isAdmin } from "../utils/adminUtils";

const STATUS_FILTERS = [
  { key: "all", label: "All", values: ["pending", "awaiting_approval", "approved", "rejected"] },
  { key: "pending", label: "Pending Review", values: ["pending"] },
  { key: "awaiting", label: "Awaiting Approval", values: ["awaiting_approval"] },
  { key: "approved", label: "Approved", values: ["approved"] },
  { key: "rejected", label: "Rejected", values: ["rejected"] },
];

const AdminPaymentsQueue = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [statusKey, setStatusKey] = useState("all");
  const navigate = useNavigate();

  // guard: avoid setting state after unmount
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDebug(null);

      const ok = await isAdmin();
      if (!ok) {
        navigate("/unauthorized");
        return;
      }

      const statusValue =
        statusKey === "all" ? undefined : STATUS_FILTERS.find(f => f.key === statusKey)?.values[0];

      const getPaymentQueue = httpsCallable(functions, "getPaymentQueue");
      const payload = { limit: 100 };
      if (statusValue) payload.status = statusValue;

      const result = await getPaymentQueue(payload);
      if (!aliveRef.current) return;

      setPayments(result?.data?.payments || []);
      setDebug({
        hasMore: result?.data?.hasMore,
        totalCount: result?.data?.totalCount,
        lastVisible: result?.data?.lastVisible,
      });
    } catch (err) {
      if (!aliveRef.current) return;
      const friendly = {
        name: err?.name,
        code: err?.code,
        message: err?.message,
        details: err?.details,
      };
      console.error("Error fetching payment queue:", err, friendly);
      setError(friendly.message || "Failed to load payments");
      setDebug(friendly);
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }, [statusKey, navigate]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleStatusChange = (newStatusKey) => setStatusKey(newStatusKey);

  const formatAmount = (amount, currency = "JPY") => {
    try {
      return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${currency}`;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ja-JP", {
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Pending Review";
      case "awaiting_approval": return "Awaiting Approval";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      default: return status || "Unknown";
    }
  };

  const runHealthCheck = async () => {
    try {
      const testConnection = httpsCallable(functions, "testConnection");
      const res = await testConnection();
      setDebug({ ...(debug || {}), testConnection: res?.data });
    } catch (e) {
      console.error("testConnection failed:", e);
      setDebug({ ...(debug || {}), testConnectionError: { code: e?.code, message: e?.message } });
    }
  };

  if (loading) {
    return (
      <>
        <Navbar isTransparent={false} hideOnAdmin />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <BackToDashboardButton />
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading payments...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar isTransparent={false} hideOnAdmin />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <BackToDashboardButton />

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Payment Queue</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={runHealthCheck}
              className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Run backend health check
            </button>
            <div className="text-sm text-gray-600">
              {payments.length} payment{payments.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-3">
            {error}
          </div>
        )}
        {debug && (
          <pre className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded mb-4 overflow-auto">
            {JSON.stringify(debug, null, 2)}
          </pre>
        )}

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleStatusChange(filter.key)}
              className={`px-4 py-2 rounded text-sm font-medium ${
                statusKey === filter.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Payments List */}
        <div className="bg-white border rounded-lg overflow-hidden">
          {payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No payments found in this category.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Delivery</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id || payment.paymentId} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {payment.paymentId || payment.id}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{payment.userName || "Unknown"}</div>
                          <div className="text-xs text-gray-500">{payment.userEmail}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {payment.paymentType || payment.type}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {payment.address ? (
                          <div>
                            <div>{payment.address.recipientName}</div>
                            <div>{payment.address.phone}</div>
                            <div>
                              {payment.address.postalCode} {payment.address.prefecture}
                              {payment.address.city} {payment.address.street}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-gray-400">No address</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(
                            payment.status
                          )}`}
                        >
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            navigate(`/admin/payments/${payment.paymentId || payment.id}`)
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
    </>
  );
};

export default AdminPaymentsQueue;
