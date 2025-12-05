// ✅ FILE: src/pages/Items.js (FULLY CORRECTED PER 15-POINT LIST)
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
import { 
  X, ArrowLeft, ChevronLeft, ChevronRight, Search, 
  Crown, Package, Truck, CheckCircle, CreditCard,
  User, Clock, Ban, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { throttle } from "lodash";

const PAGE_SIZE = 12;

/* Helper: format countdown */
function formatTimeRemaining(endAt) {
  if (!endAt) return "";
  
  let end;
  if (endAt.toMillis) {
    end = endAt.toMillis();
  } else if (endAt.seconds) {
    end = endAt.seconds * 1000;
  } else if (typeof endAt === 'number') {
    end = endAt;
  } else {
    end = new Date(endAt).getTime();
  }
  
  const diff = Math.max(0, end - Date.now());
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 1000 / 3600);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

/* ✅ FIX 12: Enhanced validation for backwards compatibility */
const isValidItem = (item) => {
  if (!item || !item.id) return false;
  
  // Handle legacy items without title
  if (!item.title || item.title.trim() === "") {
    item.title = "Untitled Item";
  }
  
  // ✅ FIX 12: Handle legacy items without images
  if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
    // Legacy free items might have itemImage instead of images array
    if (item.itemImage) {
      item.images = [item.itemImage];
    } else if (item.imageUrl) {
      item.images = [item.imageUrl];
    } else {
      item.images = ["/images/default-item.jpg"];
    }
  }
  
  // ✅ FIX 12: Handle premium items missing price
  if (item.type === "premium" && !item.price && !item.priceJPY) {
    item.price = 0; // Default price
  }
  
  // ✅ FIX 12: Handle premium items missing status
  if (item.type === "premium" && !item.premiumStatus) {
    item.premiumStatus = "available"; // Default status
  }
  
  // ✅ FIX 12: Handle missing type (legacy items)
  if (!item.type) {
    item.type = item.price || item.priceJPY ? "premium" : "free";
  }
  
  return true;
};

/* ✅ FIX 5: Check if free item is requestable */
const isFreeRequestable = (item) => {
  return ["active", "sponsored", "relisted"].includes(item.status);
};

/* ✅ FIX 14: Enhanced free item closed check */
const isFreeItemClosed = (item) => {
  if (item.status === "closed") return true;
  
  if (!item.requestWindowEnd) {
    // Legacy items might not have requestWindowEnd
    if (item.createdAt) {
      // Default 24-hour window for legacy items
      let createdAt;
      if (item.createdAt.toMillis) {
        createdAt = item.createdAt.toMillis();
      } else if (item.createdAt.seconds) {
        createdAt = item.createdAt.seconds * 1000;
      } else {
        createdAt = new Date(item.createdAt).getTime();
      }
      return (Date.now() - createdAt) > (24 * 60 * 60 * 1000);
    }
    return false;
  }
  
  let end;
  if (item.requestWindowEnd.toMillis) {
    end = item.requestWindowEnd.toMillis();
  } else if (item.requestWindowEnd.seconds) {
    end = item.requestWindowEnd.seconds * 1000;
  } else {
    end = new Date(item.requestWindowEnd).getTime();
  }
  
  return end <= Date.now();
};

/* ✅ FIX 1: Filter items to show ONLY visible items */
const filterVisibleItems = (items) => {
  return items.filter(item => {
    if (!item) return false;
    
    // ✅ FIX 12: Ensure item has basic structure
    if (!isValidItem(item)) return false;
    
    // FREE ITEMS
    if (item.type !== "premium") {
      const freeVisibleStatuses = ["active", "sponsored", "relisted"];
      return freeVisibleStatuses.includes(item.status);
    }

    // PREMIUM ITEMS (✅ FIX 1: Phase 2 visibility rules)
    const visiblePremiumStatuses = [
      "available",
      "depositPaid", 
      "preparingDelivery",
      "inTransit",
      "delivered",
      "sold",
      "buyerDeclined",
      "cancelled",
      "autoClosed"
    ];
    return visiblePremiumStatuses.includes(item.premiumStatus);
  });
};

/* ✅ FIX 8 & 13: Enhanced Premium Status Configuration */
const premiumStatusConfig = {
  available: {
    label: "Available",
    color: "bg-emerald-100 text-emerald-800",
    badgeColor: "bg-emerald-600 text-white",
    ribbonColor: "from-emerald-500 to-green-500",
    timelineColor: "bg-emerald-500",
    icon: Package,
    stage: 1
  },
  depositPaid: {
    label: "Deposit Paid",
    color: "bg-amber-100 text-amber-800", 
    badgeColor: "bg-amber-500 text-white",
    ribbonColor: "from-amber-500 to-orange-500",
    timelineColor: "bg-amber-500",
    icon: CreditCard,
    stage: 2
  },
  preparingDelivery: {
    label: "Preparing Delivery",
    color: "bg-blue-100 text-blue-800",
    badgeColor: "bg-blue-600 text-white",
    ribbonColor: "from-blue-500 to-indigo-500",
    timelineColor: "bg-blue-500",
    icon: Package,
    stage: 3
  },
  inTransit: {
    label: "In Transit",
    color: "bg-purple-100 text-purple-800",
    badgeColor: "bg-purple-600 text-white",
    ribbonColor: "from-purple-500 to-violet-500",
    timelineColor: "bg-purple-500",
    icon: Truck,
    stage: 4
  },
  delivered: {
    label: "Delivered",
    color: "bg-indigo-100 text-indigo-800",
    badgeColor: "bg-indigo-600 text-white",
    ribbonColor: "from-indigo-500 to-blue-500",
    timelineColor: "bg-indigo-500",
    icon: CheckCircle,
    stage: 5
  },
  sold: {
    label: "Sold",
    color: "bg-gray-100 text-gray-800",
    badgeColor: "bg-gray-600 text-white",
    ribbonColor: "from-gray-500 to-gray-600",
    timelineColor: "bg-gray-500",
    icon: CheckCircle,
    stage: 6
  },
  buyerDeclined: {
    label: "Buyer Declined",
    color: "bg-red-100 text-red-800",
    badgeColor: "bg-red-600 text-white",
    ribbonColor: "from-red-500 to-rose-500",
    timelineColor: "bg-red-500",
    icon: Ban,
    stage: 0,
    isTerminal: true
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    badgeColor: "bg-gray-600 text-white",
    ribbonColor: "from-gray-500 to-gray-600",
    timelineColor: "bg-gray-500",
    icon: Ban,
    stage: 0,
    isTerminal: true
  },
  autoClosed: {
    label: "Auto Closed",
    color: "bg-gray-100 text-gray-800",
    badgeColor: "bg-gray-600 text-white",
    ribbonColor: "from-gray-500 to-gray-600",
    timelineColor: "bg-gray-500",
    icon: Clock,
    stage: 0,
    isTerminal: true
  }
};

/* ✅ FIX 13: Complete Premium Timeline Fix */
const PremiumTimeline = ({ currentStatus, isBuyer = false }) => {
  const mainStages = [
    { key: "available", label: "Available" },
    { key: "depositPaid", label: "Deposit Paid" },
    { key: "preparingDelivery", label: "Preparing" },
    { key: "inTransit", label: "In Transit" },
    { key: "delivered", label: "Delivered" },
    { key: "sold", label: "Sold" }
  ];
  
  const terminalStages = ["buyerDeclined", "cancelled", "autoClosed"];
  
  // Check if current status is terminal
  const isTerminal = terminalStages.includes(currentStatus);
  const currentConfig = premiumStatusConfig[currentStatus] || premiumStatusConfig.available;
  const currentStage = currentConfig.stage;
  
  if (isTerminal) {
    return (
      <div className="mt-4 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Transaction Ended</span>
        </div>
        <div className={`text-sm px-3 py-1 rounded-full inline-block ${currentConfig.color} font-medium`}>
          {currentConfig.label}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This item is no longer available for purchase.
        </p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 mb-3">
      <p className="text-xs font-medium text-gray-700 mb-2">
        {isBuyer ? "Your Purchase Progress:" : "Delivery Progress:"}
      </p>
      <div className="flex items-center justify-between relative">
        {mainStages.map((stage, index) => {
          const stageNum = index + 1;
          const isCompleted = stageNum <= currentStage;
          const isCurrent = stageNum === currentStage;
          const isBuyerStage = isBuyer && isCompleted;
          const IconComponent = premiumStatusConfig[stage.key]?.icon || Package;
          
          return (
            <div key={stage.key} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs z-10 ${
                isBuyerStage 
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                  : isCompleted 
                  ? premiumStatusConfig[stage.key]?.badgeColor || "bg-gray-600 text-white"
                  : "bg-gray-200 text-gray-400"
              } ${isCurrent ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}>
                <IconComponent size={14} />
              </div>
              <span className={`text-xs mt-1 text-center ${
                isBuyerStage ? "text-indigo-700 font-bold" :
                isCompleted ? "text-gray-800 font-medium" : "text-gray-400"
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
          <div 
            className={`h-full transition-all duration-300 ${
              currentStage >= 1 ? premiumStatusConfig[mainStages[currentStage - 1]?.key]?.timelineColor || "bg-emerald-500" : "bg-gray-300"
            }`}
            style={{ width: `${Math.min(((currentStage - 1) / (mainStages.length - 1)) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default function Items() {
  const navigate = useNavigate();
  const { currentUser, isSubscribed, trialCreditsLeft, isTrialExpired } = useAuth();

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

  /* ✅ FIX 7: Sync trial data */
  useEffect(() => {
    setTrialLeft(trialCreditsLeft);
    setTrialOver(isTrialExpired);
  }, [trialCreditsLeft, isTrialExpired]);

  /* Load Items */
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "donations"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .map((d) => {
          const data = { id: d.id, ...d.data() };
          // ✅ FIX 12: Apply backwards compatibility fixes
          isValidItem(data);
          return data;
        })
        .filter(item => item !== null);
      
      const filteredDocs = filterVisibleItems(docs);
      
      console.log("📦 Loaded items:", filteredDocs.length, 
        "Free Active:", filteredDocs.filter(item => item.type !== 'premium' && ["active", "sponsored", "relisted"].includes(item.status)).length,
        "Premium Available:", filteredDocs.filter(item => item.type === 'premium' && item.premiumStatus === 'available').length,
        "Premium In Progress:", filteredDocs.filter(item => item.type === 'premium' && item.premiumStatus !== 'available').length
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
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const newItems = snap.docs
          .map((d) => {
            const data = { id: d.id, ...d.data() };
            isValidItem(data); // Apply fixes
            return data;
          })
          .filter(item => item !== null);
        
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

  // Infinite scroll
  useEffect(() => {
    const handleScroll = throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 400) loadMore();
    }, 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // ✅ FIX 6: Keyboard navigation for drawer images
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

  /* ✅ FIX 2 & 5: Handle Request with premium guard */
  const handleRequest = useCallback(
    async (item) => {
      // ✅ FIX 2: Premium items should never enter free request flow
      if (item.type === "premium") {
        toast.error("This is a premium item - please use purchase flow.");
        return;
      }

      if (!currentUser) {
        toast.error("🔑 Please log in to request items.");
        navigate("/login");
        return;
      }
      if (submitting) return;
      setSubmitting(true);

      try {
        // ✅ FIX 5: Check if user owns the item
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

        // Double-check: premium items should never reach here
        if (item.type === "premium") {
          toast.error("This is a premium item - please use purchase flow.");
          setSubmitting(false);
          return;
        }
        
        // ✅ FIX 5: Use proper free item requestable check
        if (!isFreeRequestable(item)) {
          toast("🎁 This item is no longer available.");
          setSubmitting(false);
          return;
        }

        // ✅ FIX 14: Check if item is closed (expired)
        if (isFreeItemClosed(item)) {
          toast("⏰ Request window is closed for this item.");
          setSubmitting(false);
          return;
        }

        // ✅ FIX 7: Trial enforcement
        if (!isSubscribed && (trialOver || trialLeft <= 0)) {
          toast(
            "🎁 You've used all free requests. Please deposit ¥1,500 to continue!",
            { icon: "🙏" }
          );
          setShowSubscriptionModal(true);
          setSubmitting(false);
          return;
        }

        await onRequestCreateAddTicket({ itemId: item.id });
        toast.success("✅ Request submitted!");

        if (!isSubscribed) {
          try {
            // ✅ FIX 7: Handle trial credit decrement properly
            const result = await decrementTrialCredit();
            if (result?.trialCreditsLeft !== undefined) {
              toast.success(`Remaining credits: ${result.trialCreditsLeft}`);
            }
            if (result?.isTrialExpired) {
              setShowSubscriptionModal(true);
            }
          } catch (creditError) {
            console.error("Error decrementing trial credit:", creditError);
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

  const isPremiumBuyer = useCallback((item) => {
    return item.type === "premium" && item.buyerId === currentUser?.uid;
  }, [currentUser]);

  const isSponsoredItem = useCallback((item) => {
    return item.isSponsored || item.donorType === 'admin' || item.sponsoredBy || item.status === 'sponsored';
  }, []);

  const isPremiumAvailable = useCallback((item) => {
    return item.type === "premium" && item.premiumStatus === "available";
  }, []);

  const getPremiumStatusConfig = useCallback((item) => {
    const status = item.premiumStatus || "available";
    return premiumStatusConfig[status] || premiumStatusConfig.available;
  }, []);

  // ✅ FIX 3: Refresh function
  const refreshItemData = useCallback(async () => {
    if (!viewItem?.id) return;
    
    try {
      const itemDoc = await getDoc(doc(db, "donations", viewItem.id));
      if (itemDoc.exists()) {
        const updatedItem = { id: itemDoc.id, ...itemDoc.data() };
        // ✅ FIX 12: Apply backwards compatibility
        isValidItem(updatedItem);
        setViewItem(updatedItem);
        
        setItems(prev => prev.map(item => 
          item.id === viewItem.id ? updatedItem : item
        ));
      }
    } catch (error) {
      console.error("Error refreshing item data:", error);
    }
  }, [viewItem]);

  // ✅ FIX 4: Premium action handler
  const handlePremiumAction = useCallback(async (newStatus, successMessage) => {
    if (!viewItem?.id) return;
    
    try {
      const result = await updatePremiumStatus({ 
        itemId: viewItem.id, 
        status: newStatus 
      });
      
      if (result?.ok) {
        await refreshItemData();
        toast.success(successMessage || "Status updated successfully!");
      } else {
        toast.error("Failed to update premium status");
      }
    } catch (error) {
      console.error("Error handling premium action:", error);
      toast.error("Failed to update premium status");
    }
  }, [viewItem, refreshItemData]);

  return (
    <div className="min-h-screen bg-gray-50 relative w-full overflow-x-hidden">
      <SubscriptionBanner />
      
      <div className="bg-white/90 backdrop-blur border-b border-gray-100 py-3 px-4 flex justify-center sticky top-0 z-30 shadow-sm">
        <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            value={search}
            // ✅ FIX 9: Search input fix
            onChange={(e) =>
              setSearch(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))
            }
            placeholder="Search items or categories"
            className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm sm:text-base bg-white placeholder-gray-400"
          />
        </div>
      </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {items
              .filter((item) =>
                search
                  ? item.title?.toLowerCase().includes(search.toLowerCase()) ||
                    item.category?.toLowerCase().includes(search.toLowerCase())
                  : true
              )
              .map((item) => {
                const isPremium = item.type === "premium";
                const isClosed = isFreeItemClosed(item);
                const isOwner = isCurrentUserOwner(item);
                const isBuyer = isPremiumBuyer(item);
                const isSponsored = isSponsoredItem(item);
                const isRelisted = item.status === "relisted";
                const premiumAvailable = isPremiumAvailable(item);
                const premiumConfig = getPremiumStatusConfig(item);
                const isRequestable = isFreeRequestable(item) && !isClosed;

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl shadow hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden ${
                      // ✅ FIX 10: Cosmetic fixes - gradient ribbons
                      isSponsored 
                        ? 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200' 
                        : isRelisted
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                        : isPremium
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200'
                        : 'bg-white'
                    }`}
                    onClick={() => {
                      setViewItem(item);
                      setImageIndex(0);
                    }}
                  >
                    {/* ✅ FIX 10: Premium Status Ribbon */}
                    {isPremium && item.premiumStatus !== "available" && (
                      <div className={`absolute top-2 left-0 right-0 z-20 bg-gradient-to-r ${premiumConfig.ribbonColor} text-white text-xs px-3 py-1 text-center font-semibold`}>
                        {premiumConfig.label}
                      </div>
                    )}

                    {/* Premium Sold Out Overlay */}
                    {isPremium && item.premiumStatus === "sold" && (
                      <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
                        <div className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm">
                          SOLD OUT
                        </div>
                      </div>
                    )}

                    {/* ✅ FIX 10: Status Badges - fixed stacking */}
                    <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
                      {isSponsored && (
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                          <Crown size={12} />
                          Sponsored
                        </div>
                      )}
                      
                      {isRelisted && (
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          🔄 Relisted
                        </div>
                      )}

                      {/* ✅ FIX 7: Premium Buyer Badge */}
                      {isPremium && isBuyer && (
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                          <User size={12} />
                          Your Purchase
                        </div>
                      )}

                      {/* ✅ FIX 10: Premium Available Badge */}
                      {isPremium && premiumAvailable && (
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Available
                        </div>
                      )}
                    </div>

                    {isOwner && (
                      <div className="absolute top-2 left-2 z-20 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Your Item
                      </div>
                    )}

                    <div className="h-44 sm:h-52 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {item.images?.[0] ? (
                        // ✅ FIX 10: Fixed image object-contain vs cover
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                      {!isPremium && (
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            isClosed
                              ? "text-gray-400"
                              : "text-emerald-600"
                          }`}
                        >
                          {isClosed
                            ? "⏰ Request Closed"
                            : `⏱️ ${formatTimeRemaining(item.requestWindowEnd)}`}
                        </p>
                      )}

                      {/* ✅ FIX 10: Premium Status Display */}
                      {isPremium && (
                        <div className={`text-xs px-2 py-1 rounded-full inline-block ${premiumConfig.color} font-medium`}>
                          {premiumConfig.label}
                        </div>
                      )}

                      {/* ✅ FIX 10: Price + Size + Delivery Estimate row */}
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center justify-between">
                          {isPremium ? (
                            <span className="text-indigo-600 font-bold text-sm sm:text-base">
                              ¥{item.price?.toLocaleString() || item.priceJPY?.toLocaleString() || "—"}
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

                        {/* ✅ FIX 10: Fixed size + delivery row */}
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

      {/* ✅ FIX 6 & 15: Enhanced Drawer */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center"
          onClick={() => setViewItem(null)}
        >
          <div
            className={`bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:w-[90%] max-w-md p-6 relative max-h-[90vh] overflow-y-auto ${
              // ✅ FIX 10: Fixed border-left accent for each item state
              isSponsoredItem(viewItem)
                ? "border-l-4 border-purple-500"
                : viewItem.status === "relisted"
                ? "border-l-4 border-green-500"
                : viewItem.type === "premium"
                ? "border-l-4 border-indigo-500"
                : "border-l-4 border-emerald-500"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CLOSE BUTTONS */}
            <button
              onClick={() => setViewItem(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close drawer"
            >
              <X size={22} />
            </button>
            <button
              onClick={() => setViewItem(null)}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700 md:hidden"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>

            {/* ✅ FIX 15: Owner Label */}
            {isCurrentUserOwner(viewItem) && (
              <div className="absolute top-3 left-12 bg-yellow-500 text-white text-sm px-3 py-1 rounded-full font-semibold z-10">
                Your Item
              </div>
            )}

            {/* ✅ FIX 15: Sponsored */}
            {isSponsoredItem(viewItem) && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                <Crown size={16} />
                <span className="font-semibold">
                  Sponsored by {viewItem.sponsoredBy || "Freebies Japan"}
                </span>
              </div>
            )}

            {/* ✅ FIX 15: Relisted */}
            {viewItem.status === "relisted" && (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                <span className="font-semibold">🔄 This item has been relisted</span>
              </div>
            )}

            {/* ✅ FIX 15: Premium Status Header */}
            {viewItem.type === "premium" && viewItem.premiumStatus !== "available" && (
              <div
                className={`bg-gradient-to-r ${
                  getPremiumStatusConfig(viewItem).ribbonColor
                } text-white text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2`}
              >
                {React.createElement(
                  getPremiumStatusConfig(viewItem).icon,
                  { size: 16 }
                )}
                <span className="font-semibold">
                  {getPremiumStatusConfig(viewItem).label}
                </span>
              </div>
            )}

            {/* ✅ FIX 6 & 15: Image Carousel */}
            <div 
              className="relative w-full h-56 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center"
              onTouchStart={(e) => touchStartX.current = e.touches[0].clientX}
              onTouchEnd={(e) => {
                touchEndX.current = e.changedTouches[0].clientX;
                const diff = touchStartX.current - touchEndX.current;
                if (Math.abs(diff) > 50) {
                  if (diff > 0) {
                    // Swipe left
                    setImageIndex((i) => (i + 1) % (viewItem.images?.length || 1));
                  } else {
                    // Swipe right
                    setImageIndex((i) => (i - 1 + (viewItem.images?.length || 1)) % (viewItem.images?.length || 1));
                  }
                }
              }}
            >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageIndex(
                            (i) =>
                              (i - 1 + viewItem.images.length) %
                              viewItem.images.length
                          );
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageIndex((i) => (i + 1) % viewItem.images.length);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        {imageIndex + 1} / {viewItem.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <span className="text-gray-400 text-sm">No Image</span>
              )}
            </div>

            {/* TITLE + DESC */}
            <h2 className="text-lg font-semibold mb-1">{viewItem.title}</h2>
            <p className="text-sm text-gray-600 mb-3">
              {viewItem.description || "No description"}
            </p>

            {/* ✅ FIX 13: Complete Premium Timeline */}
            {viewItem.type === "premium" && (
              <PremiumTimeline 
                currentStatus={viewItem.premiumStatus} 
                isBuyer={isPremiumBuyer(viewItem)}
              />
            )}

            {/* DELIVERY ESTIMATE */}
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
                📦 Item Size:{" "}
                <b className="capitalize">{viewItem.size}</b>
              </p>
            )}

            {/* ✅ FIX 15: Status Badges */}
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

              {/* ✅ FIX 15: Premium Buyer Badge */}
              {isPremiumBuyer(viewItem) && (
                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <User size={12} />
                  Your Purchase
                </span>
              )}

              {/* ✅ FIX 15: Premium Status Badge */}
              {viewItem.type === "premium" && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    getPremiumStatusConfig(viewItem).badgeColor
                  }`}
                >
                  {getPremiumStatusConfig(viewItem).label}
                </span>
              )}
            </div>

            {/* ✅ FIX 15: Premium Actions */}
            {viewItem.type === "premium" ? (
              <>
                {/* PRICE */}
                <p className="text-2xl font-semibold text-indigo-600 mb-3">
                  ¥{viewItem.price?.toLocaleString() || "—"}
                </p>

                {/* ✅ FIX 15: Owner Actions */}
                {isCurrentUserOwner(viewItem) && (
                  <PremiumSellerActions
                    item={viewItem}
                    updateFn={updatePremiumStatus}
                    onSuccess={(newStatus) => {
                      handlePremiumAction(newStatus, "Status updated successfully!");
                      setTimeout(() => refreshItemData(), 500);
                    }}
                  />
                )}

                {/* ✅ FIX 15: Buyer Actions */}
                {!isCurrentUserOwner(viewItem) && (
                  <PremiumBuyerActions
                    item={viewItem}
                    updateFn={updatePremiumStatus}
                    onSuccess={(newStatus) => {
                      handlePremiumAction(newStatus, "Action completed successfully!");
                      setTimeout(() => refreshItemData(), 500);
                    }}
                    depositButton={
                      isPremiumAvailable(viewItem) ? (
                        <ItemDepositButton
                          itemId={viewItem.id}
                          title={viewItem.title}
                          amountJPY={viewItem.price}
                          onSuccess={() => {
                            handlePremiumAction("depositPaid", "Deposit paid successfully!");
                            setTimeout(() => refreshItemData(), 1000);
                          }}
                        />
                      ) : null
                    }
                  />
                )}
              </>
            ) : (
              /* ✅ FIX 8: Free Request Button with correct states */
              <button
                onClick={() => handleRequest(viewItem)}
                disabled={
                  submitting ||
                  !isFreeRequestable(viewItem) ||
                  isFreeItemClosed(viewItem) ||
                  isCurrentUserOwner(viewItem)
                }
                className={`px-6 py-3 rounded-lg font-medium w-full transition-colors ${
                  submitting
                    ? "bg-gray-300 text-gray-600 cursor-wait"
                    : !isFreeRequestable(viewItem) 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isFreeItemClosed(viewItem)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isCurrentUserOwner(viewItem)
                    ? "bg-yellow-100 text-yellow-800 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {submitting
                  ? "Submitting…"
                  : !isFreeRequestable(viewItem)
                  ? "Unavailable"
                  : isFreeItemClosed(viewItem)
                  ? "⏰ Closed"
                  : isCurrentUserOwner(viewItem)
                  ? "Your Item"
                  : "Request Now"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ✅ FIX 7 & 15: Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}