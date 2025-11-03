// ✅ FILE: src/pages/AdminPaymentDetails.js (Contrast + shadow enhanced)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { isAdmin } from "../utils/adminUtils";
import toast from "react-hot-toast";
import {
  getPaymentDetails as httpGetPaymentDetails,
  adminApproveDeposit,
  adminRejectDeposit,
  markPaymentDelivered,
} from "../services/functionsApi";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Home, ChevronRight } from "lucide-react";

/* ------------------ helpers ------------------ */
const formatAmount = (amount, currency = "JPY") => {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
    }).format(amount ?? 0);
  } catch {
    return `${amount ?? 0} ${currency}`;
  }
};

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", {
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
    case "approved":
    case "verified":
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "delivered":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/* ------------------ component ------------------ */
export default function AdminPaymentDetails() {
  const { id: paymentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [deliveryInfoResolved, setDeliveryInfoResolved] = useState(null);

  const latestReport = useMemo(
    () => (Array.isArray(reports) && reports.length ? reports[0] : null),
    [reports]
  );

  /* ------------------ delivery resolver ------------------ */
  const normalizeAddr = (v) => {
    if (!v) return null;
    if (typeof v === "string") {
      const str = v.trim();
      if (/^[A-Za-z0-9_-]{10,}$/.test(str)) return null;
      return { address: str };
    }
    if (typeof v === "object") {
      const name = v.recipientName || v.fullName || v.name || null;
      const zip = v.zipCode || v.postalCode || v.zip || null;
      const addr =
        v.address ||
        [v.prefecture, v.city, v.street, v.building].filter(Boolean).join(" ") ||
        null;
      const phone = v.phone || v.tel || null;
      if (name || addr || phone)
        return { recipientName: name, zipCode: zip, address: addr, phone };
    }
    return null;
  };

  const extractDeliveryFields = (src) => {
    if (!src) return null;
    const keys = ["deliveryInfo", "shippingAddress", "addressInfo", "address"];
    for (const k of keys) {
      const val = src[k];
      const norm = normalizeAddr(val);
      if (norm) return norm;
    }
    return normalizeAddr(src);
  };

  const resolveDeliveryInfo = useCallback(async (_payment, _reports) => {
    let info = extractDeliveryFields(_payment);
    if (info) return info;

    if (Array.isArray(_reports)) {
      for (const r of _reports) {
        const fromReport = extractDeliveryFields(r);
        if (fromReport) return fromReport;
      }
    }

    try {
      if (_payment?.userId) {
        const uref = doc(db, "users", _payment.userId);
        const usnap = await getDoc(uref);
        if (usnap.exists()) {
          info = extractDeliveryFields(usnap.data());
          if (info) return info;
        }
      }
    } catch {}
    return null;
  }, []);

  const fetchDetails = useCallback(async () => {
    const res = await httpGetPaymentDetails({ paymentId });
    const data = res?.payment || res?.data?.payment || {};
    const rpts = res?.reports || res?.data?.reports || [];
    const di = await resolveDeliveryInfo(data, rpts);
    setPayment(data);
    setReports(rpts);
    setDeliveryInfoResolved(di);
    setDebug({
      reportCount: rpts.length,
      hasDeliveryResolved: !!di,
      _ts: Date.now(),
    });
  }, [paymentId, resolveDeliveryInfo]);

  useEffect(() => {
    (async () => {
      const ok = await isAdmin();
      if (!ok) return navigate("/unauthorized");
      try {
        setLoading(true);
        await fetchDetails();
      } catch (e) {
        setError(e?.message || "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId, fetchDetails, navigate]);

  /* ------------------ actions ------------------ */
  const handleApprove = async () => {
    const rid = latestReport?.id || "inline-proof";
    try {
      setActionLoading(true);
      await adminApproveDeposit({ paymentId, reportId: rid });
      toast.success("✅ Deposit approved!");
      await fetchDetails();
    } catch (e) {
      toast.error(e?.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const rid = latestReport?.id || "inline-proof";
    const reason = window.prompt("Reason (optional):") || undefined;
    try {
      setActionLoading(true);
      await adminRejectDeposit({ paymentId, reportId: rid, reason });
      toast("🚫 Deposit rejected", {
        style: { background: "#fee2e2", color: "#7f1d1d" },
      });
      await fetchDetails();
    } catch (e) {
      toast.error(e?.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!window.confirm("Mark this COD payment as Delivered?")) return;
    try {
      setActionLoading(true);
      await markPaymentDelivered({ paymentId });
      toast.success("📦 COD marked as delivered!");
      await fetchDetails();
    } catch {
      toast.error("Failed to mark as delivered");
    } finally {
      setActionLoading(false);
    }
  };

  /* ------------------ UI ------------------ */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading payment details…
      </div>
    );

  if (error || !payment)
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Payment not found"}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
        {/* 🧭 Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-1">
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} className="mx-1" />
          <Link to="/admin/payments" className="hover:text-indigo-600">
            Payments
          </Link>
          <ChevronRight size={14} className="mx-1" />
          <span className="text-gray-800 font-medium truncate">
            Details / {paymentId.slice(0, 10)}…
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Payment Details</h1>
          <button
            className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => navigate("/admin/payments")}
          >
            ← Back to Payments
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-gray-700"><b>ID:</b> {payment.id}</div>
          <div className="text-gray-700"><b>User:</b> {payment.userName || "Unknown"}</div>
          <div className="text-gray-700"><b>Email:</b> {payment.userEmail || "—"}</div>
          <div className="text-gray-700"><b>Amount:</b> {formatAmount(payment.amount ?? payment.amountJPY)}</div>
          <div className="text-gray-700"><b>Method:</b> {payment.method || "—"}</div>
          <div className="text-gray-700">
            <b>Status:</b>{" "}
            <span className={`px-2 py-0.5 rounded-full ${getStatusBadgeClass(payment.status)}`}>
              {payment.status}
            </span>
          </div>
        </div>

        {/* Proof / Reports */}
        <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Reports / Proof of Deposit</h2>
          {reports.length === 0 ? (
            <p className="text-gray-600 text-sm">No proof uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-t border-gray-200">
                <thead className="bg-gray-100 text-left text-gray-700">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Depositor</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-center">Proof</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {reports.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200 text-center hover:bg-gray-50">
                      <td className="px-3 py-2">{formatDate(r.createdAt || r.when || r.uploadedAt)}</td>
                      <td className="px-3 py-2">{r.transferName || payment.userName || "—"}</td>
                      <td className="px-3 py-2">{formatAmount(r.amount ?? payment.amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(r.status)}`}>
                          {r.status || payment.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.proofUrl || r.receiptUrl ? (
                          <a href={r.proofUrl || r.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={r.proofUrl || r.receiptUrl}
                              alt="Proof"
                              className="w-24 h-24 object-cover border border-gray-300 rounded mx-auto hover:scale-105 transition"
                            />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delivery Info */}
        {deliveryInfoResolved && (
          <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-100 text-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Delivery Information</h2>
            <p><b>Recipient:</b> {deliveryInfoResolved.recipientName || "—"}</p>
            <p><b>Address:</b> {deliveryInfoResolved.address || "—"}</p>
            <p><b>Phone:</b> {deliveryInfoResolved.phone || "—"}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className={`px-5 py-2 text-sm text-white rounded ${
              actionLoading ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading}
            className={`px-5 py-2 text-sm text-white rounded ${
              actionLoading ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Reject
          </button>
          {payment.method === "cash_on_delivery" && (
            <button
              onClick={handleMarkDelivered}
              disabled={actionLoading}
              className={`px-5 py-2 text-sm text-white rounded ${
                actionLoading ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              Mark as Delivered
            </button>
          )}
        </div>

        {/* Debug */}
        {debug && (
          <pre className="bg-gray-100 border border-gray-200 text-gray-700 text-xs p-3 rounded mt-6 overflow-auto shadow-inner">
            {JSON.stringify(debug, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
