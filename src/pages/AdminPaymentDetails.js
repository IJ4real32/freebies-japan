// ✅ FILE: src/pages/AdminPaymentDetails.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import Navbar from "../components/UI/Navbar";
import BackToDashboardButton from "../components/Admin/BackToDashboardButton";
import { isAdmin } from "../utils/adminUtils";

// ---- helpers ------------------------------------------------------
const formatAmount = (amount, currency = "JPY") => {
  try {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount ?? 0);
  } catch {
    return `${amount ?? 0} ${currency}`;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "awaiting_approval": return "bg-blue-100 text-blue-800";
    case "approved": return "bg-green-100 text-green-800";
    case "rejected": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function AdminPaymentDetails() {
  const { id: paymentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [reports, setReports] = useState([]);
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);

  const latestReport = useMemo(() => (reports && reports.length ? reports[0] : null), [reports]);

  const fetchDetails = useCallback(async () => {
    const getPaymentDetails = httpsCallable(functions, "getPaymentDetails");
    const res = await getPaymentDetails({ paymentId });
    const data = res?.data || {};
    setPayment(data.payment || null);
    setReports(data.reports || []);
    setItem(data.item || null);
    setDebug({
      exists: !!data?.payment,
      reportCount: (data?.reports || []).length,
      hasItem: !!data?.item,
    });
  }, [paymentId]);

  useEffect(() => {
    (async () => {
      const ok = await isAdmin();
      if (!ok) { navigate("/unauthorized"); return; }
      try {
        setLoading(true);
        setError(null);
        await fetchDetails();
      } catch (e) {
        setError(e?.message || "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId, navigate, fetchDetails]);

  const handleApprove = async () => {
    if (!latestReport) return window.alert("No report to approve.");
    if (!window.confirm("Approve this deposit report?")) return;
    try {
      const call = httpsCallable(functions, "approveDeposit");
      await call({ paymentId, reportId: latestReport.id });
      await fetchDetails();
    } catch (e) {
      window.alert(e?.message || "Approval failed");
    }
  };

  const handleReject = async () => {
    if (!latestReport) return window.alert("No report to reject.");
    const reason = window.prompt("Reason (optional):") || undefined;
    try {
      const call = httpsCallable(functions, "rejectDeposit");
      await call({ paymentId, reportId: latestReport.id, reason });
      await fetchDetails();
    } catch (e) {
      window.alert(e?.message || "Rejection failed");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar isTransparent={false} hideOnAdmin />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <BackToDashboardButton />
          <div className="h-64 grid place-items-center text-gray-600">Loading payment…</div>
        </div>
      </>
    );
  }

  if (error || !payment) {
    return (
      <>
        <Navbar isTransparent={false} hideOnAdmin />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <BackToDashboardButton />
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || "Payment not found"}
          </div>
          {debug && (
            <pre className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded mt-3 overflow-auto">
              {JSON.stringify(debug, null, 2)}
            </pre>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar isTransparent={false} hideOnAdmin />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <BackToDashboardButton />

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Payment Details</h1>
          <button
            className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            onClick={() => navigate("/admin/payments")}
          >
            Back to queue
          </button>
        </div>

        {/* Summary card */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div><b>ID:</b> {payment.id || payment.paymentId}</div>
            <div><b>User:</b> {payment.userName || "Unknown"}</div>
            <div><b>Email:</b> {payment.userEmail || "—"}</div>
            <div><b>Amount:</b> {formatAmount(payment.amount, payment.currency || "JPY")}</div>
            <div className="capitalize"><b>Type:</b> {payment.type || payment.paymentType}</div>
            <div>
              <b>Status:</b>{" "}
              <span className={`px-2 py-0.5 rounded-full ${getStatusBadgeClass(payment.status)}`}>
                {payment.status}
              </span>
            </div>
            <div><b>Created:</b> {formatDate(payment.createdAt)}</div>
          </div>
        </div>

        {/* ✅ Delivery address (hydrated + last updated) */}
        {payment.address && (
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-3">Delivery Address</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><b>Recipient:</b> {payment.address.recipientName || "—"}</div>
              <div><b>Phone:</b> {payment.address.phone || "—"}</div>
              <div><b>Postal Code:</b> {payment.address.postalCode || "—"}</div>
              <div><b>Prefecture:</b> {payment.address.prefecture || "—"}</div>
              <div><b>City:</b> {payment.address.city || "—"}</div>
              <div><b>Street:</b> {payment.address.street || "—"}</div>
              {payment.address.building && <div><b>Building:</b> {payment.address.building}</div>}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Last updated: {formatDate(payment.updatedAt)}
            </div>
          </div>
        )}

        {/* Item details */}
        {item && (
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-3">Item Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><b>Title:</b> {item.title || "—"}</div>
              <div><b>Price:</b> {formatAmount(item.priceJPY, "JPY")}</div>
              <div><b>Category:</b> {item.category || "—"}</div>
              <div><b>Owner ID:</b> {item.userId || "—"}</div>
              <div><b>Item Created:</b> {formatDate(item.createdAt)}</div>
            </div>
            {Array.isArray(item.images) && item.images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {item.images.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="item" className="w-full h-28 object-cover rounded" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Latest report quick actions */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-3">Latest Report</h2>
          {!latestReport ? (
            <div className="text-sm text-gray-500">No deposit report submitted.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><b>Status:</b> {latestReport.status}</div>
                <div><b>Reported:</b> {formatDate(latestReport.createdAt || latestReport.when)}</div>
                <div><b>Depositor:</b> {latestReport.depositorName || latestReport.transferName || "—"}</div>
                <div><b>Payment Code:</b> {latestReport.paymentCode || latestReport.txId || "—"}</div>
                {typeof latestReport.amount === "number" && (
                  <div><b>Reported Amount:</b> {formatAmount(latestReport.amount, payment.currency || "JPY")}</div>
                )}
              </div>
              {Array.isArray(latestReport.proofUrls) && latestReport.proofUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {latestReport.proofUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="proof" className="w-full h-28 object-cover rounded" />
                    </a>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                  onClick={handleApprove}
                >
                  Approve
                </button>
                <button
                  className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
                  onClick={handleReject}
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>

        {/* Report history */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Report History</h2>
          {reports.length === 0 ? (
            <div className="text-sm text-gray-500">No reports.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Depositor</th>
                    <th className="px-3 py-2">Payment Code</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{formatDate(r.createdAt || r.when)}</td>
                      <td className="px-3 py-2">{r.status || "pending"}</td>
                      <td className="px-3 py-2">{r.depositorName || r.transferName || "—"}</td>
                      <td className="px-3 py-2">{r.paymentCode || r.txId || "—"}</td>
                      <td className="px-3 py-2">
                        {typeof r.amount === "number"
                          ? formatAmount(r.amount, payment.currency || "JPY")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {debug && (
          <pre className="bg-gray-50 border text-gray-700 text-xs p-3 rounded mt-6 overflow-auto">
            {JSON.stringify(debug, null, 2)}
          </pre>
        )}
      </div>
    </>
  );
}
