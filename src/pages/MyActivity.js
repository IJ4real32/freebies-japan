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
import { Trash, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  reportDeposit,
  getPaymentDetails,
} from "../services/functionsApi";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------
 * Confirm Modal
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
 * Shared Detail Drawer
 * ------------------------------------------------------------------ */
const DetailDrawer = ({ open, onClose, data, type, onActions = {} }) => {
  const [imageIndex, setImageIndex] = useState(0);
  if (!open || !data) return null;

  const images = data.images || [data.itemImage || "/default-item.jpg"];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end md:items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:w-[80%] lg:w-[60%] max-h-[85vh] md:max-h-[70vh] rounded-t-2xl md:rounded-2xl shadow-xl overflow-y-auto animate-slideUp p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={22} />
        </button>

        {/* Image carousel */}
        <div className="relative w-full h-52 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
          {images.length ? (
            <>
              <img
                src={images[imageIndex]}
                alt="Item"
                className="object-contain w-full h-full"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImageIndex((i) =>
                        (i - 1 + images.length) % images.length
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setImageIndex((i) => (i + 1) % images.length)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-400 text-sm">No Image</span>
          )}
        </div>

        {/* Content */}
        <h2 className="text-lg font-semibold mb-1 text-gray-800">
          {data.title || data.itemName || "Untitled"}
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          {data.description || "No description"}
        </p>

        {type === "donation" && (
          <>
            <p className="text-sm text-gray-700 mb-2">
              Category:{" "}
              <span className="font-medium">
                {data.category || data.itemCategory}
              </span>
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Status:{" "}
              <span className="font-medium">{data.status || "active"}</span>
            </p>
            {data.price && (
              <p className="text-sm text-gray-700 mb-2">
                Price: ¥{data.price?.toLocaleString()}
              </p>
            )}
          </>
        )}

        {type === "request" && (
          <p className="text-sm text-gray-700 mb-2">
            Status:{" "}
            <span className="font-medium">{data.status || "pending"}</span>
          </p>
        )}

        {type === "premium" && (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              Amount: <b>¥{data.amountJPY?.toLocaleString() || "—"}</b>
            </p>
            <p>Status: {data.status || "pending"}</p>
            <p>ID: {data.id}</p>
            <p className="text-xs text-gray-500 mt-2">
              Receipt not visible to users.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-3">
          {onActions.stop && (
            <button
              onClick={onActions.stop}
              className="text-sm px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            >
              Stop Requests
            </button>
          )}
          {onActions.edit && (
            <button
              onClick={onActions.edit}
              className="text-sm px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Edit Description
            </button>
          )}
          {onActions.delete && (
            <button
              onClick={onActions.delete}
              className="text-sm px-3 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
            >
              Delete
            </button>
          )}
          {onActions.report && (
            <button
              onClick={onActions.report}
              className="text-sm px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Report Deposit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * Main Component
 * ------------------------------------------------------------------ */
export default function MyActivity() {
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [premiumPayments, setPremiumPayments] = useState([]);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [confirmData, setConfirmData] = useState(null);
  const [drawer, setDrawer] = useState({ open: false, data: null, type: null });
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  /* Banner height adjustment */
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

  /* Tabs by URL param */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["requests", "donations", "premium"].includes(tab))
      setActiveTab(tab);
  }, [location.search]);

  /* Real-time listeners */
  useEffect(() => {
    if (!currentUser?.uid) return;
    const qReq = query(collection(db, "requests"), where("userId", "==", currentUser.uid));
    const unsubReq = onSnapshot(qReq, async (snap) => {
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

    const qDon = query(collection(db, "donations"), where("donorId", "==", currentUser.uid));
    const unsubDon = onSnapshot(qDon, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDonations(rows);
    });

    const qPay = query(collection(db, "payments"), where("userId", "==", currentUser.uid));
    const unsubPay = onSnapshot(qPay, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPremiumPayments(list);
    });

    return () => {
      unsubReq();
      unsubDon();
      unsubPay();
    };
  }, [currentUser?.uid]);

  /* Helpers */
  const askConfirm = (message, fn) => setConfirmData({ message, fn });
  const closeConfirm = () => setConfirmData(null);
  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate?.() || new Date(ts);
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const handleDeleteDonation = (id) =>
    askConfirm("Delete this donation?", async () => {
      await deleteDoc(doc(db, "donations", id));
      toast.success("Donation deleted.");
      closeConfirm();
    });

  const handleStopDonation = (id) =>
    askConfirm("Stop accepting requests?", async () => {
      await updateDoc(doc(db, "donations", id), {
        status: "closed",
        stoppedAt: serverTimestamp(),
      });
      toast("Donation stopped.", { icon: "🛑" });
      closeConfirm();
    });

  const handleEditDonation = (id, desc) =>
    askConfirm("Edit your donation description?", async () => {
      const newDesc = window.prompt("Enter new description:", desc || "");
      if (newDesc?.trim()) {
        await updateDoc(doc(db, "donations", id), {
          description: newDesc.trim(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Description updated!");
      }
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

  /* Renderers */
  const renderDonations = () =>
    !donations.length ? (
      <p className="text-center text-gray-600">No donations yet.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {donations.map((d) => (
          <div key={d.id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
            <img
              src={d.images?.[0] || "/default-item.jpg"}
              alt={d.title}
              className="w-full h-40 object-cover rounded-lg mb-2"
            />
            <h3 className="font-semibold text-gray-800">{d.title}</h3>
            <p className="text-xs text-gray-500 mb-1">{d.category}</p>
            <div className="flex justify-between items-center">
              <button
                onClick={() =>
                  setDrawer({ open: true, data: d, type: "donation" })
                }
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Details
              </button>
              <button
                onClick={() => handleDeleteDonation(d.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );

  const renderRequests = () =>
    !requests.length ? (
      <p className="text-center text-gray-600">No requests found.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {requests.map((r) => (
          <div key={r.id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
            <img
              src={r.itemImage}
              alt={r.itemName}
              className="w-full h-40 object-cover rounded-lg mb-2"
            />
            <h3 className="font-semibold text-gray-800">{r.itemName}</h3>
            <p className="text-xs text-gray-500 mb-1">{r.itemCategory}</p>
            <div className="flex justify-between items-center">
              <button
                onClick={() =>
                  setDrawer({ open: true, data: r, type: "request" })
                }
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Details
              </button>
              <button
                onClick={() => askConfirm("Delete this request?", async () => {
                  await deleteDoc(doc(db, "requests", r.id));
                  toast.success("Request deleted.");
                  closeConfirm();
                })}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );

  const renderPremium = () =>
    !premiumPayments.length ? (
      <p className="text-center text-gray-600">No premium deposits found.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {premiumPayments.map((p) => (
          <div
            key={p.id}
            className="bg-white p-4 rounded-xl shadow border border-gray-100"
          >
            <div className="font-semibold text-gray-800 mb-1">
              {p.itemTitle || "Deposit"}
            </div>
            <p className="text-sm text-gray-600 mb-1">
              ¥{p.amountJPY?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={() =>
                  setDrawer({ open: true, data: p, type: "premium" })
                }
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Details
              </button>
              <button
                onClick={() => onReportDeposit(p)}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700"
              >
                Report
              </button>
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <div
      className="min-h-screen bg-gray-50 relative w-full overflow-x-hidden transition-all duration-200 ease-in-out"
      style={{ paddingTop: `${bannerHeight}px` }}
    >
      <div className="subscription-banner fixed top-0 left-0 w-full z-40">
        <SubscriptionBanner />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 py-3 px-4 sticky top-0 z-30 flex justify-center shadow-sm">
        <div className="flex gap-4 overflow-x-auto">
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

      <DetailDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, data: null, type: null })}
        data={drawer.data}
        type={drawer.type}
        onActions={{
          delete:
            drawer.type === "donation"
              ? () => handleDeleteDonation(drawer.data.id)
              : drawer.type === "premium"
              ? () => toast("User cannot delete verified deposits.")
              : null,
          stop:
            drawer.type === "donation"
              ? () => handleStopDonation(drawer.data.id)
              : null,
          edit:
            drawer.type === "donation"
              ? () => handleEditDonation(drawer.data.id, drawer.data.description)
              : null,
          report:
            drawer.type === "premium"
              ? () => onReportDeposit(drawer.data)
              : null,
        }}
      />
    </div>
  );
}

/* Animations */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-fadeIn { animation: fadeIn 0.25s ease-out; }
.animate-slideUp { animation: slideUp 0.3s ease-out; }
`;
document.head.appendChild(style);
