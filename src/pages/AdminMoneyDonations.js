// ✅ FILE: src/pages/AdminMoneyDonations.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { isAdmin } from "../utils/adminUtils";
import {
  adminVerifyMoneyDonation,
  adminGetMoneyDonationsQueue,
  ping,
} from "../services/functionsApi";
import toast from "react-hot-toast";
import { Menu, X, Home, ChevronRight, ArrowLeft } from "lucide-react";

export default function AdminMoneyDonations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---------------- Load Donation ---------------- */
  useEffect(() => {
    const loadDonation = async () => {
      try {
        setLoading(true);
        const ok = await isAdmin();
        if (!ok) {
          navigate("/unauthorized");
          return;
        }

        const res = await adminGetMoneyDonationsQueue();
        const target = res?.donations?.find((d) => d.id === id);
        if (!target) {
          setError("Donation not found.");
          setDonation(null);
          setLoading(false);
          return;
        }

        setDonation(target);
      } catch (err) {
        console.error("Load failed:", err);
        setError(err.message || "Failed to load donation record");
      } finally {
        setLoading(false);
      }
    };
    loadDonation();
  }, [id, navigate]);

  /* ---------------- Helpers ---------------- */
  const formatAmount = (a) => {
    try {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(a ?? 0);
    } catch {
      return `${a ?? 0} JPY`;
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    const d = new Date(v.seconds ? v.seconds * 1000 : v);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("ja-JP", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  /* ---------------- Status Change ---------------- */
  const handleStatusChange = async (newStatus) => {
    if (!donation) return;
    const verify = newStatus === "verified";
    if (
      !window.confirm(
        `Are you sure you want to mark this donation as "${newStatus}"?`
      )
    )
      return;

    try {
      setUpdating(true);
      const result = await adminVerifyMoneyDonation({
        donationId: donation.id,
        verify,
        note: verify ? "Donation verified by admin" : "Rejected by admin",
      });

      setDonation((prev) => ({
        ...prev,
        status: verify ? "verified" : "rejected",
        verifiedAt: new Date(),
      }));

      toast.success(
        result.ok
          ? `Donation marked as ${newStatus}.`
          : "Update completed."
      );
    } catch (err) {
      console.error("Failed to update donation:", err);
      toast.error("Failed to update donation status.");
    } finally {
      setUpdating(false);
    }
  };

  /* ---------------- Health Check ---------------- */
  const runHealthCheck = async () => {
    try {
      const res = await ping();
      setDebug((d) => ({ ...(d || {}), health: res, _tsPing: Date.now() }));
    } catch (e) {
      setDebug((d) => ({
        ...(d || {}),
        healthError: {
          code: e?.code || String(e),
          message: e?.message || "Ping failed",
        },
        _tsPing: Date.now(),
      }));
    }
  };

  /* ---------------- Loading/Error ---------------- */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading donation…
      </div>
    );

  if (error)
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );

  if (!donation) return null;

  /* ---------------- Render ---------------- */
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold tracking-wide">Admin Panel</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">
            🏠 Dashboard
          </Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded hover:bg-white/10">
            📋 Requests
          </Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">
            🎁 Items
          </Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded hover:bg-white/10">
            💰 Payments
          </Link>
          <Link
            to="/admin/money-donations"
            className="block px-3 py-2 rounded bg-white/20"
          >
            ❤️ Money Donations
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">
            👥 Users
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center gap-3">
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
              <ChevronRight size={14} className="mx-1" />
              <Link to="/admin/money-donations" className="hover:text-indigo-600">
                Money Donations
              </Link>
              <ChevronRight size={14} className="mx-1" />
              <span className="text-gray-800 font-medium truncate">
                Details / {id?.slice(0, 10)}…
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/money-donations"
              className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <ArrowLeft size={12} /> Back to Queue
            </Link>
            <button
              onClick={runHealthCheck}
              className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Ping
            </button>
          </div>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8">
            <h1 className="text-2xl font-bold mb-6">Donation Details</h1>

            {/* Donation Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
              <div>
                <div className="text-gray-500">Donation ID</div>
                <div className="font-mono">{donation.id}</div>
              </div>
              <div>
                <div className="text-gray-500">User</div>
                <div className="font-medium">
                  {donation.userName || "Anonymous"}
                </div>
                <div className="text-gray-500">{donation.userEmail || "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">Amount</div>
                <div className="font-semibold">
                  {formatAmount(donation.amountJPY)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs ${
                    donation.status === "verified"
                      ? "bg-green-100 text-green-800"
                      : donation.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : donation.status === "reported"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {donation.status || "Pending"}
                </span>
              </div>
              <div>
                <div className="text-gray-500">Created</div>
                <div>{formatDate(donation.createdAt)}</div>
              </div>
            </div>

            {/* Message */}
            <div className="mb-6">
              <div className="text-gray-500 mb-1">Message</div>
              <div className="italic text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                {donation.message || "—"}
              </div>
            </div>

            {/* Proof */}
            {donation.proofUrl && (
              <div className="mb-6">
                <div className="text-gray-500 mb-2">Proof of Donation</div>
                <a
                  href={donation.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={donation.proofUrl}
                    alt="Proof"
                    className="rounded border border-gray-300 shadow-sm max-h-80 object-contain"
                  />
                </a>
              </div>
            )}

            {/* Alert */}
            {donation.status === "reported" && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 text-sm text-blue-800">
                ⚠️ User submitted payment proof. Please verify and mark as
                “Verified” or “Rejected.”
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                disabled={updating}
                onClick={() => handleStatusChange("verified")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Mark as Verified
              </button>
              <button
                disabled={updating}
                onClick={() => handleStatusChange("rejected")}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject Donation
              </button>
            </div>

            {/* Debug Info */}
            {debug && (
              <pre className="bg-gray-50 border border-gray-200 text-gray-700 text-xs p-3 rounded mt-6 overflow-auto">
                {JSON.stringify(debug, null, 2)}
              </pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
