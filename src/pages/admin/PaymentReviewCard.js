// ✅ FILE: src/pages/Admin/PaymentReviewCard.jsx
// PHASE-2 FINAL — FIXED COD APPROVAL LOGIC

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getPaymentDetails,
  adminApprovePaymentAndCreateDelivery,
  adminRejectPayment,
} from "../../services/functionsApi";

import {
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Truck,
  CreditCard,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";

// Helper functions - UPDATED
const isEligibleForApproval = (payment) => {
  if (!payment) return false;
  
  console.log("🔍 Checking eligibility:", {
    method: payment.method,
    status: payment.status,
    isCOD: payment.method === 'cash_on_delivery' || payment.method === 'cod',
    isDeposit: payment.method === 'deposit',
    statusMatches: {
      deposit: payment.status === 'reported',
      cod: payment.status === 'pending_cod_confirmation' || payment.status === 'pending'
    }
  });
  
  // Deposit payments
  if (payment.method === 'deposit' && payment.status === 'reported') {
    return true;
  }
  
  // COD payments - CHECK BOTH METHOD NAMES AND STATUSES
  const isCOD = payment.method === 'cash_on_delivery' || payment.method === 'cod';
  const isCODReady = payment.status === 'pending_cod_confirmation' || 
                     payment.status === 'pending' || 
                     payment.status === 'pending_cod';
  
  if (isCOD && isCODReady) {
    return true;
  }
  
  return false;
};

const getApprovalButtonLabel = (payment) => {
  if (!payment) return "Approve";
  
  const isCOD = payment.method === 'cash_on_delivery' || payment.method === 'cod';
  return isCOD ? "Approve COD" : "Approve Deposit";
};

const getApprovalButtonColor = (payment) => {
  if (!payment) return "emerald";
  
  const isCOD = payment.method === 'cash_on_delivery' || payment.method === 'cod';
  return isCOD ? "purple" : "emerald";
};

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return "¥0";
  return `¥${amount.toLocaleString("ja-JP")}`;
};

export default function PaymentReviewCard({ paymentId, ticketId, onHandled }) {
  const [payment, setPayment] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(true);
  const [error, setError] = useState(null);

  // -------------------------------------------------------
  // LOAD PAYMENT DETAILS
  // -------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      if (!paymentId) return;

      try {
        setError(null);
        const res = await getPaymentDetails({ paymentId });

        if (res?.payment) {
          console.log("📦 Payment loaded:", {
            id: paymentId,
            method: res.payment.method,
            status: res.payment.status,
            deliveryId: res.payment.deliveryId
          });
          setPayment(res.payment);
          setReports(res.reports || []);
        } else {
          setError("Failed to load payment details");
          toast.error("Failed to load payment details.");
        }
      } catch (err) {
        console.error("Failed to load payment:", err);
        setError(err.message || "Failed to load payment");
        toast.error("Failed to load payment details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [paymentId]);

  // -------------------------------------------------------
  // PHASE-2 STATE CALCULATIONS - UPDATED
  // -------------------------------------------------------
  const isCOD = payment && (payment.method === "cash_on_delivery" || payment.method === "cod");
  const canAdminApprove = isEligibleForApproval(payment);
  const hasDelivery = payment?.deliveryId;
  
  console.log("🎯 Payment state:", {
    paymentId,
    method: payment?.method,
    status: payment?.status,
    isCOD,
    canAdminApprove,
    hasDelivery,
    isEligible: isEligibleForApproval(payment)
  });

  // More accurate final status check
  const isFinal = payment && [
    "depositPaid",
    "approved",
    "awaiting_delivery", 
    "delivered",
    "completed",
    "rejected",
    "canceled",
    "cancelled"
  ].includes(payment.status);

  // -------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------
  const handleApprove = useCallback(async () => {
    if (!payment) return;
    
    // Double-check eligibility
    if (!isEligibleForApproval(payment)) {
      toast.error(`Cannot approve: ${payment.method} in status ${payment.status}`);
      return;
    }
    
    const confirmMsg = isCOD
      ? "Approve this COD payment and start delivery?\n\nPhase-2: This will create a delivery record automatically."
      : "Approve this deposit payment and start delivery?\n\nPhase-2: This will create a delivery record automatically.";
    
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    try {
      console.log("🚀 Approving payment:", paymentId);
      const result = await adminApprovePaymentAndCreateDelivery({ paymentId });
      
      toast.success(
        <div>
          <div className="font-medium">✅ Payment approved!</div>
          <div className="text-sm">Delivery: {result.data.delivery.id}</div>
        </div>,
        { duration: 4000 }
      );
      
      setOpen(false);
      onHandled?.(paymentId, "approved");
    } catch (err) {
      console.error("Approval failed:", err);
      toast.error(err.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  }, [paymentId, payment, isCOD, onHandled]);

  const handleReject = useCallback(async () => {
    if (!payment) return;
    
    // Cannot reject if already has delivery
    if (payment.deliveryId) {
      toast.error("Cannot reject payment with existing delivery");
      return;
    }
    
    const reason = window.prompt("Reason for rejection?") || undefined;
    if (reason === undefined) return; // User cancelled

    setBusy(true);
    try {
      const result = await adminRejectPayment({
        paymentId,
        reason: reason || "Admin rejected",
      });

      if (result?.ok) {
        toast.success("Payment rejected.");
        setOpen(false);
        onHandled?.(paymentId, "rejected");
      } else {
        toast.error("Rejection failed.");
      }
    } catch (err) {
      console.error("Rejection failed:", err);
      toast.error(err.message || "Rejection failed");
    } finally {
      setBusy(false);
    }
  }, [paymentId, payment, onHandled]);

  // -------------------------------------------------------
  // RENDER STATES
  // -------------------------------------------------------
  if (!open) return null;

  if (loading) {
    return (
      <div className="p-4 border rounded bg-white text-sm text-gray-600 flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading payment…
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="p-4 border rounded bg-white">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle size={16} />
          <span className="font-medium">Error loading payment</span>
        </div>
        <p className="text-sm text-gray-600">{error || "Payment not found"}</p>
        <button
          onClick={() => setOpen(false)}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Determine button colors
  const approvalButtonColor = getApprovalButtonColor(payment);
  const buttonClass = approvalButtonColor === 'purple' 
    ? "bg-purple-600 hover:bg-purple-700" 
    : "bg-emerald-600 hover:bg-emerald-700";

  // Debug info - will show in console
  console.log("🎨 Rendering card:", {
    id: paymentId,
    method: payment.method,
    status: payment.status,
    isCOD,
    canAdminApprove,
    buttonLabel: getApprovalButtonLabel(payment),
    buttonColor,
    hasDelivery,
    isFinal
  });

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div className="rounded-xl border shadow-sm bg-white p-4">
      {/* DEBUG INFO - Only shows in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <div><strong>DEBUG:</strong> {payment.method} | {payment.status}</div>
          <div>Eligible: {canAdminApprove ? "YES" : "NO"} | COD: {isCOD ? "YES" : "NO"}</div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs text-gray-500">Payment ID</div>
            {hasDelivery && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                <Truck size={10} />
                Delivery
              </span>
            )}
          </div>
          <div className="font-mono text-sm">{paymentId.slice(0, 12)}...</div>

          {ticketId && (
            <>
              <div className="text-xs text-gray-500 mt-2">Ticket ID</div>
              <div className="font-mono text-xs text-gray-700">{ticketId}</div>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* INFO */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Info label="Status" value={payment.status} />
          <Info 
            label="Method" 
            value={
              <div className="flex items-center gap-1">
                {isCOD ? <CreditCard size={14} /> : <DollarSign size={14} />}
                <span className={isCOD ? "text-purple-700" : "text-green-700"}>
                  {payment.method}
                </span>
              </div>
            } 
          />
          <Info label="Amount" value={formatAmount(payment.amount)} />
          <Info label="User" value={`${payment.userName || "Unknown"} (${payment.userEmail || "No email"})`} />
          
          {/* Delivery ID if exists */}
          {hasDelivery && (
            <Info 
              label="Delivery" 
              value={
                <div className="flex items-center gap-1">
                  <Truck size={12} />
                  <span className="font-mono text-xs">{payment.deliveryId?.slice(0, 8)}...</span>
                </div>
              } 
            />
          )}
        </div>

        <div>
          {/* Receipt/proof section for non-COD */}
          {!isCOD && (
            <>
              <div className="text-sm text-gray-500 mb-1">Receipt</div>
              {reports?.[0]?.proofUrl ? (
                <a
                  href={reports[0].proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm"
                >
                  <ExternalLink size={14} />
                  Open proof
                </a>
              ) : (
                <div className="text-sm text-gray-600">No receipt uploaded.</div>
              )}

              <textarea
                className="w-full border rounded p-2 text-sm mt-3"
                rows={2}
                placeholder="Admin note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </>
          )}

          {/* COD-specific info */}
          {isCOD && (
            <div className="text-sm">
              <div className="font-medium text-purple-700 mb-1 flex items-center gap-1">
                <CreditCard size={14} />
                Cash on Delivery
              </div>
              
              {/* COD Status Indicators */}
              {payment.status === 'pending_cod_confirmation' && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-xs text-purple-700">
                  ✅ Ready for COD approval
                </div>
              )}
              
              {payment.status === 'pending' && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-700">
                  ⚠️ COD pending confirmation (may need status update)
                </div>
              )}
              
              {hasDelivery && (
                <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-xs text-green-700">
                  🚚 Delivery already created
                </div>
              )}
              
              {!hasDelivery && payment.status !== 'pending_cod_confirmation' && payment.status !== 'pending' && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded text-xs text-gray-700">
                  Status: {payment.status} - Check if COD approval needed
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 mt-4">
        <Link
          to={`/admin/payments/${paymentId}`}
          className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-sm"
        >
          <ExternalLink size={14} />
          View Details
        </Link>

        {/* Phase-2 Approval/Reject Buttons - FIXED LOGIC */}
        {canAdminApprove && !hasDelivery && (
          <>
            <button
              disabled={busy}
              onClick={handleReject}
              className="px-3 py-2 rounded text-white bg-rose-600 hover:bg-rose-700 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Reject
            </button>

            <button
              disabled={busy}
              onClick={handleApprove}
              className={`px-3 py-2 rounded text-white flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {getApprovalButtonLabel(payment)}
            </button>
          </>
        )}
        
        {/* Already approved state */}
        {hasDelivery && (
          <div className="px-3 py-2 rounded bg-green-100 text-green-800 text-sm flex items-center gap-1">
            <CheckCircle2 size={14} />
            Approved
          </div>
        )}
        
        {/* Final/rejected state */}
        {!canAdminApprove && !hasDelivery && payment.status === 'rejected' && (
          <div className="px-3 py-2 rounded bg-red-100 text-red-800 text-sm flex items-center gap-1">
            <XCircle size={14} />
            Rejected
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right">
        {typeof value === 'string' ? value : value}
      </span>
    </div>
  );
}