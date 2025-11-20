// ✅ FILE: src/pages/Items.js (PATCHED - Fixed Filtering & UI Spacing)
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import SubscriptionModal from "../components/Payments/SubscriptionModal";
import ItemDepositButton from "../components/Payments/ItemDepositButton";
import { X, ArrowLeft, ChevronLeft, ChevronRight, Search, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { throttle } from "lodash";

const PAGE_SIZE = 12;

/* Helper: format countdown */
function formatTimeRemaining(endAt) {
  if (!endAt) return "";
  const end = endAt.toMillis ? endAt.toMillis() : new Date(endAt).getTime();
  const diff = Math.max(0, end - Date.now());
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 1000 / 3600);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

/* Helper: validate item */
const isValidItem = (item) => {
  if (!item || !item.id) return false;
  if (!item.title || item.title.trim() === "") return false;
  if (!item.images || !Array.isArray(item.images) || item.images.length === 0) return false;
  if (!item.images[0] || typeof item.images[0] !== 'string' || item.images[0].trim() === "") return false;
  return true;
};

/* Helper: filter items to show only active, sponsored, and relisted */
const filterVisibleItems = (items) => {
  return items.filter(item => {
    // ✅ Show only: active, sponsored, relisted
    const validStatus = ["active", "sponsored", "relisted"].includes(item.status);
    
    // ✅ Remove: awarded, expired, closed
    const invalidStatus = ["awarded", "expired", "closed"].includes(item.status);
    
    // ✅ Handle relisted items cleanly
    if (item.status === "relisted" && item.relistedAt) {
      const relistTime = item.relistedAt.toMillis ? item.relistedAt.toMillis() : new Date(item.relistedAt).getTime();
      // Optional: Add any relist-specific logic here
      return validStatus && !invalidStatus;
    }
    
    return validStatus && !invalidStatus;
  });
};

export default function Items() {
  const navigate = useNavigate();
  const { currentUser, isSubscribed, trialCreditsLeft, isTrialExpired } =
    useAuth();

  const [items, setItems] = useState([]);
  const [viewItem, setViewItem] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [trialLeft, setTrialLeft] = useState(trialCreditsLeft || 0);
  const [trialOver, setTrialOver] = useState(isTrialExpired || false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  /* Sync trial data when AuthContext changes */
  useEffect(() => {
    setTrialLeft(trialCreditsLeft);
    setTrialOver(isTrialExpired);
  }, [trialCreditsLeft, isTrialExpired]);

  /* =========================
   * Load Items - UPDATED: Proper filtering
   * ========================= */
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ UPDATED: Query includes active, sponsored, relisted - excludes awarded/expired/closed
      const q = query(
        collection(db, "donations"),
        where("status", "in", ["active", "sponsored", "relisted"]),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isValidItem); // Filter out invalid items
      
      // ✅ Apply additional client-side filtering as backup
      const filteredDocs = filterVisibleItems(docs);
      
      console.log("📦 Loaded items:", filteredDocs.length, 
        "Active:", filteredDocs.filter(item => item.status === 'active').length,
        "Sponsored:", filteredDocs.filter(item => item.status === 'sponsored').length,
        "Relisted:", filteredDocs.filter(item => item.status === 'relisted').length
      );
      
      setItems(filteredDocs);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    } catch (error) {
      console.error("Error loading items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "donations"),
        where("status", "in", ["active", "sponsored", "relisted"]),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const newItems = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isValidItem); // Filter out invalid items
        
        // ✅ Apply filtering to new items too
        const filteredNewItems = filterVisibleItems(newItems);
        
        setItems((p) => [...p, ...filteredNewItems]);
        setLastVisible(snap.docs[snap.docs.length - 1]);
      }
    } catch (error) {
      console.error("Error loading more items:", error);
      toast.error("Failed to load more items");
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisible, loadingMore]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // ✅ Infinite scroll
  useEffect(() => {
    const handleScroll = throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 400) loadMore();
    }, 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // Additional client-side filtering as backup
  useEffect(() => {
    const validItems = items.filter(isValidItem);
    const filteredItems = filterVisibleItems(validItems);
    if (filteredItems.length !== items.length) {
      setItems(filteredItems);
    }
  }, [items]);

  // Keyboard navigation for drawer images
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setViewItem(null);
      if (!viewItem) return;
      if (e.key === "ArrowRight")
        setImageIndex((i) => (i + 1) % (viewItem.images?.length || 1));
      if (e.key === "ArrowLeft")
        setImageIndex((i) =>
          i - 1 < 0 ? (viewItem.images?.length || 1) - 1 : i - 1
        );
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewItem]);

  /* =========================
   * Handle Request
   * ========================= */
  const handleRequest = useCallback(
    async (item) => {
      if (!currentUser) {
        toast.error("🔑 Please log in to request items.");
        navigate("/login");
        return;
      }
      if (submitting) return;
      setSubmitting(true);

      try {
        // ✅ FIXED: Check if user owns the item (including admin items)
        if (item.donorId === currentUser.uid) {
          toast.error("🚫 You cannot request your own donation.");
          setSubmitting(false);
          return;
        }

        const rqSnap = await getDocs(
          query(
            collection(db, "requests"),
            where("itemId", "==", item.id),
            where("userId", "==", currentUser.uid)
          )
        );
        if (!rqSnap.empty) {
          toast("⚠️ You already requested this item.", {
            icon: "⚠️",
            style: { borderLeft: "4px solid #F59E0B" },
          });
          setSubmitting(false);
          return;
        }

        if (item.type !== "free") return;
        
        // ✅ UPDATED: Check for valid statuses only
        if (!["active", "sponsored", "relisted"].includes(item.status)) {
          toast("🎁 This item is no longer available.");
          setSubmitting(false);
          return;
        }

        // ✅ Trial enforcement
        if (!isSubscribed && (trialOver || trialLeft <= 0)) {
          toast(
            "🎁 You've used all free requests. Please deposit ¥1,500 to continue!",
            { icon: "🙏" }
          );
          setShowSubscriptionModal(true);
          setSubmitting(false);
          return;
        }

        const callable = httpsCallable(functions, "onRequestCreateAddTicket");
        await callable({ itemId: item.id });
        toast.success("✅ Request submitted!");

        if (!isSubscribed) {
          const dec = httpsCallable(functions, "decrementTrialCredit");
          const res = await dec({});
          if (res?.data?.ok) {
            toast.success(`Remaining credits: ${res.data.trialCreditsLeft}`);
          } else if (res?.data?.isTrialExpired) {
            setShowSubscriptionModal(true);
          }
        }

        setViewItem(null);
      } catch (err) {
        console.error("Request error:", err);
        toast.error("❌ Failed to submit request.");
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser, navigate, isSubscribed, trialOver, submitting, trialLeft]
  );

  const isCurrentUserOwner = useCallback(
    (item) => currentUser && item.donorId === currentUser.uid,
    [currentUser]
  );

  // ✅ Check if item is sponsored/admin item
  const isSponsoredItem = useCallback((item) => {
    return item.isSponsored || item.donorType === 'admin' || item.sponsoredBy || item.status === 'sponsored';
  }, []);

  /* =========================
   * UI - FIXED: Proper spacing to eliminate navbar overlap
   * ========================= */
  return (
    <div className="min-h-screen bg-gray-50 relative w-full overflow-x-hidden transition-all duration-200 ease-in-out">
      {/* ✅ FIXED: Proper spacing between banner and search bar */}
      <SubscriptionBanner />
      
      {/* ✅ FIXED: Search bar with proper top spacing */}
      <div className="bg-white/90 backdrop-blur border-b border-gray-100 py-3 px-4 flex justify-center sticky top-0 z-30 shadow-sm mt-0">
        <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))
            }
            placeholder="Search items or categories"
            className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm sm:text-base bg-white placeholder-gray-400 font-normal tracking-wide"
          />
        </div>
      </div>

      {/* ✅ FIXED: Main content with proper spacing */}
      <main className="page-container py-4 sm:py-6 px-4 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white h-56 sm:h-64 rounded-xl shadow-sm" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-600 py-20 text-sm sm:text-base">
            No items available.
          </p>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {items
              .filter((i) =>
                search
                  ? i.title?.toLowerCase().includes(search.toLowerCase()) ||
                    i.category?.toLowerCase().includes(search.toLowerCase())
                  : true
              )
              .map((item) => {
                const isPremium =
                  item.type === "premium" || item.accessType === "premium";
                const expired =
                  item.requestWindowEnd &&
                  new Date(
                    item.requestWindowEnd.toMillis
                      ? item.requestWindowEnd.toMillis()
                      : item.requestWindowEnd
                  ).getTime() <= Date.now();
                const isOwner = isCurrentUserOwner(item);
                const isSponsored = isSponsoredItem(item);
                const isRelisted = item.status === "relisted";

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl shadow hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden ${
                      isSponsored 
                        ? 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200' 
                        : isRelisted
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                        : 'bg-white'
                    }`}
                    onClick={() => {
                      setViewItem(item);
                      setImageIndex(0);
                    }}
                  >
                    {/* Status Badges */}
                    {isSponsored && (
                      <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                        <Crown size={12} />
                        Sponsored
                      </div>
                    )}
                    
                    {isRelisted && (
                      <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        🔄 Relisted
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                      <button className="bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-full text-sm font-semibold shadow hover:bg-white transition">
                        View More
                      </button>
                    </div>

                    {isOwner && (
                      <div className="absolute top-2 left-2 z-20 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Your Item
                      </div>
                    )}

                    <div className="h-44 sm:h-52 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <h2 className="text-sm sm:text-base font-semibold line-clamp-2 h-10 sm:h-12 text-gray-800">
                        {item.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">
                        {item.category || ""}
                      </p>

                      {/* ⏱️ Time or Status */}
                      {item.type === "free" && (
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            expired
                              ? "text-gray-400"
                              : "text-emerald-600"
                          }`}
                        >
                          {expired
                            ? "⏰ Request Closed"
                            : `⏱️ ${formatTimeRemaining(item.requestWindowEnd)}`}
                        </p>
                      )}

                      {/* 💰 Price + Size + Delivery Estimate */}
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center justify-between">
                          {isPremium ? (
                            <span className="text-indigo-600 font-bold text-sm sm:text-base">
                              ¥{item.price || item.priceJPY || "—"}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-sm sm:text-base">
                              FREE
                            </span>
                          )}
                          {item.verified && (
                            <span className="text-[10px] sm:text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                              Verified
                            </span>
                          )}
                        </div>

                        {(item.size || item.estimatedDelivery) && (
                          <div className="flex justify-between text-[11px] text-gray-500 mt-0.5">
                            {item.size && (
                              <span className="capitalize">📦 {item.size}</span>
                            )}
                            {item.estimatedDelivery?.min &&
                              item.estimatedDelivery?.max && (
                                <span className="text-gray-400">
                                  ¥{item.estimatedDelivery.min.toLocaleString()}–
                                  ¥{item.estimatedDelivery.max.toLocaleString()}
                                </span>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {loadingMore && (
          <div className="text-center text-gray-500 mt-6 animate-pulse">
            ⏳ Loading more items…
          </div>
        )}
      </main>

      {/* Drawer (Item Detail) */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center"
          onClick={() => setViewItem(null)}
        >
          <div
            className={`bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:w-[90%] max-w-md p-6 relative animate-slideUp ${
              isSponsoredItem(viewItem) 
                ? 'border-l-4 border-purple-500' 
                : viewItem.status === 'relisted'
                ? 'border-l-4 border-green-500'
                : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewItem(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={22} />
            </button>
            <button
              onClick={() => setViewItem(null)}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700 md:hidden"
            >
              <ArrowLeft size={22} />
            </button>

            {isCurrentUserOwner(viewItem) && (
              <div className="absolute top-3 left-12 bg-yellow-500 text-white text-sm px-3 py-1 rounded-full font-semibold z-10">
                Your Item
              </div>
            )}

            {/* Status Headers */}
            {isSponsoredItem(viewItem) && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                <Crown size={16} />
                <span className="font-semibold">
                  🏢 Sponsored by {viewItem.sponsoredBy || 'Freebies Japan'}
                </span>
              </div>
            )}
            
            {viewItem.status === "relisted" && (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                <span className="font-semibold">
                  🔄 This item has been relisted
                </span>
              </div>
            )}

            <div className="relative w-full h-56 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              {viewItem.images?.length ? (
                <>
                  <img
                    src={viewItem.images[imageIndex]}
                    alt="Item"
                    className="object-contain w-full h-full"
                  />
                  {viewItem.images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setImageIndex(
                            (i) =>
                              (i - 1 + viewItem.images.length) %
                              viewItem.images.length
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() =>
                          setImageIndex((i) => (i + 1) % viewItem.images.length)
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

            <h2 className="text-lg font-semibold mb-1">{viewItem.title}</h2>
            <p className="text-sm text-gray-600 mb-3">
              {viewItem.description || "No description"}
            </p>

            {/* 🚚 Delivery Estimate */}
            {viewItem.estimatedDelivery && (
              <div className="bg-indigo-50 text-indigo-700 text-sm px-3 py-2 rounded-lg mb-3 flex items-center justify-between">
                <span className="font-medium">Estimated Delivery Range:</span>
                <span className="font-semibold">
                  ¥{viewItem.estimatedDelivery.min?.toLocaleString()}–¥
                  {viewItem.estimatedDelivery.max?.toLocaleString()}
                </span>
              </div>
            )}

            {viewItem.size && (
              <p className="text-xs text-gray-500 mb-4">
                📦 Item Size: <b className="capitalize">{viewItem.size}</b>
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {isSponsoredItem(viewItem) && (
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <Crown size={12} />
                  Sponsored
                </span>
              )}
              {viewItem.status === "relisted" && (
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs px-2 py-0.5 rounded">
                  🔄 Relisted
                </span>
              )}
              {viewItem.verified && (
                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">
                  ✅ Verified
                </span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  viewItem.type === "premium"
                    ? "bg-indigo-600 text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {viewItem.type === "premium" ? "Premium" : "Free"}
              </span>
              {isCurrentUserOwner(viewItem) && (
                <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                  🏷️ Your Listing
                </span>
              )}
            </div>

            {viewItem.type === "premium" ? (
              <>
                <p className="text-2xl font-semibold text-indigo-600 mb-3">
                  ¥{viewItem.price?.toLocaleString() || "—"}
                </p>
                {isCurrentUserOwner(viewItem) ? (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 px-6 py-2 rounded font-medium cursor-not-allowed"
                  >
                    Your Listing
                  </button>
                ) : (
                  <ItemDepositButton
                    itemId={viewItem.id}
                    title={viewItem.title}
                    amountJPY={viewItem.price}
                  />
                )}
              </>
            ) : (
              <button
                onClick={() => handleRequest(viewItem)}
                disabled={
                  submitting ||
                  !["active", "sponsored", "relisted"].includes(viewItem.status) ||
                  isCurrentUserOwner(viewItem)
                }
                className={`px-6 py-2 rounded font-medium w-full md:w-auto ${
                  submitting
                    ? "bg-gray-300 text-gray-600 cursor-wait"
                    : !["active", "sponsored", "relisted"].includes(viewItem.status) ||
                      isCurrentUserOwner(viewItem)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {submitting
                  ? "Submitting…"
                  : !["active", "sponsored", "relisted"].includes(viewItem.status)
                  ? "⏰ Closed"
                  : isCurrentUserOwner(viewItem)
                  ? "Your Item"
                  : "Request Now"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ✅ Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}

/* Slide-up animation */
const style = document.createElement("style");
style.innerHTML = `
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slideUp { animation: slideUp 0.3s ease-out; }
`;
document.head.appendChild(style);