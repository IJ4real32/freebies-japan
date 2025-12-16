// ✅ FILE: src/pages/AdminPaymentDetails.js (PHASE-2 FINAL — FIRESTORE ONLY — PRICE FIXED & UI CLEAN)

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { checkAdminStatus } from "../utils/adminUtils";
import toast from "react-hot-toast";

import {
  adminApproveDeposit,
  adminRejectDeposit,
  markPaymentDelivered,
} from "../services/functionsApi";

import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { Home, ChevronRight } from "lucide-react";

/* ----------------------------------------------------
   Helpers
---------------------------------------------------- */
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
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "reported":
      return "bg-blue-100 text-blue-800";
    case "pending_cod_confirmation":
      return "bg-yellow-200 text-yellow-800";
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

/* ----------------------------------------------------
   Component
---------------------------------------------------- */
export default function AdminPaymentDetails() {
  const { id: paymentId } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const latestReport = useMemo(() => {
    if (!reports.length) return null;
    return reports[0];
  }, [reports]);

  /* ----------------------------------------------------
     Extract Delivery Info
  ---------------------------------------------------- */
  const extractDeliveryInfo = (p, firstReport) => {
    if (!p) return null;

    const src =
      p.deliveryInfo ||
      p.addressInfo ||
      p.shippingAddress ||
      (firstReport?.deliveryInfo ?? null);

    if (!src) return null;

    return {
      address: src.address || src.fullAddress || src.addr || "—",
      phone: src.phone || src.tel || "—",
      zip: src.zipCode || src.postalCode || null,
      room: src.roomNumber || null,
    };
  };

  /* ----------------------------------------------------
     Load payment + reports
  ---------------------------------------------------- */
  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);

      const snap = await getDoc(doc(db, "payments", paymentId));
      if (!snap.exists()) throw new Error("Payment not found");

      const paymentData = { id: snap.id, ...snap.data() };
      setPayment(paymentData);

      const rSnap = await getDocs(collection(db, "payments", paymentId, "reports"));
      const rList = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // newest first
      rList.sort((a, b) => {
        const A = a.createdAt?.seconds ?? 0;
        const B = b.createdAt?.seconds ?? 0;
        return B - A;
      });

      setReports(rList);
    } catch (err) {
      console.error("Payment details error:", err);
      setError(err.message || "Failed to load payment");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    (async () => {
      const ok = await checkAdminStatus();
      if (!ok) return navigate("/unauthorized");
      await fetchDetails();
    })();
  }, [navigate, fetchDetails]);

  /* ----------------------------------------------------
     Admin Actions
  ---------------------------------------------------- */
  const approve = async () => {
    const reportId = latestReport?.id;
    try {
      setActionLoading(true);
      await adminApproveDeposit({ paymentId, reportId });
      toast.success("Payment approved");
      await fetchDetails();
    } catch (e) {
      toast.error(e.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    const reason = window.prompt("Reason for rejection? (optional)") || undefined;
    const reportId = latestReport?.id;

    try {
      setActionLoading(true);
      await adminRejectDeposit({ paymentId, reportId, reason });
      toast("Payment rejected", { style: { color: "red" } });
      await fetchDetails();
    } catch (e) {
      toast.error(e.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  const markDelivered = async () => {
    if (!window.confirm("Mark this COD payment as delivered?")) return;

    try {
      setActionLoading(true);
      await markPaymentDelivered({ paymentId });
      toast.success("Marked as delivered");
      await fetchDetails();
    } catch {
      toast.error("Failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ----------------------------------------------------
     UI LOADING / ERROR
  ---------------------------------------------------- */
  if (loading)
    return <div className="p-10 text-center text-gray-700 text-lg">Loading payment…</div>;

  if (error || !payment)
    return <div className="p-10 text-center text-red-600 text-lg">{error || "Payment not found"}</div>;

  const delivery = extractDeliveryInfo(payment, latestReport);

  // ⭐ FIXED AMOUNT LOGIC ⭐
  const effectiveAmount =
    payment.amount && payment.amount > 0
      ? payment.amount
      : payment.itemPriceJPY || 0;

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white border border-gray-300 rounded-2xl shadow p-8">

        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-700 mb-6">
          <Link to="/admin" className="flex items-center gap-1 hover:text-indigo-600">
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} className="mx-1" />
          <Link to="/admin/payments" className="hover:text-indigo-600">Payments</Link>
          <ChevronRight size={14} className="mx-1" />
          <span className="font-medium text-gray-900">Details / {paymentId.slice(0, 10)}…</span>
        </div>

        {/* Payment Summary */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Summary</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-lg border text-gray-800">
          <div><b>ID:</b> {payment.id}</div>
          <div><b>User:</b> {payment.userName || "Unknown"}</div>
          <div><b>Email:</b> {payment.userEmail || "—"}</div>
          <div><b>Amount:</b> {formatAmount(effectiveAmount)}</div>
          <div><b>Method:</b> {payment.method}</div>
          <div>
            <b>Status:</b>{" "}
            <span className={`px-2 py-1 rounded-full ${statusBadge(payment.status)}`}>
              {payment.status}
            </span>
          </div>
        </div>

        {/* Reports */}
        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Deposit Reports</h2>

        <div className="bg-gray-50 border rounded-xl p-6 shadow-sm text-gray-800">
          {reports.length === 0 ? (
            <p className="text-gray-700">No deposit reports uploaded.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => (
                <div key={r.id} className="p-4 bg-white border rounded shadow-sm">
                  <div><b>Date:</b> {formatDate(r.createdAt)}</div>
                  <div><b>Status:</b> {r.status || "—"}</div>

                  <div className="mt-3">
                    {r.proofUrl ? (
                      <a href={r.proofUrl} target="_blank" rel="noopener noreferrer">
                        <img src={r.proofUrl} className="w-40 h-40 object-cover border rounded shadow" />
                      </a>
                    ) : (
                      <span className="text-gray-600">No image</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Info */}
        {delivery && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Delivery Information</h2>

            <div className="bg-gray-50 p-6 border rounded-xl shadow-sm text-gray-800">
              <p><b>Address:</b> {delivery.address}</p>
              <p><b>Phone:</b> {delivery.phone}</p>
              {delivery.zip && <p><b>Zip Code:</b> {delivery.zip}</p>}
              {delivery.room && <p><b>Room:</b> {delivery.room}</p>}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-10 flex gap-4">
          {/* Deposit actions */}
          {payment.method !== "cash_on_delivery" && (
            <>
              <button
                disabled={actionLoading}
                onClick={approve}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow"
              >
                Approve
              </button>

              <button
                disabled={actionLoading}
                onClick={reject}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow"
              >
                Reject
              </button>
            </>
          )}

          {/* COD */}
          {payment.method === "cash_on_delivery" && (
            <button
              disabled={actionLoading}
              onClick={markDelivered}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow"
            >
              Mark Delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
