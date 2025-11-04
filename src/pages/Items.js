// ✅ FILE: src/pages/Items.js (Optimized UX + Request Safety + Self-Item Protection)
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import ItemDepositButton from "../components/Payments/ItemDepositButton";
import { X, ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
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

export default function Items() {
  const navigate = useNavigate();
  const { currentUser, isSubscribed, trialCreditsLeft, isTrialExpired } = useAuth();

  const [trialLeft, setTrialLeft] = useState(trialCreditsLeft || 0);
  const [trialOver, setTrialOver] = useState(isTrialExpired || false);
  const [items, setItems] = useState([]);
  const [viewItem, setViewItem] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [bannerHeight, setBannerHeight] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  /* ------------------------------------------------------------------
   * Sync trial data
   * ------------------------------------------------------------------ */
  useEffect(() => {
    setTrialLeft(trialCreditsLeft);
    setTrialOver(isTrialExpired);
  }, [trialCreditsLeft, isTrialExpired]);

  /* ------------------------------------------------------------------
   * Observe banner height dynamically
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const banner = document.querySelector(".subscription-banner");
    if (!banner) return;

    const updatePadding = () => setBannerHeight(banner.offsetHeight || 0);
    const resizeObs = new ResizeObserver(updatePadding);
    resizeObs.observe(banner);
    const mutationObs = new MutationObserver(updatePadding);
    mutationObs.observe(document.body, { childList: true, subtree: true });
    updatePadding();

    return () => {
      resizeObs.disconnect();
      mutationObs.disconnect();
    };
  }, []);

  /* =========================
   * Load Items
   * ========================= */
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    const q = query(
      collection(db, "donations"),
      where("status", "in", ["active", "open", "awarded", "closed"]),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setItems(docs);
    setLastVisible(snap.docs[snap.docs.length - 1]);
    setLoading(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    const q = query(
      collection(db, "donations"),
      where("status", "in", ["active", "open", "awarded", "closed"]),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((p) => [...p, ...newItems]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    }
    setLoadingMore(false);
  }, [lastVisible, loadingMore]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 400) loadMore();
    }, 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // Keyboard navigation
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

  // ✅ Clean search input (no special characters)
  const handleSearchInput = (e) => {
    const clean = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
    setSearch(clean);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

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
        // 🚫 Prevent requesting own item
        if (item.donorId === currentUser.uid) {
          toast.error("🚫 You cannot request your own donation.");
          setSubmitting(false);
          return;
        }

        // 🚫 Prevent duplicate requests
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
        if (item.status === "awarded" || item.status === "closed") {
          toast("🎁 This item is no longer available.");
          setSubmitting(false);
          return;
        }

        if (!isSubscribed && trialOver) {
          toast("🎁 You've used all 5 free requests. Donate ¥1,500 to continue!", {
            icon: "🙏",
            style: { borderLeft: "4px solid #F59E0B" },
          });
          navigate("/subscribe");
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
            toast("🎁 Trial complete! Donate ¥1,500 to continue 💕", {
              icon: "💝",
            });
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
    [currentUser, navigate, isSubscribed, trialOver, submitting]
  );

  /* =========================
   * Check if current user is the item owner
   * ========================= */
  const isCurrentUserOwner = useCallback((item) => {
    return currentUser && item.donorId === currentUser.uid;
  }, [currentUser]);

  /* =========================
   * UI
   * ========================= */
  return (
    <div
      className="min-h-screen bg-gray-50 relative w-full overflow-x-hidden transition-all duration-200 ease-in-out"
      style={{ paddingTop: `${bannerHeight}px` }}
    >
      {/* ✅ Subscription Banner */}
      <div className="subscription-banner fixed top-0 left-0 w-full z-40 transition-all duration-200">
        <SubscriptionBanner />
      </div>

      {/* 🔍 Search Bar */}
      <div className="bg-white/90 backdrop-blur border-b border-gray-100 py-3 px-4 flex justify-center sticky top-0 z-30 shadow-sm">
        <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={handleSearchInput}
            placeholder="Search items or categories"
            className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm sm:text-base bg-white placeholder-gray-400 font-normal tracking-wide"
          />
        </div>
      </div>

      {/* 🏷️ Feed Section */}
      <main className="page-container py-4 sm:py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white h-56 sm:h-64 rounded-xl shadow-sm" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-gray-600 py-20 text-sm sm:text-base">
            No items available.
          </p>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {filteredItems.map((item) => {
              const isPremium =
                item.type === "premium" || item.accessType === "premium";
              const expired =
                item.requestWindowEnd &&
                new Date(
                  item.requestWindowEnd.toMillis
                    ? item.requestWindowEnd.toMillis()
                    : item.requestWindowEnd
                ).getTime() <= Date.now();
              const isAwarded = item.status === "awarded";
              const isClosed = item.status === "closed";
              const isOwner = isCurrentUserOwner(item);

              return (
                <div
                  key={item.id}
                  className="relative bg-white rounded-2xl shadow hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden"
                  onClick={() => {
                    setViewItem(item);
                    setImageIndex(0);
                  }}
                >
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                    <button className="bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-full text-sm font-semibold shadow hover:bg-white transition">
                      View More
                    </button>
                  </div>

                  {/* Owner Badge */}
                  {isOwner && (
                    <div className="absolute top-2 left-2 z-20 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      Your Item
                    </div>
                  )}

                  {/* Image */}
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

                  {/* Info */}
                  <div className="p-3 sm:p-4">
                    <h2 className="text-sm sm:text-base font-semibold line-clamp-2 h-10 sm:h-12 text-gray-800">
                      {item.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">
                      {item.category || ""}
                    </p>

                    {item.type === "free" && (
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isAwarded
                            ? "text-pink-600"
                            : isClosed || expired
                            ? "text-gray-400"
                            : "text-emerald-600"
                        }`}
                      >
                        {isAwarded
                          ? "🎁 Awarded"
                          : isClosed || expired
                          ? "⏰ Request Closed"
                          : `⏱️ ${formatTimeRemaining(item.requestWindowEnd)}`}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-1">
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

      {/* Drawer */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:w-[90%] max-w-md p-6 relative animate-slideUp"
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

            {/* Owner Badge in Drawer */}
            {isCurrentUserOwner(viewItem) && (
              <div className="absolute top-3 left-12 bg-yellow-500 text-white text-sm px-3 py-1 rounded-full font-semibold z-10">
                Your Item
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
                          setImageIndex(
                            (i) => (i + 1) % viewItem.images.length
                          )
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

            <div className="flex flex-wrap justify-center gap-2 mb-3">
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
                  viewItem.status === "awarded" ||
                  viewItem.status === "closed" ||
                  isCurrentUserOwner(viewItem)
                }
                className={`px-6 py-2 rounded font-medium w-full md:w-auto ${
                  submitting
                    ? "bg-gray-300 text-gray-600 cursor-wait"
                    : viewItem.status === "awarded" ||
                      viewItem.status === "closed" ||
                      isCurrentUserOwner(viewItem)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {submitting
                  ? "Submitting…"
                  : viewItem.status === "awarded"
                  ? "🎁 Awarded"
                  : viewItem.status === "closed"
                  ? "⏰ Closed"
                  : isCurrentUserOwner(viewItem)
                  ? "Your Item"
                  : "Request Now"}
              </button>
            )}
          </div>
        </div>
      )}
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