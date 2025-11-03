// ✅ FILE: src/pages/MyActivity.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import DeliveryForm from "../components/DeliveryForm";
import { useTranslation } from "../hooks/useTranslation";
import { Trash, Search, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { reportDeposit, getPaymentDetails } from "../services/functionsApi";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------
 * Simple Confirm Modal
 * ------------------------------------------------------------------ */
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-[90%] p-6 text-center relative animate-fadeIn">
      <button
        onClick={onCancel}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
      >
        <X size={18} />
      </button>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Action</h3>
      <p className="text-sm text-gray-600 mb-5">{message}</p>
      <div className="flex justify-center gap-4">
        <button
          onClick={onConfirm}
          className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-medium transition"
        >
          Yes
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg font-medium transition"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------
 * Main MyActivity Component
 * ------------------------------------------------------------------ */
export default function MyActivity() {
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [premiumPayments, setPremiumPayments] = useState([]);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [confirmData, setConfirmData] = useState(null);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  /* ------------------------------------------------------------------
   * Layout: adjust banner height
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const banner = document.querySelector(".subscription-banner");
    if (!banner) return;
    const update = () => setBannerHeight(banner.offsetHeight || 0);
    const ro = new ResizeObserver(update);
    ro.observe(banner);
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: true });
    update();
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  /* ------------------------------------------------------------------
   * URL ?tab param
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["requests", "donations", "premium"].includes(tab)) setActiveTab(tab);
  }, [location.search]);

  /* ------------------------------------------------------------------
   * Real-time: Requests
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!currentUser?.uid) return;
    const qReq = query(collection(db, "requests"), where("userId", "==", currentUser.uid));
    const unsub = onSnapshot(qReq, async (snap) => {
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const r = d.data();
          let itemData = {};
          if (r.itemId) {
            try {
              const itemDoc = await getDoc(doc(db, "donations", r.itemId));
              if (itemDoc.exists()) itemData = itemDoc.data();
            } catch {}
          }
          return {
            id: d.id,
            ...r,
            itemImage: itemData.images?.[0] || "/default-item.jpg",
            itemName: itemData.title || "Untitled Item",
            itemCategory: itemData.category || "",
          };
        })
      );
      setRequests(rows);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  /* ------------------------------------------------------------------
   * Real-time: Donations
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!currentUser?.uid) return;
    const qDon = query(collection(db, "donations"), where("donorId", "==", currentUser.uid));
    const unsub = onSnapshot(qDon, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDonations(rows);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  /* ------------------------------------------------------------------
   * Real-time: Premium Payments
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!currentUser?.uid) return;
    const qPay = query(collection(db, "payments"), where("userId", "==", currentUser.uid));
    const unsub = onSnapshot(qPay, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPremiumPayments(list);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  const canEditAddress = (submittedAt) => {
    if (!submittedAt) return true;
    const when = submittedAt?.toDate?.() || new Date(submittedAt);
    return Date.now() - when.getTime() < 86400000;
  };

  const formatDate = (ts) => {
    if (!ts) return null;
    const d = ts?.toDate?.() || new Date(ts);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCountdown = (endAt) => {
    if (!endAt) return "";
    const end = endAt.toMillis ? endAt.toMillis() : new Date(endAt).getTime();
    const diff = Math.max(0, end - Date.now());
    const hrs = Math.floor(diff / 1000 / 3600);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    return diff <= 0 ? "⏰ Expired" : `${hrs}h ${mins}m left`;
  };

  const statusBadge = (s) => {
    switch (s) {
      case "approved":
      case "selected":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-purple-100 text-purple-800";
      case "out_for_delivery":
        return "bg-yellow-100 text-yellow-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      case "rejected":
      case "not_selected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /* ------------------------------------------------------------------
   * Confirm Actions
   * ------------------------------------------------------------------ */
  const askConfirm = (message, fn) => setConfirmData({ message, fn });
  const closeConfirm = () => setConfirmData(null);

  const handleDeleteRequest = (id) =>
    askConfirm("Delete this request?", async () => {
      await deleteDoc(doc(db, "requests", id));
      toast.success("Request deleted.");
      closeConfirm();
    });

  const handleDeleteDonation = (id) =>
    askConfirm("Delete this donation permanently?", async () => {
      await deleteDoc(doc(db, "donations", id));
      toast.success("Donation deleted.");
      closeConfirm();
    });

  const handleStopDonation = (id) =>
    askConfirm("Stop accepting requests for this donation?", async () => {
      await updateDoc(doc(db, "donations", id), {
        status: "closed",
        stoppedAt: serverTimestamp(),
      });
      toast("Donation stopped.", { icon: "🛑" });
      closeConfirm();
    });

  const handleEditDonation = (id, oldDesc) =>
    askConfirm("Edit your donation description?", async () => {
      const newDesc = window.prompt("Enter new description:", oldDesc || "");
      if (newDesc && newDesc.trim()) {
        await updateDoc(doc(db, "donations", id), {
          description: newDesc.trim(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Description updated!");
      }
      closeConfirm();
    });

  const handleAddressSubmit = async (requestId, deliveryData) => {
    await updateDoc(doc(db, "requests", requestId), {
      deliveryInfo: { ...deliveryData, submittedAt: serverTimestamp() },
      status: "processing",
      lastStatusUpdate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setEditingRequestId(null);
    toast.success("Delivery info saved.");
  };

  const handleDeletePayment = (id) =>
    askConfirm("Delete this completed deposit?", async () => {
      await deleteDoc(doc(db, "payments", id));
      toast.success("Deposit deleted.");
      closeConfirm();
    });

  const onReportDeposit = async (p) => {
    const ref = window.prompt("Enter bank reference:");
    const note = window.prompt("Add a note:");
    if (ref === null && note === null) return;
    await reportDeposit({ paymentId: p.paymentId || p.id, reference: ref, note });
    const details = await getPaymentDetails({ paymentId: p.paymentId || p.id });
    if (details?.payment)
      setPremiumPayments((list) =>
        list.map((x) => (x.id === p.id ? { ...x, ...details.payment } : x))
      );
    toast.success("Report submitted.");
  };

  /* ------------------------------------------------------------------
   * Renderers
   * ------------------------------------------------------------------ */
  const renderDonations = () =>
    !donations.length ? (
      <p className="text-center text-gray-600">No donations yet.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {donations.map((d) => {
          const expired =
            d.requestWindowEnd &&
            new Date(
              d.requestWindowEnd.toMillis
                ? d.requestWindowEnd.toMillis()
                : d.requestWindowEnd
            ).getTime() <= Date.now();
          return (
            <div
              key={d.id}
              className="bg-white p-4 rounded-xl shadow flex flex-col gap-2 border border-gray-100"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {d.title || "Untitled Donation"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {d.category || "Uncategorized"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteDonation(d.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Status: <span className="font-medium">{d.status || "open"}</span>
              </p>
              {d.requestWindowEnd && (
                <p className="text-xs text-gray-500">
                  🕒 {formatCountdown(d.requestWindowEnd)}
                </p>
              )}

              {d.status === "open" && !expired && (
                <div className="flex gap-3 mt-2 flex-wrap">
                  <button
                    onClick={() => handleStopDonation(d.id)}
                    className="text-sm px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  >
                    Stop Requests
                  </button>
                  <button
                    onClick={() => handleEditDonation(d.id, d.description)}
                    className="text-sm px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Edit Description
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

  const renderRequests = () => (
    !requests.length ? (
      <p className="text-center text-gray-600">No requests found.</p>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl shadow bg-white overflow-hidden p-4 border border-gray-100"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <img
                src={r.itemImage}
                alt={r.itemName}
                className="w-full sm:w-32 h-32 object-cover rounded-lg"
                onError={(e) => (e.currentTarget.src = "/default-item.jpg")}
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h2 className="text-base sm:text-lg font-semibold">
                    {r.itemName}
                  </h2>
                  <button
                    onClick={() => handleDeleteRequest(r.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash size={18} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm ${statusBadge(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                  {r.lastStatusUpdate && (
                    <span className="text-xs text-gray-500">
                      🕒 {formatDate(r.lastStatusUpdate)}
                    </span>
                  )}
                </div>
                {(r.status === "approved" || r.status === "selected") && (
                  <div className="mt-4">
                    {r.deliveryInfo ? (
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                        <div className="font-medium mb-1">Delivery Summary</div>
                        <div>
                          📦 ZIP: {r.deliveryInfo.zipCode} <br />
                          📍 {r.deliveryInfo.address}
                        </div>
                        {canEditAddress(r.deliveryInfo.submittedAt) && (
                          <button
                            onClick={() => setEditingRequestId(r.id)}
                            className="text-indigo-600 text-xs mt-2 underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingRequestId(r.id)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm mt-2 hover:bg-indigo-700"
                      >
                        Add delivery info
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {editingRequestId === r.id && (
              <DeliveryForm
                request={r}
                onSubmit={handleAddressSubmit}
                onCancel={() => setEditingRequestId(null)}
                existingData={r.deliveryInfo || {}}
              />
            )}
          </div>
        ))}
      </div>
    )
  );

  const renderPremium = () =>
    !premiumPayments.length ? (
      <p className="text-center text-gray-600">No premium deposits found.</p>
    ) : (
      <div className="divide-y rounded-2xl border bg-white overflow-hidden">
        {premiumPayments.map((p) => {
          const s = (p.status || "pending").toLowerCase();
          const badge =
            s === "approved" || s === "verified"
              ? "bg-emerald-100 text-emerald-800"
              : s === "rejected"
              ? "bg-red-100 text-red-800"
              : s === "reported"
              ? "bg-blue-100 text-blue-800"
              : "bg-yellow-100 text-yellow-800";
          return (
            <div
              key={p.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <div className="font-medium text-gray-800">
                  {p.itemTitle || p.title || "Deposit"}
                </div>
                <div className="text-xs text-gray-500">
                  ¥{p.amountJPY?.toLocaleString()} • {p.id}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs ${badge}`}>
                  {s}
                </span>
                <button
                  onClick={() => onReportDeposit(p)}
                  className={`text-sm px-3 py-1.5 rounded-full ${
                    ["pending", "reported"].includes(s)
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-200 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {s === "reported" ? "Update ref" : "Report deposit"}
                </button>
                {["approved", "verified", "rejected"].includes(s) && (
                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="text-sm px-3 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

  /* ------------------------------------------------------------------
   * UI
   * ------------------------------------------------------------------ */
  return (
    <div
      className="min-h-screen bg-gray-50 relative w-full overflow-x-hidden transition-all duration-200 ease-in-out"
      style={{ paddingTop: `${bannerHeight}px` }}
    >
      <div className="subscription-banner fixed top-0 left-0 w-full z-40 transition-all duration-200">
        <SubscriptionBanner />
      </div>

      {/* Tabs */}
      <div className="bg-white/90 backdrop-blur border-b border-gray-100 py-3 px-4 sticky top-0 z-30 shadow-sm flex justify-center">
        <div className="flex gap-4 border-b border-gray-200 justify-center overflow-x-auto">
          {[
            { id: "requests", label: "My Requests", icon: "📦" },
            { id: "donations", label: "My Donations", icon: "🎁" },
            { id: "premium", label: "Premium Deposits", icon: "💎" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 font-medium rounded-t-lg ${
                activeTab === t.id
                  ? "text-indigo-700 border-b-2 border-indigo-600 bg-white"
                  : "text-gray-500 hover:text-indigo-600"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="page-container py-4 sm:py-6 px-4 sm:px-6">
        {activeTab === "requests" && renderRequests()}
        {activeTab === "donations" && renderDonations()}
        {activeTab === "premium" && renderPremium()}
      </main>

      {confirmData && (
        <ConfirmModal
          message={confirmData.message}
          onConfirm={confirmData.fn}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}

/* Animation */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn { animation: fadeIn 0.2s ease-out; }
`;
document.head.appendChild(style);
