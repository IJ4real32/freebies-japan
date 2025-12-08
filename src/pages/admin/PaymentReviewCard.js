// ✅ FILE: src/pages/Admin/PaymentReviewCard.jsx (PHASE 2 — FINAL VERSION)
import React, { useEffect, useState, useCallback } from "react";
import {
  getPaymentDetails,
  adminApproveDeposit,
  adminRejectDeposit,
  markPaymentDelivered,
} from "../../services/functionsApi";

import { X, CheckCircle2, XCircle, ExternalLink, PackageCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function PaymentReviewCard({ paymentId, ticketId, onHandled }) {
  const [payment, setPayment] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(true);

  // -------------------------------------------------------
  // LOAD PAYMENT DETAILS (Phase 2 backend)
  // -------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      if (!paymentId) return;

      const res = await getPaymentDetails({ paymentId });

      if (res?.payment) {
        setPayment(res.payment);
        setReports(res.reports || []);
      } else {
        toast.error("Failed to load payment details.");
      }

      setLoading(false);
    };

    load();
  }, [paymentId]);

  // -------------------------------------------------------
  // COD — Mark Delivered
  // -------------------------------------------------------
  const handleCODDelivered = useCallback(async () => {
    if (!window.confirm("Mark this Cash On Delivery payment as delivered?")) return;
    setBusy(true);

    const res = await markPaymentDelivered({ paymentId });

    setBusy(false);

    if (res?.ok) {
      toast.success("COD marked as delivered.");
      setOpen(false);
      onHandled?.(paymentId, "delivered");
    } else {
      toast.error(res?.error || "Failed to update COD status.");
    }
  }, [paymentId, onHandled]);

  // -------------------------------------------------------
  // PREMIUM — Approve / Reject
  // -------------------------------------------------------
  const handleApprove = useCallback(async () => {
    if (!window.confirm("Approve this deposit?")) return;
    setBusy(true);

    const res = await adminApproveDeposit({
      paymentId,
      reportId: reports[0]?.id || null,
    });

    setBusy(false);

    if (res?.ok) {
      toast.success("Deposit approved.");
      setOpen(false);
      onHandled?.(paymentId, "approved");
    } else {
      toast.error(res?.error || "Approval failed.");
    }
  }, [paymentId, reports, onHandled]);

  const handleReject = useCallback(async () => {
    if (!window.confirm("Reject this deposit?")) return;

    setBusy(true);

    const res = await adminRejectDeposit({
      paymentId,
      reportId: reports[0]?.id || null,
      reason: note || "Unspecified",
    });

    setBusy(false);

    if (res?.ok) {
      toast.success("Deposit rejected.");
      setOpen(false);
      onHandled?.(paymentId, "rejected");
    } else {
      toast.error(res?.error || "Rejection failed.");
    }
  }, [paymentId, reports, note, onHandled]);

  // -------------------------------------------------------
  // VIEW — COD or DEPOSIT
  // -------------------------------------------------------
  if (!open) return null;

  if (loading) {
    return (
      <div className="p-4 border rounded bg-white text-sm text-gray-600">
        Loading payment…
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-4 border rounded bg-white text-sm text-gray-600">
        Payment not found.
      </div>
    );
  }

  const isCOD = payment.method === "cash_on_delivery";
  const proof = reports?.[0]?.proofUrl || payment.receiptUrl;

  return (
    <div className="rounded-xl border shadow-sm bg-white p-4">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-gray-500">Payment ID</div>
          <div className="font-mono text-sm">{paymentId}</div>

          {ticketId && (
            <>
              <div className="text-xs text-gray-500 mt-2">Ticket ID</div>
              <div className="font-mono text-xs text-gray-700">{ticketId}</div>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* INFO GRID */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Info label="Status" value={payment.status} />
          <Info label="Method" value={payment.method} />
          <Info
            label="Amount"
            value={`¥${payment.itemPriceJPY?.toLocaleString()}`}
          />
          <Info label="User" value={`${payment.userName} (${payment.userEmail})`} />
          <Info
            label="Created"
            value={new Date(payment.createdAt).toLocaleString()}
          />

          {/* Delivery Info */}
          {payment.deliveryInfo && (
            <div className="text-sm mt-2">
              <div className="text-gray-500 mb-1">Delivery Address</div>
              <div>{payment.deliveryInfo.address}</div>
              <div>{payment.deliveryInfo.zipCode}</div>
              <div>{payment.deliveryInfo.phone}</div>
            </div>
          )}
        </div>

        {/* RECEIPT / ITEM THUMBNAILS */}
        <div>
          {!isCOD && (
            <>
              <div className="text-sm text-gray-500 mb-1">Receipt</div>
              {proof ? (
                <a
                  href={proof}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <ExternalLink size={16} />
                  Open proof
                </a>
              ) : (
                <div className="text-sm text-gray-600">No receipt.</div>
              )}

              <div className="mt-3">
                <label className="text-sm text-gray-600">Admin Note</label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </>
          )}

          {isCOD && (
            <div className="text-sm text-gray-600 italic">
              Cash on Delivery — no proof required.
            </div>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-2 mt-4">
        {!isCOD && (
          <>
            <button
              disabled={busy}
              onClick={handleReject}
              className="px-3 py-2 rounded text-white bg-rose-600 hover:bg-rose-700"
            >
              <XCircle size={18} />
              Reject
            </button>

            <button
              disabled={busy}
              onClick={handleApprove}
              className="px-3 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 size={18} />
              Approve
            </button>
          </>
        )}

        {isCOD && (
          <button
            disabled={busy}
            onClick={handleCODDelivered}
            className="px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
          >
            <PackageCheck size={18} className="inline-block mr-1" />
            Mark Delivered
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
