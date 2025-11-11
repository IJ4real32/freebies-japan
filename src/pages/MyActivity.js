// ✅ FILE: src/pages/MyActivity.jsx (Lazy-load + Fade-in Images)
import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
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
 * Drawer with delivery range & size
 * ------------------------------------------------------------------ */
const DetailDrawer = ({ open, onClose, data }) => {
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    if (open) setImageIndex(0);
  }, [open, data]);

  if (!open || !data) return null;
  const images = data.images || [data.itemImage || "/images/default-item.jpg"];

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

        {/* Image Carousel */}
        <div className="relative w-full h-44 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
          <img
            src={images[imageIndex]}
            onError={(e) => (e.currentTarget.src = "/images/default-item.jpg")}
            alt="Item"
            className="object-contain w-full h-full fade-in"
            loading="lazy"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((i) => (i - 1 + images.length) % images.length);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((i) => (i + 1) % images.length);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
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

        {/* 🚚 Delivery Info */}
        {data.estimatedDelivery && (
          <div className="bg-indigo-50 text-indigo-700 text-sm px-3 py-2 rounded-lg mb-3 flex items-center justify-between">
            <span className="font-medium">Estimated Delivery Range:</span>
            <span className="font-semibold">
              ¥{data.estimatedDelivery.min?.toLocaleString()}–¥
              {data.estimatedDelivery.max?.toLocaleString()}
            </span>
          </div>
        )}
        {data.size && (
          <p className="text-xs text-gray-500 mb-4">
            📦 Item Size: <b className="capitalize">{data.size}</b>
          </p>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * Main Page (Unified image and item fetch logic)
 * ------------------------------------------------------------------ */
export default function MyActivity() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("requests");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [premiumDeposits, setPremiumDeposits] = useState([]);
  const [drawer, setDrawer] = useState({ open: false, data: null });
  const [confirmData, setConfirmData] = useState(null);

  /* ✅ Fetch all item types with unified image logic */
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Requests
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
              ...itemData,
              itemImage: itemData.images?.[0],
            };
          })
        );
        setRequests(rows);
      }
    );

    // Donations
    const unsubDon = onSnapshot(
      query(collection(db, "donations"), where("donorId", "==", currentUser.uid)),
      (snap) =>
        setDonations(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            itemImage: d.data().images?.[0],
          }))
        )
    );

    // Premium Deposits
    const unsubPrem = onSnapshot(
      query(
        collection(db, "donations"),
        where("donorId", "==", currentUser.uid),
        where("type", "==", "premium")
      ),
      (snap) =>
        setPremiumDeposits(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            itemImage: d.data().images?.[0],
          }))
        )
    );

    return () => {
      unsubReq();
      unsubDon();
      unsubPrem();
    };
  }, [currentUser?.uid]);

  const askConfirm = (message, fn) => setConfirmData({ message, fn });
  const closeConfirm = () => setConfirmData(null);

  const handleDelete = async (ids, collectionName) => {
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, collectionName, id)));
    await batch.commit();
    toast.success(`Deleted ${ids.length} item(s).`);
    closeConfirm();
  };

  const filteredItems = useMemo(() => {
    const all =
      activeTab === "requests"
        ? requests
        : activeTab === "donations"
        ? donations
        : premiumDeposits;
    if (statusFilter === "all") return all;
    return all.filter(
      (i) => (i.status || "").toLowerCase() === statusFilter.toLowerCase()
    );
  }, [requests, donations, premiumDeposits, activeTab, statusFilter]);

  /* UI */
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
              className={`flex-1 py-2 relative text-xs ${
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

      {/* Filter */}
      <div className="flex overflow-x-auto gap-2 py-2 scrollbar-hide justify-center">
        {["all", "pending", "approved", "awarded", "delivered"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <main className="p-3 min-h-[60vh]">
        {!filteredItems.length ? (
          <p className="text-center text-gray-600 py-8 text-sm">No items yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 justify-center max-w-[900px] mx-auto">
            <AnimatePresence>
              {filteredItems.map((i) => (
                <motion.div
                  key={i.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setDrawer({ open: true, data: i })}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white border border-gray-100 rounded-xl shadow-sm p-2 flex flex-col active:bg-gray-50 cursor-pointer relative"
                >
                  <div className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden mb-2">
                    <img
                      src={i.itemImage || "/images/default-item.jpg"}
                      alt={i.title || i.itemName || "Item"}
                      className="w-full h-full object-contain fade-in"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/images/default-item.jpg")}
                    />
                    {activeTab === "premium" && (
                      <div className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                        PREMIUM
                      </div>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-gray-800 truncate mb-1">
                    {i.title || i.itemName || "Untitled"}
                  </h3>

                  {activeTab === "premium" && i.price && (
                    <p className="text-xs font-bold text-purple-600 mb-1">
                      ¥{i.price.toLocaleString()}
                    </p>
                  )}

                  {(i.size || i.estimatedDelivery) && (
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      {i.size && <span>📦 {i.size}</span>}
                      {i.estimatedDelivery?.min && i.estimatedDelivery?.max && (
                        <span>
                          ¥{i.estimatedDelivery.min.toLocaleString()}–
                          ¥{i.estimatedDelivery.max.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  <span
                    className={`text-[11px] ${
                      i.status === "active"
                        ? "text-green-600"
                        : i.status === "pending"
                        ? "text-yellow-600"
                        : i.status === "awarded"
                        ? "text-indigo-600"
                        : "text-gray-500"
                    } font-medium`}
                  >
                    {i.status || "pending"}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      askConfirm("Delete this item?", () =>
                        handleDelete([i.id], activeTab === "requests" ? "requests" : "donations")
                      );
                    }}
                    className="absolute top-2 right-2 bg-white/80 text-red-500 hover:text-red-700 rounded-full p-1 shadow-sm"
                  >
                    <Trash size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
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
        onClose={() => setDrawer({ open: false, data: null })}
        data={drawer.data}
      />
    </div>
  );
}

/* Animations */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp {from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
.animate-fadeIn{animation:fadeIn .25s ease-out}
.animate-slideUp{animation:slideUp .3s ease-out}
.fade-in {opacity:0;animation:fadeImage 0.4s ease-in forwards}
@keyframes fadeImage {to{opacity:1}}
`;
document.head.appendChild(style);
