// ======================================================================
// FILE: src/pages/MyActivity.js
// PHASE-2 FINAL — SAFE VERSION
// All permission issues fixed, no crashes, graceful degradation
// ======================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";

import { db, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import useMyListings from "../components/MyActivity/hooks/useMyListings";

// CARDS
import RequestCard from "../components/MyActivity/RequestCard";
import PurchaseCard from "../components/MyActivity/PurchaseCard";
import ListingCard from "../components/MyActivity/ListingCard";

// DRAWERS
import DetailDrawerFree from "../components/MyActivity/drawer/DetailDrawerFree";
import DetailDrawerPremium from "../components/MyActivity/drawer/DetailDrawerPremium";

// MODALS
import RelistModal from "../components/MyActivity/RelistModal";
import ConfirmActionModal from "../components/MyActivity/ConfirmActionModal";
import AddressConfirmationModal from "../components/MyActivity/AddressConfirmationModal";

import { Gift, ShoppingBag, List, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// ======================================================================
// ERROR TRACKING (TEMPORARY - FOR DEBUGGING)
// ======================================================================

// Override console.error to capture all Firebase errors
const originalError = console.error;
console.error = function(...args) {
  // Check if it's a Firebase permission error
  if (args[0]?.message?.includes?.('Missing or insufficient permissions') ||
      args[0]?.code === 'permission-denied') {
    console.warn('🔴 CAPTURED FIREBASE PERMISSION ERROR:', {
      error: args[0],
      stack: new Error().stack, // Get call stack
      timestamp: new Date().toISOString()
    });
  }
  originalError.apply(console, args);
};

// Log all Firestore operations
const logFirestoreOp = (operation, path, success = true) => {
  if (!success) {
    console.warn(`🔴 Firestore ${operation} failed: ${path}`);
  }
};

// ======================================================================
// HELPERS
// ======================================================================

const filterVisible = (arr) => arr?.filter(Boolean) || [];

// Split array into chunks of N (Firestore "in" limit = 10)
const chunkArray = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// ======================================================================
// LOCALSTORAGE HELPERS (ADDED FOR ALL TYPES)
// ======================================================================

const getHiddenItems = (type) => {
  try {
    return JSON.parse(localStorage.getItem(`hidden${type}`) || "{}");
  } catch {
    return {};
  }
};

const hideItem = (type, itemId) => {
  const hidden = getHiddenItems(type);
  hidden[itemId] = true;
  localStorage.setItem(`hidden${type}`, JSON.stringify(hidden));
};

// Specific helpers for each type (backward compatible)
const getHiddenRequests = () => getHiddenItems("Requests");
const hideRequest = (requestId) => hideItem("Requests", requestId);

const getHiddenPurchases = () => getHiddenItems("Purchases");
const hidePurchase = (purchaseId) => hideItem("Purchases", purchaseId);

const getHiddenListings = () => getHiddenItems("Listings");
const hideListing = (listingId) => hideItem("Listings", listingId);

// ======================================================================
// MEMOIZED COMPONENTS
// ======================================================================

const MemoTabBtn = memo(({ label, icon: Icon, active, count, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center flex-1 py-3 border-b-2 transition-all duration-200 ${
      active
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-700"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <Icon size={18} />
    <span className="text-xs mt-1">{label}</span>
    {count > 0 && (
      <span className="absolute top-1 right-3 text-[10px] bg-gray-200 px-1.5 rounded-full">
        {count}
      </span>
    )}
  </button>
));

const MemoFAB = memo(({ navigate }) => (
  <button
    onClick={() => navigate("/donate")}
    className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-lg transition-all duration-200 active:scale-95"
  >
    <Plus size={20} />
    <span>List Item</span>
  </button>
));

// ======================================================================
// MAIN COMPONENT
// ======================================================================

export default function MyActivity() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const tabSwitchRef = useRef({ isSwitching: false, timeout: null });

  // -------------------------------------
  // TAB STATE
  // -------------------------------------
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("myActivityActiveTab") || "requests"
  );
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("myActivityActiveTab", activeTab);
  }, [activeTab]);

  // -------------------------------------
  // DATA STATES
  // -------------------------------------
  const [requests, setRequests] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const listings = useMyListings(currentUser?.uid);

  
  const [dataLoading, setDataLoading] = useState({
    requests: true,
    purchases: true,
  });

  // ======================================================================
  // DONATION JOIN STATE
  // ======================================================================
  const [donationMap, setDonationMap] = useState({});
  const [donationLoading, setDonationLoading] = useState(false);

  // -------------------------------------
  // LOADING STATES
  // -------------------------------------
  const [loadingDeliveryDetails, setLoadingDeliveryDetails] = useState({});
 
  // ======================================================================
  // MODAL STATES
  // ======================================================================

  // PATCH 1: Replace drawer state
  const [drawer, setDrawer] = useState({
    open: false,
    type: null,      // "free" | "premium" | "listing"
    itemId: null,    // 🔑 ID ONLY
  });

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    item: null,
    action: null,
    message: "",
  });
  const [addressModal, setAddressModal] = useState({ open: false, item: null });
  const [relistModal, setRelistModal] = useState({ open: false, item: null });
  const [loading, setLoading] = useState({
    delete: null,
    premium: null,
    address: null,
    relist: null,
  });

  // ======================================================================
  // DATA FETCHING (SAFE, NO CRASHES)
  // ======================================================================

  // Fetch requests (with safe deliveryDetails handling)
  useEffect(() => {
    if (!currentUser?.uid) {
      setRequests([]);
      setDataLoading(prev => ({ ...prev, requests: false }));
      return;
    }

    let mounted = true;

    const fetchRequests = async () => {
      try {
        setDataLoading(prev => ({ ...prev, requests: true }));
        
        // Fetch user's requests
        const requestsQuery = query(
          collection(db, "requests"),
          where("userId", "==", currentUser.uid)
        );
        
        const requestsSnap = await getDocs(requestsQuery);
        const requestsData = requestsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }));

        // Get donations for these requests
        const itemIds = [...new Set(requestsData.map(r => r.itemId).filter(Boolean))];
        let donations = [];
        
        if (itemIds.length > 0) {
          try {
            // Split into batches for Firestore "in" query limit
            const batches = chunkArray(itemIds, 10);
            for (const batch of batches) {
              const donationsQuery = query(
                collection(db, "donations"),
                where("__name__", "in", batch)
              );
              const donationsSnap = await getDocs(donationsQuery);
              donationsSnap.forEach(doc => {
                donations.push({ id: doc.id, ...doc.data() });
              });
            }
          } catch (err) {
            console.warn("Donations fetch partial failure:", err);
          }
        }

        const donationLookup = donations.reduce((acc, d) => {
          acc[d.id] = d;
          return acc;
        }, {});

        // Enhanced requests with donations
       const enhancedRequests = requestsData.map(req => ({
  ...req,
  donation: donationLookup[req.itemId] || null,

  // 🔑 Phase-2 authoritative delivery mirror (FREE items)
  deliveryData: {
    deliveryStatus: req.deliveryStatus || null,
    deliveryAddress: req.deliveryAddress || null,
    deliveryPhone: req.deliveryPhone || null,
    addressSubmitted:
      req.addressSubmitted === true ||
      (!!req.deliveryAddress && !!req.deliveryPhone),
  },
}));


        if (mounted) {
          setRequests(enhancedRequests);
        }
      } catch (error) {
        console.warn("Requests fetch failed:", error);
        if (mounted) {
          setRequests([]);
        }
      } finally {
        if (mounted) {
          setDataLoading(prev => ({ ...prev, requests: false }));
        }
      }
    };

    fetchRequests();

    return () => {
      mounted = false;
    };
  }, [currentUser?.uid]); // Removed hiddenRequestIds dependency

  // Fetch purchases (with safe deliveryDetails handling)
  useEffect(() => {
    if (!currentUser?.uid) {
      setPurchases([]);
      setDataLoading(prev => ({ ...prev, purchases: false }));
      return;
    }

    let mounted = true;

    const fetchPurchases = async () => {
      try {
        setDataLoading(prev => ({ ...prev, purchases: true }));
        
        // Fetch user's purchases
        const purchasesQuery = query(
          collection(db, "payments"),
          where("userId", "==", currentUser.uid),
          where("type", "==", "item")
        );
        
        const purchasesSnap = await getDocs(purchasesQuery);
        const purchasesData = purchasesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => p.userId === currentUser.uid); // Extra safety filter

        // Get donations for these purchases
        const itemIds = [...new Set(purchasesData.map(p => p.itemId).filter(Boolean))];
        let donations = [];
        
        if (itemIds.length > 0) {
          try {
            const batches = chunkArray(itemIds, 10);
            for (const batch of batches) {
              const donationsQuery = query(
                collection(db, "donations"),
                where("__name__", "in", batch)
              );
              const donationsSnap = await getDocs(donationsQuery);
              donationsSnap.forEach(doc => {
                donations.push({ id: doc.id, ...doc.data() });
              });
            }
          } catch (err) {
            console.warn("Purchases donations fetch partial failure:", err);
          }
        }

        const donationLookup = donations.reduce((acc, d) => {
          acc[d.id] = d;
          return acc;
        }, {});

        // Enhanced purchases with donations
        const enhancedPurchases = purchasesData.map(purchase => ({
  ...purchase,
  donation: donationLookup[purchase.itemId] || null,
  isPremium: true,

  // 🔒 Phase-2: delivery may not exist yet (COD)
  deliveryData: null,
}));

        

        if (mounted) {
          setPurchases(enhancedPurchases);
        }
      } catch (error) {
        console.warn("Purchases fetch failed:", error);
        if (mounted) {
          setPurchases([]);
        }
      } finally {
        if (mounted) {
          setDataLoading(prev => ({ ...prev, purchases: false }));
        }
      }
    };

    fetchPurchases();

    return () => {
      mounted = false;
    };
  }, [currentUser?.uid]);

  
  // ======================================================================
  // MEMOIZED DERIVED DATA WITH FILTERING
  // ======================================================================

  // Filter requests using localStorage
  const filteredRequests = useMemo(() => {
    const hidden = getHiddenRequests();
    return requests.filter((r) => !hidden[r.id]);
  }, [requests]);

  const rawReq = useMemo(() => filterVisible(filteredRequests), [filteredRequests]);
  
  const visReq = useMemo(() => 
    rawReq.map((r) => ({
      ...r,
      donation: donationMap[r.itemId] || r.donation || null,
    })), 
    [rawReq, donationMap]
  );

  // Filter purchases using localStorage
  const filteredPurchases = useMemo(() => {
    const hidden = getHiddenPurchases();
    return purchases.filter((p) => !hidden[p.id]);
  }, [purchases]);

  const visPur = useMemo(() => filterVisible(filteredPurchases), [filteredPurchases]);

  // Filter listings using localStorage
  const filteredListings = useMemo(() => {
  const hidden = getHiddenListings();
  return (listings || []).filter((l) => !hidden[l.id]);
}, [listings]);


  const visList = useMemo(() => filterVisible(filteredListings), [filteredListings]);

  // Enhanced listings with request info for FREE items
  const listingsWithRequestInfo = useMemo(() => {
    return visList.map((listing) => {
      // ✅ Phase-2 correct: gate pickup on request lifecycle
      const hasActiveRequest = listing.hasActiveRequest || false;

      return {
        ...listing,
        hasActiveRequest,
      };
    });
  }, [visList]);

  // PATCH 2: Add derived drawer item (authoritative)
  const drawerItem = useMemo(() => {
    if (!drawer.open || !drawer.itemId) return null;

    if (drawer.type === "free") {
      return visReq.find((r) => r.id === drawer.itemId) || null;
    }

    if (drawer.type === "premium") {
      return visPur.find((p) => p.id === drawer.itemId) || null;
    }

    if (drawer.type === "listing") {
      return listingsWithRequestInfo.find((l) => l.id === drawer.itemId) || null;
    }

    return null;
  }, [drawer, visReq, visPur, listingsWithRequestInfo]);

  // ======================================================================
  // DONATION PREFETCH FOR REQUESTS TAB
  // ======================================================================

  useEffect(() => {
    if (!rawReq.length) return;

    const loadDonations = async () => {
      try {
        setDonationLoading(true);
        
        const itemIds = [
          ...new Set(rawReq.map((r) => r.itemId).filter(Boolean)),
        ];

        if (!itemIds.length) {
          setDonationLoading(false);
          return;
        }

        const batches = chunkArray(itemIds, 10);
        const mergedMap = {};

        // Fetch donations in batches
        for (const batch of batches) {
          try {
            const q = query(
              collection(db, "donations"),
              where("__name__", "in", batch)
            );

            const snap = await getDocs(q);
            snap.forEach((doc) => {
              mergedMap[doc.id] = doc.data();
            });
          } catch (err) {
            console.warn("Donation batch fetch partial failure", err);
          }
        }

        setDonationMap(mergedMap);
      } catch (err) {
        console.error("Donation batch fetch failed", err);
      } finally {
        setDonationLoading(false);
      }
    };

    loadDonations();
  }, [rawReq]);

  // ======================================================================
  // ACTION HANDLERS (DEFINED BEFORE ANY USE)
  // ======================================================================

  // Tab switching
  const handleTabSwitch = useCallback((tab) => {
    if (tab === activeTab || tabSwitchRef.current.isSwitching) return;

    if (tabSwitchRef.current.timeout) {
      clearTimeout(tabSwitchRef.current.timeout);
    }

    tabSwitchRef.current.isSwitching = true;
    setTabLoading(true);

    requestAnimationFrame(() => {
      setActiveTab(tab);
      
      tabSwitchRef.current.timeout = setTimeout(() => {
        setTabLoading(false);
        tabSwitchRef.current.isSwitching = false;
      }, 50);
    });
  }, [activeTab]);

  // Delete handlers
  const handleDelete = useCallback((item) => {
    setConfirmModal({
      open: true,
      item,
      action: "delete",
      message: "Remove this item from My Activity?",
    });
  }, []);

  // PATCH 2: PATCH confirmDelete (UPDATED WITH LOCALSTORAGE FOR ALL TYPES)
  const confirmDelete = useCallback(() => {
    const { item } = confirmModal;
    if (!item) return;

    // Determine item type
    const isRequest = item.userId && !item.isPremium; // Request has userId, not premium
    const isPurchase = item.isPremium === true || item.paymentId; // Purchase is premium or has paymentId
    const isListing = item.donorId === currentUser?.uid; // Listing has donorId matching current user

    if (isRequest) {
      // UI-ONLY soft delete for requests (Phase-2 correct)
      hideRequest(item.id);
      toast.success("Request removed from your activity");
    } 
    else if (isPurchase) {
      // UI-ONLY soft delete for purchases
      hidePurchase(item.id);
      // Also remove from state for immediate UI update
      setPurchases(prev => prev.filter(p => p.id !== item.id));
      toast.success("Purchase removed from your activity");
    }
    else if (isListing) {
      // UI-ONLY soft delete for listings
     hideListing(item.id);
  toast.success("Listing removed from your activity");
}
    else {
      // Fallback - just close modal
      console.warn("Unknown item type in confirmDelete:", item);
      toast.error("Unable to remove item");
    }

    setConfirmModal({
      open: false,
      action: null,
      item: null,
      message: "",
    });
  }, [confirmModal, currentUser?.uid]);

  // ======================================================================
  // DUAL CONFIRMATION DELIVERY HANDLERS (PHASE-2 SAFE)
  // ======================================================================

  // BUYER confirms delivery (FREE or PREMIUM) - PHASE-2 COMPLIANT
 const handleBuyerConfirmDelivery = useCallback(
  async (item) => {
    if (!item || loading.premium) return;

    // 🔒 Phase-2 authoritative delivery ID resolution
    const deliveryId =
      item.deliveryData?.id ||
      item.deliveryId ||
      item.id;

    if (!deliveryId) {
      toast.error("Delivery record not found.");
      return;
    }

    try {
      setLoading((s) => ({ ...s, premium: deliveryId }));

      // 🔑 PHASE-2 CANONICAL FUNCTION
      const fn = httpsCallable(functions, "recipientConfirmDelivery");

      await fn({
        requestId: deliveryId,
        accepted: true,
      });

      toast.success("✅ Delivery confirmed.");
    } catch (err) {
      console.error("BuyerConfirmDelivery error:", err);
      toast.error(
        err?.message || "Failed to confirm delivery."
      );
    } finally {
      setLoading((s) => ({ ...s, premium: null }));
    }
  },
  [loading.premium]
);


  // ADDRESS SUBMISSION (BUYER → BACKEND-AUTHORITATIVE)
 const submitAddress = useCallback(
  async ({
    requestId,
    deliveryAddress,
    deliveryPhone,
    deliveryInstructions,
  }) => {
    if (!requestId || loading.address) return;

    try {
      setLoading((s) => ({ ...s, address: requestId }));

      const fn = httpsCallable(functions, "submitDeliveryDetails");

      await fn({
        requestId,
        deliveryAddress,
        deliveryPhone,
        deliveryInstructions: deliveryInstructions || "",
      });

      toast.success("🎉 Delivery details confirmed!");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message || "Failed to save delivery details."
      );
    } finally {
      setAddressModal({ open: false, item: null });
      setLoading((s) => ({ ...s, address: null }));
    }
  },
  [loading.address]
);

  // Enhanced view handler for listings
  const handleViewListing = useCallback((listing) => {
    setLoadingDeliveryDetails((prev) => ({ ...prev, [listing.id]: true }));
    
    try {
      // Store only ID in drawer
      setDrawer({
        open: true,
        type: "listing",
        itemId: listing.id,
      });
    } catch (err) {
      console.error("Error loading listing details:", err);
      setDrawer({
        open: true,
        type: "listing",
        itemId: listing.id,
      });
    } finally {
      setLoadingDeliveryDetails((prev) => ({ ...prev, [listing.id]: false }));
    }
  }, []);

  // Schedule pickup handler for listings - PHASE-2 COMPLIANT
  const handleListingSchedulePickup = useCallback((listing) => {
    if (!listing) return;

    const isFreeItem = listing.type !== "premium";


    if (isFreeItem) {
      if (!listing.hasActiveRequest) {
        toast.error("Pickup cannot be scheduled yet.");
        return;
      }

      toast.info("Use the pickup scheduler in the item details");
      return;
    }

    // PREMIUM ITEMS — logistics visibility / future confirmation
    toast.info("Premium item pickup handled by admin logistics");
  }, []);

  // Relist item
  const handleRelist = useCallback(async (item) => {
    if (loading.relist) return;

    try {
      setLoading((s) => ({ ...s, relist: item.id }));

      await updateDoc(doc(db, "donations", item.id), {
        status: "relisted",
        updatedAt: serverTimestamp(),
      });

      toast.success("Item relisted.");
    } catch (err) {
      if (err.code === 'permission-denied') {
        toast.error("You don't have permission to relist this item.");
      } else {
        toast.error(err.message);
      }
    } finally {
      setRelistModal({ open: false, item: null });
      setLoading((s) => ({ ...s, relist: null }));
    }
  }, [loading.relist]);

  // ======================================================================
  // CLEANUP
  // ======================================================================

  useEffect(() => {
    return () => {
      if (tabSwitchRef.current.timeout) {
        clearTimeout(tabSwitchRef.current.timeout);
      }
    };
  }, []);

  // Safety auto-close
  useEffect(() => {
    if (drawer.open && !drawerItem) {
      setDrawer({ open: false, type: null, itemId: null });
    }
  }, [drawer.open, drawerItem]);

  // ======================================================================
  // RENDER WITH GRACEFUL DEGRADATION
  // ======================================================================

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  // ======================================================================
  // CONTENT RENDERER
  // ======================================================================

  const renderContent = () => {
    if (tabLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </div>
      );
    }

    const showEmptyState = (message) => (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 mb-2">{message}</p>
      </div>
    );

    switch (activeTab) {
      case "requests":
        if (dataLoading.requests) {
          return (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-400 mb-4" size={28} />
              <p className="text-sm text-gray-500">Loading requests...</p>
            </div>
          );
        }
        if (donationLoading && visReq.length > 0) {
          return (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-400 mb-4" size={28} />
              <p className="text-sm text-gray-500">Loading donation details...</p>
            </div>
          );
        }
        if (visReq.length === 0) {
          return showEmptyState("No requests yet");
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visReq.map((req) => (
              <RequestCard
                key={req.id}
                item={req}
                currentUser={currentUser}
                onView={() => setDrawer({ open: true, type: "free", itemId: req.id })}
                onDelete={() => handleDelete(req)}
                onAwardAction={(item, action) => {
                  if (
                    action === "accept" &&
                    item.deliveryStatus === "pending_seller_confirmation"
                  ) {
                    toast.info("Delivery address already submitted.");
                    return;
                  }

                  action === "accept"
                    ? setAddressModal({ open: true, item })
                    : handleDelete(item);
                }}
              />
            ))}
          </div>
        );

      case "purchases":
        if (dataLoading.purchases) {
          return (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-400 mb-4" size={28} />
              <p className="text-sm text-gray-500">Loading purchases...</p>
            </div>
          );
        }
        if (visPur.length === 0) {
          return showEmptyState("No purchases yet");
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visPur.map((p) => (
              <PurchaseCard
                key={p.id}
                item={p}
                onView={() => setDrawer({ open: true, type: "premium", itemId: p.id })}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        );

      case "listings":
  // Listings now come from useMyListings hook
  // No separate loading flag — empty array means either loading or no data

  if (!Array.isArray(listingsWithRequestInfo)) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="animate-spin text-gray-400 mb-4" size={28} />
        <p className="text-sm text-gray-500">Loading listings...</p>
      </div>
    );
  }

  if (listingsWithRequestInfo.length === 0) {
    return showEmptyState("No listings yet");
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listingsWithRequestInfo.map((l) => (
        <ListingCard
          key={l.id}
          item={l}
          currentUser={currentUser}
          onView={() => handleViewListing(l)}
          onDelete={() => handleDelete(l)}
          onRelist={() => setRelistModal({ open: true, item: l })}
          onSchedulePickup={() => handleListingSchedulePickup(l)}
          isLoading={loadingDeliveryDetails[l.id]}
          showDeliveryInfo={true}
        />
      ))}
    </div>
  );

      default:
        return null;
    }
  };

  // ======================================================================
  // ENHANCED DRAWER HANDLING (PHASE-2 CLEAN)
  // ======================================================================

  const renderDrawer = () => {
    if (!drawer.open || !drawerItem) return null;

    switch (drawer.type) {
      case "free":
        return (
          <DetailDrawerFree
            open={drawer.open}
            item={drawerItem}
            currentUser={currentUser}
            onClose={() => setDrawer({ open: false, type: null, itemId: null })}
            onDelete={() => handleDelete(drawerItem)}
            onAcceptAward={() => setAddressModal({ open: true, item: drawerItem })}
            onDeclineAward={() => handleDelete(drawerItem)}
          />
        );

      case "premium":
        return (
          <DetailDrawerPremium
            open={drawer.open}
            item={drawerItem}
            currentUser={currentUser}
            onClose={() => setDrawer({ open: false, type: null, itemId: null })}
            onDelete={() => handleDelete(drawerItem)}
            showDeliveryDetails={!!drawerItem?.deliveryDetails}
          />
        );

        case "listing":
  if (drawerItem.type === "premium") {
    return (
      <DetailDrawerPremium
        open={drawer.open}
        item={drawerItem}
        currentUser={currentUser}
        onClose={() => setDrawer({ open: false, type: null, itemId: null })}
        onDelete={() => handleDelete(drawerItem)}
        showDeliveryDetails
      />
    );
  }

  return (
    <DetailDrawerFree
      open={drawer.open}
      item={drawerItem}
      currentUser={currentUser}
      onClose={() => setDrawer({ open: false, type: null, itemId: null })}
      onDelete={() => handleDelete(drawerItem)}
    />
  );


     

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}
      <div className="sticky top-0 bg-white border-b p-4 z-20">
        <h1 className="text-xl font-bold">My Activity</h1>
        <p className="text-xs text-gray-500">
          Track your requests, purchases & listings
        </p>
      </div>

      {/* TABS */}
      <div className="sticky top-[64px] bg-white border-b flex h-14 px-2 relative">
        <MemoTabBtn
          label="Requests"
          icon={Gift}
          active={activeTab === "requests"}
          count={visReq.length}
          onClick={() => handleTabSwitch("requests")}
          disabled={tabLoading}
        />
        <MemoTabBtn
          label="Purchases"
          icon={ShoppingBag}
          active={activeTab === "purchases"}
          count={visPur.length}
          onClick={() => handleTabSwitch("purchases")}
          disabled={tabLoading}
        />
        <MemoTabBtn
          label="Listings"
          icon={List}
          active={activeTab === "listings"}
          count={visList.length}
          onClick={() => handleTabSwitch("listings")}
          disabled={tabLoading}
        />
        {tabLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={20} />
          </div>
        )}
      </div>

      {/* F-8: Credit visibility (informational only) */}
      <div className="px-4 pt-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-medium">Credits left:</span>{" "}
          <span className="font-semibold text-slate-900">
            {typeof currentUser?.trialCreditsLeft === "number"
              ? currentUser.trialCreditsLeft
              : 0}
          </span>
          <span className="ml-2 text-xs text-slate-500">
            (used only when you receive an item — requests are always free)
          </span>
        </div>
      </div>

      <div className="p-4">
        {renderContent()}
      </div>

      <MemoFAB navigate={navigate} />

      {/* DRAWERS */}
      {renderDrawer()}

      {/* MODALS */}
      <RelistModal
        open={relistModal.open}
        item={relistModal.item}
        loading={loading.relist === relistModal.item?.id}
        onClose={() => setRelistModal({ open: false, item: null })}
        onRelist={handleRelist}
      />

      <AddressConfirmationModal
        open={addressModal.open}
        request={addressModal.item}
        loading={
          Boolean(
            addressModal.item &&
            loading.address === addressModal.item.id
          )
        }
        onConfirm={submitAddress}
        onClose={() =>
          setAddressModal({ open: false, item: null })
        }
      />

      <ConfirmActionModal
        open={confirmModal.open}
        message={confirmModal.message}
        loading={loading.delete === confirmModal.item?.id}
        onConfirm={confirmDelete}
        onClose={() =>
          setConfirmModal({
            open: false,
            action: null,
            item: null,
            message: "",
          })
        }
      />
    </div>
  );
}