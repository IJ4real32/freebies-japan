// =====================================================
// FILE: src/pages/AdminPaymentDetails.js
// POLISHED VERSION - VISIBILITY FIXES
// =====================================================

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { checkAdminStatus } from "../utils/adminUtils";
import toast from "react-hot-toast";
import {
  adminApprovePaymentAndCreateDelivery,
  adminRejectPayment,
} from "../services/functionsApi";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Home,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Truck,
  FileText,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  Package,
  Loader2,
  ExternalLink,
  Clock,
  Shield,
  Info,
} from "lucide-react";

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
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
};

const formatTimeAgo = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const statusBadge = (status) => {
  switch (status) {
    case "pending":
    case "pending_deposit":
    case "pending_cod_confirmation":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "reported":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "depositPaid":
      return "bg-green-100 text-green-800 border border-green-200";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-300";
  }
};

const getApprovalButtonLabel = (payment) => {
  if (!payment) return "Approve Payment";
  
  if (payment.method === 'cash_on_delivery' || payment.method === 'cod') {
    return "Approve COD & Start Delivery";
  }
  return "Approve Deposit & Start Delivery";
};

const isEligibleForApproval = (payment) => {
  if (!payment) return false;
  
  return (
    (payment.method === 'deposit' && payment.status === 'reported') ||
    (payment.method === 'cash_on_delivery' && payment.status === 'pending_cod_confirmation') ||
    (payment.method === 'cod' && payment.status === 'pending_cod_confirmation')
  );
};

/* ----------------------------------------------------
   Component
---------------------------------------------------- */
export default function AdminPaymentDetails() {
  const { id: paymentId } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [reports, setReports] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const latestReport = useMemo(
    () => (reports.length ? reports[0] : null),
    [reports]
  );

  /* ----------------------------------------------------
     Phase-2 Derived State
  ---------------------------------------------------- */
  const canAdminApprove = useMemo(() => 
    isEligibleForApproval(payment) && !payment?.deliveryId,
    [payment]
  );

  const isFinalized = useMemo(() =>
    payment?.status === "depositPaid" ||
    payment?.status === "rejected" ||
    payment?.status === "cancelled" ||
    payment?.status === "delivered",
    [payment]
  );

  const isCOD = useMemo(() =>
    payment?.method === 'cash_on_delivery' || payment?.method === 'cod',
    [payment]
  );

  /* ----------------------------------------------------
     Load payment + reports + delivery + item
  ---------------------------------------------------- */
  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Load payment
      const paymentSnap = await getDoc(doc(db, "payments", paymentId));
      if (!paymentSnap.exists()) {
        throw new Error("Payment not found");
      }

      const paymentData = { id: paymentSnap.id, ...paymentSnap.data() };
      setPayment(paymentData);

      // 2. Load reports
      try {
        const reportsQuery = query(
          collection(db, "payments", paymentId, "reports"),
          orderBy("createdAt", "desc")
        );
        const reportsSnap = await getDocs(reportsQuery);
        setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.log("No reports found:", err.message);
        setReports([]);
      }

      // 3. Load delivery if exists
      if (paymentData.deliveryId) {
        try {
          const deliverySnap = await getDoc(doc(db, "deliveryDetails", paymentData.deliveryId));
          if (deliverySnap.exists()) {
            setDelivery({ id: deliverySnap.id, ...deliverySnap.data() });
          }
        } catch (err) {
          console.log("Delivery not found:", err.message);
        }
      }

      // 4. Load item
      if (paymentData.itemId) {
        try {
          const itemSnap = await getDoc(doc(db, "donations", paymentData.itemId));
          if (itemSnap.exists()) {
            setItem({ id: itemSnap.id, ...itemSnap.data() });
          }
        } catch (err) {
          console.log("Item not found:", err.message);
        }
      }

    } catch (err) {
      console.error("Failed to load payment details:", err);
      setError(err.message || "Failed to load payment");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  // Live listener for payment updates
  useEffect(() => {
    if (!paymentId) return;

    const unsubscribe = onSnapshot(
      doc(db, "payments", paymentId),
      (snap) => {
        if (snap.exists()) {
          setPayment({ id: snap.id, ...snap.data() });
          
          // If deliveryId is added, load delivery
          if (snap.data().deliveryId && !delivery) {
            getDoc(doc(db, "deliveryDetails", snap.data().deliveryId))
              .then(deliverySnap => {
                if (deliverySnap.exists()) {
                  setDelivery({ id: deliverySnap.id, ...deliverySnap.data() });
                }
              })
              .catch(console.error);
          }
        }
      },
      (err) => console.error("Payment listener error:", err)
    );

    return () => unsubscribe();
  }, [paymentId, delivery]);

  /* ----------------------------------------------------
     Initial load and admin check
  ---------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const ok = await checkAdminStatus();
      if (!ok) {
        toast.error("Admin access required");
        navigate("/unauthorized");
        return;
      }
      fetchDetails();
    };

    init();
  }, [navigate, fetchDetails]);

  /* ----------------------------------------------------
     Admin Actions (Phase-2 Only)
  ---------------------------------------------------- */
  const approve = async () => {
    if (!canAdminApprove) {
      toast.error("Payment is not in a state that can be approved");
      return;
    }

    const confirmMsg = isCOD
      ? "Approve this COD payment and start delivery?\n\nPhase-2: This will create a delivery record automatically."
      : "Approve this deposit payment and start delivery?\n\nPhase-2: This will create a delivery record automatically.";

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const result = await adminApprovePaymentAndCreateDelivery({ paymentId });
      
      toast.success(
        <div>
          <div className="font-medium">✅ Payment approved!</div>
          <div className="text-sm">Delivery created: {result.data.delivery.id}</div>
        </div>,
        { duration: 5000 }
      );
      
      // Refresh details to show updated state
      await fetchDetails();
    } catch (e) {
      console.error("Approval failed:", e);
      toast.error(e.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    if (payment?.deliveryId) {
      toast.error("Cannot reject payment with existing delivery");
      return;
    }

    const reason = window.prompt("Reason for rejection?") || undefined;
    if (reason === undefined) return; // User cancelled

    setActionLoading(true);
    try {
      await adminRejectPayment({ paymentId, reason });
      toast.success("Payment rejected");
      await fetchDetails();
    } catch (e) {
      console.error("Rejection failed:", e);
      toast.error(e.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ----------------------------------------------------
     Loading / Error
  ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The payment you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate("/admin/payments")}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Payments
          </button>
        </div>
      </div>
    );
  }

  const effectiveAmount =
    payment.amount && payment.amount > 0
      ? payment.amount
      : payment.itemPriceJPY || 0;

  /* ----------------------------------------------------
     Render
  ---------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <Link to="/admin" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
            <Home size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <Link to="/admin/payments" className="hover:text-blue-600 transition-colors">
            Payments
          </Link>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <span className="font-medium text-gray-800 truncate max-w-[200px]">
            {paymentId.slice(0, 12)}...
          </span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Payment Details</h1>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
                  {paymentId}
                </code>
                <span className="text-xs text-gray-500">
                  • {formatTimeAgo(payment.updatedAt || payment.createdAt)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {payment.deliveryId && (
                <Link
                  to={`/admin/deliveries/${payment.deliveryId}`}
                  className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 hover:bg-emerald-200 flex items-center gap-2 transition-colors"
                >
                  <Truck size={16} />
                  View Delivery
                </Link>
              )}
              
              <button
                onClick={fetchDetails}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`p-4 rounded-lg mb-6 ${statusBadge(payment.status)}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  payment.status === 'depositPaid' ? 'bg-green-200' : 
                  payment.status === 'rejected' || payment.status === 'cancelled' ? 'bg-red-200' : 
                  'bg-yellow-200'
                }`}>
                  {payment.status === 'depositPaid' ? 
                    <CheckCircle size={20} className="text-green-700" /> : 
                    payment.status === 'rejected' || payment.status === 'cancelled' ?
                    <XCircle size={20} className="text-red-700" /> :
                    <AlertCircle size={20} className="text-yellow-700" />
                  }
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-700">Current Status</h3>
                  <p className="text-xl font-bold capitalize">{payment.status.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Payment Method</div>
                <div className="font-bold flex items-center gap-2 justify-end">
                  {payment.method === 'cash_on_delivery' || payment.method === 'cod' ? 
                    <CreditCard size={18} className="text-purple-600" /> : 
                    <DollarSign size={18} className="text-green-600" />
                  }
                  <span className="capitalize">
                    {payment.method.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Payment Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Payment Summary Card - IMPROVED VISIBILITY */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                  <DollarSign size={20} className="text-blue-600" />
                  Payment Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="text-sm text-blue-600 font-medium mb-1">Amount</div>
                    <div className="text-2xl font-bold text-gray-900">{formatAmount(effectiveAmount)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-600 font-medium mb-1">Created</div>
                    <div className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-500" />
                        {formatDate(payment.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(payment.createdAt)}</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-600 font-medium mb-1">User</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <User size={16} className="text-blue-500" />
                      {payment.userName || payment.userEmail?.split('@')[0] || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 truncate">{payment.userEmail}</div>
                    {payment.userId && (
                      <div className="text-xs text-gray-500 mt-1">ID: {payment.userId.slice(0, 8)}...</div>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-600 font-medium mb-1">Item</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Package size={16} className="text-emerald-500" />
                      {item?.title || payment.itemTitle || "Unknown Item"}
                    </div>
                    {item?.id && (
                      <div className="text-sm text-gray-600 mt-1">
                        ID: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{item.id.slice(0, 8)}...</code>
                      </div>
                    )}
                    {item?.price && (
                      <div className="text-sm text-gray-600 mt-1">Price: ¥{item.price.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reports Card - IMPROVED VISIBILITY */}
              {!isCOD && reports.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800">
                      <FileText size={20} className="text-blue-600" />
                      Payment Proofs ({reports.length})
                    </h3>
                    {latestReport?.status && (
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        latestReport.status === 'approved' ? 'bg-green-100 text-green-800' :
                        latestReport.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {latestReport.status}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {reports.map((report, idx) => (
                      <div key={report.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              <Shield size={14} className="text-blue-500" />
                              Proof #{idx + 1}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              <div className="flex items-center gap-2">
                                <Clock size={12} />
                                Submitted: {formatDate(report.createdAt)}
                              </div>
                            </div>
                          </div>
                          {report.status && (
                            <span className={`px-2 py-1 text-xs rounded-full self-start ${
                              report.status === 'approved' ? 'bg-green-100 text-green-800' :
                              report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {report.status}
                            </span>
                          )}
                        </div>
                        {report.note && (
                          <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                            <div className="text-xs text-gray-600 font-medium mb-1">Note:</div>
                            <p className="text-sm text-gray-700">{report.note}</p>
                          </div>
                        )}
                        {report.proofUrl && (
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={report.proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <ExternalLink size={16} />
                              View Proof Document
                            </a>
                            <a
                              href={report.proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              ({report.proofUrl.slice(0, 50)}...)
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions & Info */}
            <div className="space-y-6">
              {/* Phase-2 Info Card */}
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3 mb-3">
                  <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-800 text-sm mb-1">🎯 Phase-2 Delivery Flow</h3>
                    <ul className="text-sm text-blue-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
                        <span>Click "Approve" to create delivery automatically</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Truck size={14} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                        <span>Delivery record will be created in Firestore</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Calendar size={14} className="mt-0.5 flex-shrink-0 text-purple-600" />
                        <span>Seller can then schedule pickup dates</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Delivery Status Card */}
              {delivery && (
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                  <h3 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2">
                    <Truck size={16} className="text-emerald-600" />
                    Delivery Status
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-emerald-700 font-medium mb-1">Delivery ID</div>
                      <code className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-1 rounded w-full block truncate">
                        {delivery.id}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-700 font-medium mb-1">Status</div>
                      <div className="font-medium text-emerald-900 capitalize">{delivery.deliveryStatus || "Active"}</div>
                    </div>
                    {delivery.createdAt && (
                      <div>
                        <div className="text-xs text-emerald-700 font-medium mb-1">Created</div>
                        <div className="text-sm text-emerald-900">{formatDate(delivery.createdAt)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions Card */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Actions</h3>
                <div className="space-y-3">
                  {canAdminApprove && !isFinalized && (
                    <>
                      <button
                        onClick={approve}
                        disabled={actionLoading}
                        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                          actionLoading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : isCOD 
                              ? 'bg-purple-600 hover:bg-purple-700 shadow-sm' 
                              : 'bg-green-600 hover:bg-green-700 shadow-sm'
                        } text-white`}
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            {getApprovalButtonLabel(payment)}
                          </>
                        )}
                      </button>

                      <button
                        onClick={reject}
                        disabled={actionLoading}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={18} />
                        Reject Payment
                      </button>
                    </>
                  )}

                  {!canAdminApprove && (
                    <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 text-center">
                        {isFinalized 
                          ? "This payment has been finalized."
                          : payment.deliveryId 
                            ? "Delivery already created."
                            : "Payment is not in an approvable state."
                        }
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => navigate("/admin/payments")}
                    className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <ArrowLeft size={18} />
                    Back to Payments
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-gray-200">
          <p>Payment ID: <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{paymentId}</code></p>
          <p className="mt-1">Last updated: {formatDate(payment.updatedAt || payment.createdAt)}</p>
        </div>

      </div>
    </div>
  );
}