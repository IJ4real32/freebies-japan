// =======================================================
// ITEMS PAGE — MOBILE POLISH IMPLEMENTATION
// =======================================================

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc
} from "firebase/firestore";
import { db } from "../firebase";
import {
  onRequestCreateAddTicket,
  decrementTrialCredit,
  updatePremiumStatus
} from "../services/functionsApi";
import { useAuth } from "../contexts/AuthContext";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import SubscriptionModal from "../components/Payments/SubscriptionModal";
import ItemDepositButton from "../components/Payments/ItemDepositButton";
import PremiumSellerActions from "../components/Premium/PremiumSellerActions";
import PremiumBuyerActions from "../components/Premium/PremiumBuyerActions";
import PremiumTimeline from "../components/MyActivity/PremiumTimeline";
import {
  X, ArrowLeft, ChevronLeft, ChevronRight, Search,
  Crown, Package, Truck, CheckCircle, CreditCard,
  User, Clock, Ban, AlertCircle, Calendar,
  CircleDollarSign, Flag, ShieldCheck, ClipboardCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { throttle } from "lodash";

const PAGE_SIZE = 12;

// =======================================================
// DELIVERABLE A: FREE-ITEM SYSTEM UPGRADE
// =======================================================

/* ✅ A: Safe timestamp parser */
const parseTS = (ts) => {
  if (!ts) return null;
  
  if (ts?.toMillis) return ts.toMillis();
  if (ts?.seconds) return ts.seconds * 1000;
  
  const n = Number(ts);
  if (!isNaN(n)) return n;
  
  try {
    return new Date(ts).getTime();
  } catch {
    return null;
  }
};

/* ✅ A: Enhanced free item closed check with 24h fallback */
const isFreeItemClosed = (item) => {
  if (!item) return true;
  
  if (item.status === "closed") return true;
  
  const end = parseTS(item.requestWindowEnd);
  
  // ✅ A: Fallback to 24h from creation if requestWindowEnd missing
  if (!end) {
    const created = parseTS(item.createdAt);
    if (!created) return true;
    
    return Date.now() - created > 24 * 60 * 60 * 1000;
  }
  
  return end <= Date.now();
};

/* ✅ A: Free item requestability check */
const isFreeRequestable = (item) => {
  if (!item) return false;
  return ["active", "sponsored", "relisted"].includes(item.status);
};

/* ✅ A & F: Universal sanitizer */
const sanitizeItem = (item) => {
  if (!item?.id) return null;
  
  // ✅ F: Title fallback
  if (!item.title || !item.title.trim()) {
    item.title = "Untitled Item";
  }
  
  // ✅ F: Image fallback
  if (!Array.isArray(item.images) || item.images.length === 0) {
    item.images = [
      item.itemImage || 
      item.imageUrl || 
      "/images/default-item.jpg"
    ];
  }
  
  // ✅ F: Detect premium/free
  if (!item.type) {
    item.type = item.price || item.priceJPY ? "premium" : "free";
  }
  
  // ✅ F: Price correction
  if (item.type === "premium") {
    item.price = item.price || item.priceJPY || 0;
  }
  
  // ✅ F: Premium status correction
  if (item.type === "premium" && !item.premiumStatus) {
    item.premiumStatus = "available";
  }
  
  // ✅ F: Handle ownerId/donorId
  if (!item.ownerId && item.donorId) {
    item.ownerId = item.donorId;
  }
  
  return item;
};

// =======================================================
// DELIVERABLE B: PREMIUM ITEM VISIBILITY + LIFECYCLE
// =======================================================

/* ✅ B: Visible premium statuses */
const visiblePremiumStatuses = [
  "available",
  "depositPaid",
  "preparingDelivery",
  "sellerScheduledPickup",
  "inTransit",
  "delivered",
  "completionCheck",
  "sold",
  "buyerDeclined",
  "buyerDeclinedAtDoor",
  "cancelled",
  "autoClosed"
];

/* ✅ B & F: Final visibility filter */
const filterVisibleItems = (items) => {
  return items.filter((item) => {
    if (!item) return false;
    
    const sanitized = sanitizeItem({ ...item });
    if (!sanitized) return false;
    
    if (sanitized.type !== "premium") {
      return ["active", "sponsored", "relisted"].includes(sanitized.status);
    }
    
    return visiblePremiumStatuses.includes(sanitized.premiumStatus);
  });
};

// =======================================================
// DELIVERABLE B & D: PREMIUM STATUS CONFIGURATION
// =======================================================

const premiumStatusConfig = {
  available: {
    label: "Available",
    color: "bg-emerald-100 text-emerald-800",
    badgeColor: "bg-emerald-600 text-white",
    ribbonColor: "from-emerald-500 to-green-500",
    stage: 1,
    icon: CircleDollarSign,
  },
  depositPaid: {
    label: "Deposit Paid",
    color: "bg-amber-100 text-amber-800",
    badgeColor: "bg-amber-500 text-white",
    ribbonColor: "from-amber-500 to-orange-500",
    stage: 2,
    icon: CreditCard,
  },
  preparingDelivery: {
    label: "Preparing Delivery",
    color: "bg-blue-100 text-blue-800",
    badgeColor: "bg-blue-600 text-white",
    ribbonColor: "from-blue-500 to-indigo-500",
    stage: 3,
    icon: Package,
  },
  sellerScheduledPickup: {
    label: "Pickup Scheduled",
    color: "bg-sky-100 text-sky-800",
    badgeColor: "bg-sky-600 text-white",
    ribbonColor: "from-sky-500 to-blue-500",
    stage: 3.5,
    icon: Calendar,
  },
  inTransit: {
    label: "On The Way",
    color: "bg-purple-100 text-purple-800",
    badgeColor: "bg-purple-600 text-white",
    ribbonColor: "from-purple-500 to-violet-500",
    stage: 4,
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-indigo-100 text-indigo-800",
    badgeColor: "bg-indigo-600 text-white",
    ribbonColor: "from-indigo-500 to-blue-500",
    stage: 5,
    icon: CheckCircle,
  },
  completionCheck: {
    label: "Verification Pending",
    color: "bg-cyan-100 text-cyan-800",
    badgeColor: "bg-cyan-600 text-white",
    ribbonColor: "from-cyan-500 to-blue-500",
    stage: 5.5,
    icon: ShieldCheck,
  },
  sold: {
    label: "Sold",
    color: "bg-gray-100 text-gray-800",
    badgeColor: "bg-gray-600 text-white",
    ribbonColor: "from-gray-500 to-gray-600",
    stage: 6,
    icon: CheckCircle,
  },
  buyerDeclined: {
    label: "Buyer Declined",
    color: "bg-red-100 text-red-800",
    badgeColor: "bg-red-600 text-white",
    ribbonColor: "from-red-500 to-rose-500",
    stage: 0,
    isTerminal: true,
    icon: Ban,
  },
  buyerDeclinedAtDoor: {
    label: "Declined At Door",
    color: "bg-rose-100 text-rose-800",
    badgeColor: "bg-rose-600 text-white",
    ribbonColor: "from-rose-500 to-pink-500",
    stage: 0,
    isTerminal: true,
    icon: Ban,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    badgeColor: "bg-gray-600 text-white",
    ribbonColor: "from-gray-500 to-gray-600",
    stage: 0,
    isTerminal: true,
    icon: Ban,
  },
  autoClosed: {
    label: "Auto Closed",
    color: "bg-gray-100 text-gray-800",
    badgeColor: "bg-gray-600 text-white",
    ribbonColor: "from-gray-500 to-gray-600",
    stage: 0,
    isTerminal: true,
    icon: Clock,
  },
};

const getPremiumStatusConfig = (item) => {
  if (!item?.premiumStatus) return premiumStatusConfig.available;
  return premiumStatusConfig[item.premiumStatus] || premiumStatusConfig.available;
};

// =======================================================
// DELIVERABLE G: PERFORMANCE HELPERS
// =======================================================

/* ✅ G: Format time remaining */
const formatTimeRemaining = (timestamp) => {
  const end = parseTS(timestamp);
  if (!end) return "Unknown";

  const diff = end - Date.now();
  if (diff <= 0) return "Closed";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
};

// =======================================================
// HELPER FUNCTIONS
// =======================================================

const isCurrentUserOwner = (item, uid) => {
  if (!item || !uid) return false;
  return (item.ownerId && item.ownerId === uid) || (item.donorId && item.donorId === uid);
};

const isPremiumBuyer = (item, uid) => {
  if (!item || !uid) return false;
  return item.type === "premium" && item.buyerId === uid;
};

const isSponsoredItem = (item) => {
  if (!item) return false;
  return item.sponsored === true || item.donorType === 'admin' || item.sponsoredBy || item.status === 'sponsored';
};

const isPremiumAvailable = (item) => {
  if (!item) return false;
  return item.type === "premium" && item.premiumStatus === "available";
};

// =======================================================
// MAIN COMPONENT
// =======================================================

export default function Items() {
  const navigate = useNavigate();
  const { currentUser, isSubscribed, trialCreditsLeft, isTrialExpired } = useAuth();
  
  // State
  const [items, setItems] = useState([]);
  const [viewItem, setViewItem] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // ✅ DELIVERABLE F & G: Preprocess items with memoization
  const preprocessItems = useCallback((rawItems) => {
    if (!Array.isArray(rawItems)) return [];
    
    const sanitized = rawItems
      .map((it) => {
        const sanitizedItem = sanitizeItem({ ...it });
        return sanitizedItem;
      })
      .filter((it) => it !== null);
    
    const filtered = filterVisibleItems(sanitized);
    
    // Sort by creation date (newest first)
    return filtered.sort((a, b) => {
      const t1 = parseTS(a.createdAt) || 0;
      const t2 = parseTS(b.createdAt) || 0;
      return t2 - t1;
    });
  }, []);

  // ✅ DELIVERABLE G: Load initial items
  const loadItems = useCallback(async () => {
    // Prevent multiple calls
    if (initialLoadAttempted) return;
    
    setLoading(true);
    
    try {
      const q = query(
        collection(db, "donations"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setItems([]);
        setLastDoc(null);
        setHasMore(false);
        return;
      }
      
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const processed = preprocessItems(docs);
      
      setItems(processed);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      
    } catch (err) {
      console.error("Error loading items:", err);
      toast.error("Failed to load items.");
      setItems([]);
    } finally {
      setLoading(false);
      setInitialLoadAttempted(true);
    }
  }, [preprocessItems, initialLoadAttempted]);

  // ✅ DELIVERABLE G: Load more with pagination
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    
    setLoadingMore(true);
    
    try {
      const q = query(
        collection(db, "donations"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setHasMore(false);
        return;
      }
      
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const processed = preprocessItems(docs);
      
      setItems((prev) => [...prev, ...processed]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      
    } catch (err) {
      console.error("Error loading more items:", err);
      toast.error("Failed to load more items.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, preprocessItems]);

  // ✅ DELIVERABLE G: Throttled infinite scroll
  const handleScroll = useCallback(
    throttle(() => {
      if (loadingMore || !hasMore) return;
      
      const bottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 300;
      
      if (bottom) loadMore();
    }, 600),
    [loadMore, loadingMore, hasMore]
  );

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Initial load
  const mountedRef = useRef(false);
  
  useEffect(() => {
    if (mountedRef.current || initialLoadAttempted) return;
    
    mountedRef.current = true;
    loadItems();
  }, [loadItems, initialLoadAttempted]);

  // ✅ DELIVERABLE G: Keyboard navigation
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

  // ✅ DELIVERABLE G: Search filtering with memoization
  const displayedItems = useMemo(() => {
    if (!search.trim()) return items;
    
    const s = search.toLowerCase();
    return items.filter(
      (it) =>
        it.title?.toLowerCase().includes(s) ||
        it.category?.toLowerCase().includes(s) ||
        it.description?.toLowerCase().includes(s)
    );
  }, [search, items]);

  // ✅ DELIVERABLE G: Auto-scroll to top when search changes
  useEffect(() => {
    if (search.trim()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [search]);

  // ✅ DELIVERABLE F: Refresh single item
  const refreshItemData = useCallback(async () => {
    if (!viewItem?.id) return;
    
    try {
      const docRef = doc(db, "donations", viewItem.id);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        toast.error("Item no longer exists.");
        setViewItem(null);
        return;
      }
      
      const updated = sanitizeItem({ id: snap.id, ...snap.data() });
      
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? updated : it))
      );
      
      setViewItem(updated);
    } catch (err) {
      console.error("Error refreshing item data:", err);
    }
  }, [viewItem]);

  // =======================================================
  // ✅ DELIVERABLE A: FREE ITEM REQUEST HANDLER
  // =======================================================
 const handleRequest = useCallback(async (item) => {
  // ✅ A: Premium guard
  if (item.type === "premium") {
    toast.error("This is a premium item - please use purchase flow.");
    return;
  }

  if (!currentUser) {
    toast.error("🔑 Please log in to request items.");
    navigate("/login");
    return;
  }

  // ✅ A: Cannot request own item
  if (isCurrentUserOwner(item, currentUser.uid)) {
    toast.error("🚫 You cannot request your own item.");
    return;
  }

  // ✅ A: Check if requestable
  if (!isFreeRequestable(item)) {
    toast.error("🎁 This item is no longer available.");
    return;
  }

  // ✅ A: Check if window closed
  if (isFreeItemClosed(item)) {
    toast.error("⏰ Request window is closed for this item.");
    return;
  }

  // ✅ A: Trial credit guard (UI-level only)
  if (!isSubscribed && (isTrialExpired || trialCreditsLeft <= 0)) {
    toast(
      "🎁 You've used all free requests. Please subscribe to continue!",
      { icon: "🙏" }
    );
    setShowSubscriptionModal(true);
    return;
  }

  setSubmitting(true);

  try {
    // ✅ Phase-2: Idempotent backend request
    const result = await onRequestCreateAddTicket({
      itemId: item.id,
    });

    if (result?.alreadyRequested) {
      toast.success("📌 You already requested this item.");
    } else if (result?.requestCreated) {
      toast.success("✅ Request submitted successfully!");
    } else if (!result?.ok) {
      throw new Error("Request failed.");
    }

    // ✅ Backend already deducted trial credit
    // → just refresh UI state
    await refreshItemData();
    setViewItem(null);

  } catch (err) {
    console.error("handleRequest error:", err);
    toast.error(err?.message || "Failed to submit request.");
  } finally {
    setSubmitting(false);
  }
}, [
  currentUser,
  navigate,
  isSubscribed,
  isTrialExpired,
  trialCreditsLeft,
  refreshItemData,
]);


  // =======================================================
  // ✅ DELIVERABLE D & F: PREMIUM ACTION HANDLER
  // =======================================================
  // =======================================================
// PATCHED PREMIUM STATUS HANDLER (FINAL PHASE-2)
// =======================================================
const handlePremiumAction = useCallback(
  async (newStatus, extraPayload = {}) => {
    if (!viewItem) return;

    try {
      // 🔥 THIS WAS MISSING: direct backend status update
      const result = await updatePremiumStatus({
        itemId: viewItem.id,
        newStatus,
        ...extraPayload,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Premium status update failed.");
      }

      // 💬 Local UI feedback
      switch (newStatus) {
        case "depositPaid":
          toast.success("Deposit confirmed. Seller will prepare delivery.");
          break;
        case "preparingDelivery":
          toast.success("Delivery preparation started.");
          break;
        case "sellerScheduledPickup":
          toast.success("Pickup schedule submitted.");
          break;
        case "inTransit":
          toast.success("Item is now in transit.");
          break;
        case "delivered":
          toast.success("Item marked as delivered.");
          break;
        case "completionCheck":
          toast.success("Awaiting confirmation from both parties.");
          break;
        case "sold":
          toast.success("Transaction completed!");
          break;
        case "buyerDeclinedAtDoor":
          toast.error("Buyer declined the item at delivery.");
          break;
        case "cancelled":
          toast.error("Order cancelled.");
          break;
        default:
          toast.success("Status updated.");
      }

      await refreshItemData();
    } catch (err) {
      console.error("❌ handlePremiumAction error:", err);
      toast.error(err.message || "Could not update premium status.");
    }
  },
  [viewItem, refreshItemData]
);


  // =======================================================
  // MEMOIZED HELPER FUNCTIONS
  // =======================================================
  
  const isCurrentUserOwnerMemo = useCallback(
    (item) => isCurrentUserOwner(item, currentUser?.uid),
    [currentUser]
  );

  const isPremiumBuyerMemo = useCallback(
    (item) => isPremiumBuyer(item, currentUser?.uid),
    [currentUser]
  );

  const isSponsoredItemMemo = useCallback(
    (item) => isSponsoredItem(item),
    []
  );

  const isPremiumAvailableMemo = useCallback(
    (item) => isPremiumAvailable(item),
    []
  );

  const getPremiumStatusConfigMemo = useCallback(
    (item) => getPremiumStatusConfig(item),
    []
  );

  // =======================================================
  // CALCULATE COUNTERS
  // =======================================================
  
  const freeItemsCount = useMemo(() => {
    // Only count active free items (not closed or sold)
    return items.filter(item => 
      item.type !== 'premium' && 
      ["active", "sponsored", "relisted"].includes(item.status) &&
      !isFreeItemClosed(item)
    ).length;
  }, [items]);

  const premiumItemsCount = useMemo(() => {
    // Only count available premium items
    return items.filter(item => 
      item.type === 'premium' && 
      item.premiumStatus === "available"
    ).length;
  }, [items]);

  const totalVisibleItems = useMemo(() => {
    // Total items that should be visible to user
    return displayedItems.length;
  }, [displayedItems]);

  // =======================================================
  // RENDER
  // =======================================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriptionBanner />
      
      {/* Header - 📱 MOBILE POLISH: Phase 1, Point 4️⃣ */}
      <div className="bg-white shadow-sm py-3 px-4 border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              {/* 📱 MOBILE POLISH: Reduce title size */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Browse Items</h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">Find free and premium items</p>
            </div>
            {currentUser && !isSubscribed && trialCreditsLeft > 0 && (
              <div className="text-sm hidden sm:block">
                <span className="text-amber-600 font-medium">
                  {trialCreditsLeft} free request{trialCreditsLeft !== 1 ? 's' : ''} left
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 sm:mt-4 relative max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items, categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm sm:text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-5xl mb-4 text-gray-400">📦</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Items Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              There are currently no items available.
            </p>
            <button
              onClick={loadItems}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Refresh Items
            </button>
          </div>
        ) : (
          <>
            {/* 📱 MOBILE POLISH: Phase 3, Point 8️⃣ - Hide PremiumTimeline on mobile */}
            <div className="hidden sm:block mb-6">
              
  
            </div>

            {/* Stats - UPDATED: Show only available free items and available premium items */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalVisibleItems}</div>
                <div className="text-sm text-gray-600 mt-1">Total Visible Items</div>
              </div>
              <div className="bg-emerald-50 p-4 sm:p-6 rounded-lg shadow-sm border border-emerald-200">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-700">
                  {freeItemsCount}
                </div>
                <div className="text-sm text-emerald-600 mt-1">Available Free Items</div>
                <div className="text-xs text-emerald-500 mt-1">
                  (Requestable & Not Closed)
                </div>
              </div>
              <div className="bg-indigo-50 p-4 sm:p-6 rounded-lg shadow-sm border border-indigo-200">
                <div className="text-2xl sm:text-3xl font-bold text-indigo-700">
                  {premiumItemsCount}
                </div>
                <div className="text-sm text-indigo-600 mt-1">Available Premium Items</div>
                <div className="text-xs text-indigo-500 mt-1">
                  (Ready to Purchase)
                </div>
              </div>
            </div>

            {/* Search results info */}
            {search && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm sm:text-base">
                  Showing {displayedItems.length} result{displayedItems.length !== 1 ? 's' : ''} for "{search}"
                  {displayedItems.length === 0 && " - try different keywords"}
                </p>
              </div>
            )}

            {/* Items grid */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Available Items {search && `(${displayedItems.length})`}
                </h2>
                {!search && (
                  <div className="text-sm text-gray-500 hidden sm:block">
                    Sorted by newest first
                  </div>
                )}
              </div>
              
              {displayedItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <div className="text-3xl mb-4 text-gray-300">🔍</div>
                  <p className="text-gray-600">No items match your search "{search}"</p>
                  <button
                    onClick={() => setSearch("")}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {displayedItems.map((item) => {
                    const isPremium = item.type === "premium";
                    const premiumCfg = getPremiumStatusConfigMemo(item);
                    const closed = isFreeItemClosed(item);
                    const owner = isCurrentUserOwnerMemo(item);
                    const buyer = isPremiumBuyerMemo(item);
                    const sponsored = isSponsoredItemMemo(item);
                    const requestable = !isPremium && isFreeRequestable(item) && !closed && !owner;
                    const premiumAvailable = isPremium && item.premiumStatus === "available";
                    
                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer ${
                          !requestable && !premiumAvailable && !owner
                            ? "opacity-80 border-gray-300"
                            : "border-gray-200"
                        }`}
                        onClick={() => {
                          setViewItem(item);
                          setImageIndex(0);
                        }}
                      >
                        {/* 📱 MOBILE POLISH: Phase 1, Point 1️⃣ - Card Height Fix */}
                        {/* Image with badges */}
                        <div className="relative aspect-[4/3] bg-gray-100">
                          <img
                            src={item.images?.[0] || "/images/default-item.jpg"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "/images/default-item.jpg";
                            }}
                          />
                          
                          {/* 📱 MOBILE POLISH: Phase 1, Point 3️⃣ - Badge Cap */}
                          {/* Badges - Max 2 on mobile */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            {sponsored && (
                              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                <Crown size={10} /> Sponsored
                              </div>
                            )}
                            
                            {owner && (
                              <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                Your Item
                              </div>
                            )}
                            
                            {isPremium && buyer && !owner && !sponsored && (
                              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                <User size={10} /> Your Purchase
                              </div>
                            )}
                          </div>
                          
                          {/* 📱 MOBILE POLISH: Phase 1, Point 3️⃣ - Hide premium ribbon on mobile */}
                          {/* Premium ribbon */}
                          {isPremium && item.premiumStatus !== "available" && (
                            <div className={`hidden sm:block absolute top-2 left-0 right-0 bg-gradient-to-r ${premiumCfg.ribbonColor} text-white text-xs py-1 text-center font-semibold`}>
                              {premiumCfg.label}
                            </div>
                          )}
                          
                          {/* Price overlay */}
                          <div className={`absolute bottom-0 left-0 right-0 px-4 py-2 ${
                            isPremium 
                              ? "bg-gradient-to-r from-indigo-600/90 to-purple-600/90" 
                              : "bg-gradient-to-r from-emerald-600/90 to-green-600/90"
                          }`}>
                            <div className="text-white font-bold text-base sm:text-lg">
                              {isPremium 
                                ? `¥${item.price?.toLocaleString() || "0"}` 
                                : "FREE"}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4 sm:p-5">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2 line-clamp-2 leading-tight">
                            {item.title}
                          </h3>
                          
                          {/* 📱 MOBILE POLISH: Phase 1, Point 2️⃣ - Card Content Cleanup */}
                          <p className="text-gray-500 text-xs mb-2">
                            {item.category || "General"}
                          </p>
                          
                          {/* Free item timer */}
                          {!isPremium && (
                            <p className={`text-xs font-medium mb-2 ${closed ? "text-gray-400" : "text-emerald-600"}`}>
                              {closed ? "⏰ Request Closed" : `⏱ ${formatTimeRemaining(item.requestWindowEnd)}`}
                            </p>
                          )}
                          
                          {/* Premium status chip */}
                          {isPremium && (
                            <span className={`inline-block text-xs px-2 py-1 rounded-full ${premiumCfg.color} font-medium`}>
                              {premiumCfg.label}
                            </span>
                          )}
                          
                          {/* 📱 MOBILE POLISH: Phase 1, Point 2️⃣ - Simplified footer */}
                          {/* Mobile-only footer */}
                          <div className="block sm:hidden pt-2 text-right text-sm font-medium text-indigo-600">
                            View →
                          </div>
                          
                          {/* Desktop footer */}
                          <div className="hidden sm:flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
                            <div className="text-xs text-gray-500">
                              {item.size && `📦 ${item.size}`}
                            </div>
                            <span className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                              View Details →
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Load more / End of results */}
            {loadingMore ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p className="text-gray-600 mt-2">Loading more items...</p>
              </div>
            ) : !hasMore && displayedItems.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>You've reached the end of the list</p>
                <p className="text-sm mt-1">{displayedItems.length} items shown</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* 📱 MOBILE POLISH: Phase 2, Point 5️⃣ - Native Modal UX */}
      {viewItem && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
          onClick={() => setViewItem(null)}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              {/* Modal header */}
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{viewItem.title}</h2>
                  <div className="flex items-center gap-2 mt-1 sm:mt-2">
                    <div className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                      viewItem.type === "premium" 
                        ? "bg-indigo-100 text-indigo-800" 
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {viewItem.type === "premium" ? "PREMIUM ITEM" : "FREE ITEM"}
                    </div>
                    {isCurrentUserOwnerMemo(viewItem) && (
                      <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        Your Item
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setViewItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>
              
              {/* 📱 MOBILE POLISH: Phase 2, Point 6️⃣ - Image Swipe Polish */}
              {/* Image carousel */}
              <div 
                className="relative w-full h-48 sm:h-64 bg-gray-100 rounded-lg overflow-hidden mb-4 sm:mb-6 flex items-center justify-center"
                onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  touchEndX.current = e.changedTouches[0].clientX;
                  const diff = touchStartX.current - touchEndX.current;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                      setImageIndex((i) => (i + 1) % (viewItem.images?.length || 1));
                    } else {
                      setImageIndex((i) => (i - 1 + (viewItem.images?.length || 1)) % (viewItem.images?.length || 1));
                    }
                  }
                }}
              >
                {viewItem.images?.length ? (
                  <>
                    <img
                      src={viewItem.images[imageIndex]}
                      alt={viewItem.title}
                      className="object-contain w-full h-full select-none"
                      draggable="false"
                    />
                    {viewItem.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageIndex((i) => (i - 1 + viewItem.images.length) % viewItem.images.length);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageIndex((i) => (i + 1) % viewItem.images.length);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                          {imageIndex + 1} / {viewItem.images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>
              
              {/* Description */}
              <p className="text-gray-700 text-sm sm:text-base mb-4 sm:mb-6">
                {viewItem.description || "No description provided."}
              </p>
              
              {/* ✅ DELIVERABLE D: Premium Timeline - Hidden on mobile */}
              {viewItem.type === "premium" && (
                <div className="hidden sm:block mb-6">
                  <PremiumTimeline 
                    currentStatus={viewItem.premiumStatus} 
                    isBuyer={isPremiumBuyerMemo(viewItem)}
                  />
                </div>
              )}
              
              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Price</div>
                    <div className={`text-xl sm:text-2xl font-bold ${
                      viewItem.type === "premium" 
                        ? "text-indigo-600" 
                        : "text-emerald-600"
                    }`}>
                      {viewItem.type === "premium" 
                        ? `¥${viewItem.price?.toLocaleString() || "0"}` 
                        : "FREE"}
                    </div>
                  </div>
                  
                  {viewItem.category && (
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Category</div>
                      <div className="text-gray-900">{viewItem.category}</div>
                    </div>
                  )}
                  
                  {viewItem.size && (
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Size</div>
                      <div className="text-gray-900 capitalize">{viewItem.size}</div>
                    </div>
                  )}
                </div>
                
                {/* ✅ DELIVERABLE E: Delivery estimate */}
                {viewItem.estimatedDelivery && (
                  <div className="bg-indigo-50 text-indigo-700 p-3 sm:p-4 rounded-lg">
                    <div className="text-sm font-medium mb-1">Estimated Delivery</div>
                    <div className="font-semibold">
                      ¥{viewItem.estimatedDelivery.min?.toLocaleString() || "0"}–¥
                      {viewItem.estimatedDelivery.max?.toLocaleString() || "0"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                {isSponsoredItemMemo(viewItem) && (
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Crown size={12} />
                    Sponsored
                  </span>
                )}
                
                {viewItem.verified && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                    ✅ Verified
                  </span>
                )}
                
                {isPremiumBuyerMemo(viewItem) && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <User size={12} />
                    Your Purchase
                  </span>
                )}
              </div>
              
              {/* 📱 MOBILE POLISH: Phase 3, Point 7️⃣ - Obvious Free Item Button */}
              {/* Action buttons */}
              {viewItem.type === "premium" ? (
                <>
                  {/* ✅ DELIVERABLE D & F: Premium Actions */}
                  {isCurrentUserOwnerMemo(viewItem) ? (
                    <PremiumSellerActions
                      item={viewItem}
                      updateFn={updatePremiumStatus}
                      onSuccess={(newStatus) => {
                        handlePremiumAction(newStatus);
                        refreshItemData();
                      }}
                    />
                  ) : (
                    <PremiumBuyerActions
                      item={viewItem}
                      updateFn={updatePremiumStatus}
                      onSuccess={(newStatus) => {
                        handlePremiumAction(newStatus);
                        refreshItemData();
                      }}
                      depositButton={
                        isPremiumAvailableMemo(viewItem) ? (
                          <ItemDepositButton
                            itemId={viewItem.id}
                            title={viewItem.title}
                            amountJPY={viewItem.price}
                            onSuccess={() => {
                              handlePremiumAction("depositPaid");
                              refreshItemData();
                            }}
                          />
                        ) : null
                      }
                    />
                  )}
                </>
              ) : (
                /* ✅ DELIVERABLE A: Free Request Button */
                <button
                  onClick={() => handleRequest(viewItem)}
                  disabled={
                    submitting ||
                    !isFreeRequestable(viewItem) ||
                    isFreeItemClosed(viewItem) ||
                    isCurrentUserOwnerMemo(viewItem)
                  }
                  className={`w-full h-12 rounded-xl font-medium transition-colors text-sm sm:text-base ${
                    submitting
                      ? "bg-gray-300 text-gray-600 cursor-wait"
                      : !isFreeRequestable(viewItem) 
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isFreeItemClosed(viewItem)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isCurrentUserOwnerMemo(viewItem)
                      ? "bg-yellow-100 text-yellow-800 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {submitting
                    ? "Submitting..."
                    : !isFreeRequestable(viewItem)
                    ? "Unavailable"
                    : isFreeItemClosed(viewItem)
                    ? "⏰ Closed"
                    : isCurrentUserOwnerMemo(viewItem)
                    ? "Your Item"
                    : "Request Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}