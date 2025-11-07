// ✅ FILE: src/pages/MyActivity.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  Trash,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import { motion, AnimatePresence } from "framer-motion";

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
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Confirm Action
      </h3>
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
 * Detail Drawer (simplified for clarity)
 * ------------------------------------------------------------------ */
const DetailDrawer = ({ open, onClose, data, type }) => {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (open) setImageIndex(0);
  }, [open, data]);

  if (!open || !data) return null;
  const images = data.images || [data.itemImage || "/images/default-item.jpg"];

  const steps = [
    { key: "approved", label: "Approved", color: "bg-green-600" },
    { key: "processing", label: "Processing", color: "bg-purple-600" },
    { key: "out_for_delivery", label: "Out for Delivery", color: "bg-yellow-500" },
    { key: "delivered", label: "Delivered", color: "bg-blue-600" },
  ];
  const currentIndex = steps.findIndex(
    (s) => s.key === (data.status || "").toLowerCase()
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center items-end z-50 md:items-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:w-[80%] lg:w-[60%] max-h-[85vh] rounded-t-2xl md:rounded-2xl shadow-xl overflow-y-auto animate-slideUp p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
        >
          <X size={20} />
        </button>

        <div className="relative w-full h-44 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
          <img
            src={images[imageIndex]}
            onError={(e) => (e.currentTarget.src = "/images/default-item.jpg")}
            alt="Item"
            className="object-contain w-full h-full"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((i) => (i - 1 + images.length) % images.length);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((i) => (i + 1) % images.length);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60 transition"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        <h2 className="text-lg font-semibold mb-1 text-gray-800 pr-10">
          {data.title || data.itemTitle || "Untitled"}
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          {data.description || "No description available."}
        </p>

        {/* Stepper for approved/premium only */}
        {["premium", "requests"].includes(type) &&
        ["approved", "processing", "out_for_delivery", "delivered"].includes(
          (data.status || "").toLowerCase()
        ) ? (
          <div className="mt-4">
            <div className="flex flex-col gap-2 mt-2">
              {steps.map((step, i) => {
                const isActive = i <= currentIndex;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-full ${
                        isActive
                          ? `${step.color} text-white`
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isActive && <CheckCircle size={14} />}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive
                          ? "text-gray-900 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              💡 You'll be notified as delivery progresses.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-700 mb-1">
            Status: <b>{data.status || "pending"}</b>
          </p>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * Main Page
 * ------------------------------------------------------------------ */
export default function MyActivity() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("requests");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [premiumItems, setPremiumItems] = useState([]);
  const [drawer, setDrawer] = useState({ open: false, data: null, type: null });
  const [confirmData, setConfirmData] = useState(null);

  /* Firestore listeners */
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubReq = onSnapshot(
      query(collection(db, "requests"), where("userId", "==", currentUser.uid)),
      async (snap) => {
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
              itemImage: itemData.images?.[0],
              itemName: itemData.title,
            };
          })
        );
        setRequests(rows);
      }
    );

    const unsubDon = onSnapshot(
      query(collection(db, "donations"), where("donorId", "==", currentUser.uid)),
      (snap) => setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubPremium = onSnapshot(
      query(
        collection(db, "donations"),
        where("donorId", "==", currentUser.uid),
        where("type", "==", "premium")
      ),
      (snap) =>
        setPremiumItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            itemImage: d.data().images?.[0],
            itemTitle: d.data().title,
          }))
        )
    );

    return () => {
      unsubReq();
      unsubDon();
      unsubPremium();
    };
  }, [currentUser?.uid]);

  /* Helpers */
  const askConfirm = (message, fn) => setConfirmData({ message, fn });
  const closeConfirm = () => setConfirmData(null);

  const handleDelete = async (ids, typeLabel) => {
    const batch = writeBatch(db);
    ids.forEach((id) =>
      batch.delete(
        doc(db, typeLabel === "requests" ? "requests" : "donations", id)
      )
    );
    await batch.commit();
    toast.success(`Deleted ${ids.length} ${typeLabel}.`);
    closeConfirm();
  };

  const filteredItems = useMemo(() => {
    const all =
      activeTab === "requests"
        ? requests
        : activeTab === "donations"
        ? donations
        : premiumItems;
    if (statusFilter === "all") return all;
    return all.filter(
      (i) => (i.status || "").toLowerCase() === statusFilter.toLowerCase()
    );
  }, [requests, donations, premiumItems, activeTab, statusFilter]);

  /* Render Filter Bar */
  const renderStatusFilter = () => {
    const statuses = [
      "all",
      "pending",
      "approved",
      "rejected",
      "expired",
      "delivered",
    ];
    return (
      <div className="flex overflow-x-auto gap-2 py-2 scrollbar-hide justify-center">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    );
  };

  /* Render Grid */
  const renderGrid = (items, type) =>
    !items.length ? (
      <p className="text-center text-gray-600 py-8 text-sm">No items yet.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 justify-center max-w-[900px] mx-auto">
        <AnimatePresence>
          {items.map((i) => (
            <motion.div
              key={i.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawer({ open: true, data: i, type })}
              whileHover={{ scale: 1.02 }}
              className="bg-white border border-gray-100 rounded-xl shadow-sm p-2 flex flex-col active:bg-gray-50 cursor-pointer relative"
            >
              <div className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden mb-2">
                <img
                  src={i.itemImage || i.images?.[0] || "/images/default-item.jpg"}
                  onError={(e) =>
                    (e.currentTarget.src = "/images/default-item.jpg")
                  }
                  alt={i.title || i.itemName || i.itemTitle || "Item"}
                  className="w-full h-full object-contain"
                />
              </div>

              <h3 className="text-xs sm:text-sm font-semibold text-gray-800 truncate mb-1">
                {i.title || i.itemName || i.itemTitle || "Untitled"}
              </h3>

              <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-500 mb-1">
                <span className="truncate">
                  {type === "premium"
                    ? `¥${(i.price || i.amountJPY)?.toLocaleString() || "—"}`
                    : i.category || i.itemCategory || ""}
                </span>
                <span
                  className={`${
                    i.status === "active"
                      ? "text-green-600"
                      : i.status === "pending"
                      ? "text-yellow-600"
                      : "text-gray-500"
                  } font-medium`}
                >
                  {i.status || "pending"}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  askConfirm(
                    "Delete this item?",
                    () => handleDelete([i.id], type)
                  );
                }}
                className="absolute top-2 right-2 bg-white/80 text-red-500 hover:text-red-700 rounded-full p-1 shadow-sm transition"
              >
                <Trash size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );

  /* Main */
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <SubscriptionBanner />

      {/* Tabs */}
      <div className="bg-white border-b py-2 sticky top-0 z-30">
        <div className="flex justify-around text-sm font-medium">
          {[
            { id: "requests", label: "My Requests" },
            { id: "donations", label: "My Donations" },
            { id: "premium", label: "Premium Deposits" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 relative transition-all duration-200 text-xs ${
                activeTab === t.id
                  ? "text-indigo-700 font-semibold"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              {t.label}
              <div
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-indigo-600 transition-all ${
                  activeTab === t.id ? "scale-100" : "scale-0"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Filter + Delete All */}
      {renderStatusFilter()}
      {statusFilter !== "all" && filteredItems.length > 0 && (
        <div className="flex justify-center mb-2">
          <button
            onClick={() =>
              askConfirm(
                `Delete all ${statusFilter} items?`,
                () =>
                  handleDelete(
                    filteredItems.map((x) => x.id),
                    activeTab
                  )
              )
            }
            className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs hover:bg-rose-200"
          >
            <Trash size={12} /> Delete All Filtered
          </button>
        </div>
      )}

      {/* Main Grid */}
      <main className="p-3 min-h-[60vh]">
        {activeTab === "requests" && renderGrid(filteredItems, "requests")}
        {activeTab === "donations" && renderGrid(filteredItems, "donations")}
        {activeTab === "premium" && renderGrid(filteredItems, "premium")}
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
      />
    </div>
  );
}

/* Basic animations */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp {from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
.animate-fadeIn{animation:fadeIn .25s ease-out}
.animate-slideUp{animation:slideUp .3s ease-out}
`;
document.head.appendChild(style);
