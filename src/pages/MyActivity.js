// ======================================================================
// FILE: src/pages/MyActivity.js
// PHASE-2 FINAL — Mobile-First + Correct Paths + Stable Hooks
// COMPLETE PATCH: Batched Donations + Delivery Details + Seller Pickup + Dual Confirmation
// ======================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import {
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  collection,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";

import { db, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

import useMyRequests from "../components/MyActivity/hooks/useMyRequests";
import useMyPurchases from "../components/MyActivity/hooks/useMyPurchases";
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
import PickupModal from "../components/MyActivity/PickupModal";
import ConfirmActionModal from "../components/MyActivity/ConfirmActionModal";
import DeclineReasonModal from "../components/MyActivity/DeclineReasonModal";
import AddressConfirmationModal from "../components/MyActivity/AddressConfirmationModal";

import { Gift, ShoppingBag, List, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// ======================================================================
// HELPERS
// ======================================================================

const filterVisible = (arr) => arr?.filter((i) => i && !i.softDeleted) || [];

// Split array into chunks of N (Firestore "in" limit = 10)
const chunkArray = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

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
  // HOOK DATA
  // -------------------------------------
  const requests = useMyRequests(currentUser?.uid);
  const purchases = useMyPurchases(currentUser?.uid);
  const listings = useMyListings(currentUser?.uid);

  // -------------------------------------
  // DONATION JOIN STATE
  // -------------------------------------
  const [donationMap, setDonationMap] = useState({});
  const [donationLoading, setDonationLoading] = useState(false);

  // -------------------------------------
  // DELIVERY DETAILS STATE
  // -------------------------------------
  const [deliveryDetailsMap, setDeliveryDetailsMap] = useState({});
  const [loadingDeliveryDetails, setLoadingDeliveryDetails] = useState({});

  // ======================================================================
  // MODAL STATES
  // ======================================================================

  const [drawer, setDrawer] = useState({ open: false, type: null, item: null });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    item: null,
    action: null,
    message: "",
  });
  const [declineModal, setDeclineModal] = useState({ open: false, item: null });
  const [addressModal, setAddressModal] = useState({ open: false, item: null });
  const [pickupModal, setPickupModal] = useState({ 
    open: false, 
    donation: null,
    mode: "free",
    requestId: null 
  });
  const [relistModal, setRelistModal] = useState({ open: false, item: null });
  const [loading, setLoading] = useState({
    delete: null,
    premium: null,
    decline: null,
    address: null,
    schedule: null,
    relist: null,
  });

  // ======================================================================
  // MEMOIZED DERIVED DATA
  // ======================================================================

  const rawReq = useMemo(() => filterVisible(requests), [requests]);
  
  const visReq = useMemo(() => 
    rawReq.map((r) => ({
      ...r,
      donation: donationMap[r.itemId] || null,
    })), 
    [rawReq, donationMap]
  );

  const visPur = useMemo(() => filterVisible(purchases), [purchases]);
  const visList = useMemo(() => filterVisible(listings), [listings]);

  // Enhanced listings with request info for FREE items
  const listingsWithRequestInfo = useMemo(() => {
    return visList.map((listing) => {
      const deliveryDetails = listing.deliveryDetails || null;

      // ✅ Phase-2 correct: gate pickup on request lifecycle
      const hasActiveRequest =
        listing.requestStatus &&
        ["awarded", "accepted"].includes(listing.requestStatus);

      return {
        ...listing,
        deliveryDetails, // KEEP: seller visibility + future dual confirmation
        hasActiveRequest,
      };
    });
  }, [visList]);

  // ======================================================================
  // PATCH 1: UPDATED DONATION PREFETCH EFFECT (BATCHED)
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

        // Split into batches of 10 (Firestore "in" query limit)
        const batches = chunkArray(itemIds, 10);
        const mergedMap = {};

        // Fetch donations in parallel batches
        const batchPromises = batches.map(async (batch) => {
          const q = query(
            collection(db, "donations"),
            where("__name__", "in", batch)
          );

          const snap = await getDocs(q);
          return snap;
        });

        // Wait for all batches to complete
        const results = await Promise.all(batchPromises);
        
        // Merge all results
        results.forEach((snap) => {
          snap.forEach((doc) => {
            mergedMap[doc.id] = doc.data();
          });
        });

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

  const confirmDelete = useCallback(async () => {
    const { item } = confirmModal;
    if (!item || loading.delete) return;

    try {
      setLoading((s) => ({ ...s, delete: item.id }));
      const ref = !item.isPremium && item.userId
        ? doc(db, "requests", item.id)
        : item.isPremium && item.paymentId
        ? doc(db, "payments", item.paymentId)
        : doc(db, "donations", item.id);

      await updateDoc(ref, {
        softDeleted: true,
        deletedAt: serverTimestamp(),
      });
      toast.success("Item removed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading((s) => ({ ...s, delete: null }));
      setConfirmModal({ open: false, item: null, action: null, message: "" });
    }
  }, [confirmModal, loading.delete]);

  // ======================================================================
  // BACKLOG #3: DUAL CONFIRMATION DELIVERY HANDLERS
  // ======================================================================

  // BUYER confirms delivery (FREE or PREMIUM)
  const handleBuyerConfirmDelivery = useCallback(async (item) => {
    if (loading.premium) return;
    
    try {
      setLoading((s) => ({ ...s, premium: item.id }));
      const fn = httpsCallable(functions, "updateBuyerDeliveryConfirmation");
      const payload = item.isPremium ? { itemId: item.itemId } : { requestId: item.id };
      const res = await fn(payload);
      
      toast[res.data?.ok ? "success" : "error"](
        res.data?.ok ? "Delivery confirmed." : "Unable to confirm delivery."
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading((s) => ({ ...s, premium: null }));
    }
  }, [loading.premium]);

  // SELLER confirms delivery (FREE + PREMIUM)
  const handleSellerConfirmDelivery = useCallback(async (deliveryId) => {
    if (!deliveryId) return;

    try {
      await updateDoc(doc(db, "deliveryDetails", deliveryId), {
        sellerConfirmedAt: serverTimestamp(),
      });

      toast.success("Delivery confirmed (seller).");
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  // Decline award
  const submitDecline = useCallback(async (item, reason) => {
    if (loading.decline) return;

    try {
      setLoading((s) => ({ ...s, decline: item.id }));

      await updateDoc(doc(db, "requests", item.id), {
        status: "declined",
        softDeleted: true,
        declineReason: reason || "",
        updatedAt: serverTimestamp(),
      });

      toast.success("You declined the award.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeclineModal({ open: false, item: null });
      setLoading((s) => ({ ...s, decline: null }));
    }
  }, [loading.decline]);

  // Address submission
  const submitAddress = useCallback(
    async ({ item, address, phone, instructions }) => {
      if (loading.address) return;

      try {
        setLoading((s) => ({ ...s, address: item.id }));
        const batch = writeBatch(db);

        batch.update(doc(db, "requests", item.id), {
          status: "accepted",
          deliveryStatus: "accepted",
          updatedAt: serverTimestamp(),
        });

        batch.set(
          doc(db, "deliveryDetails", item.id),
          {
            deliveryStatus: "accepted",
            updatedAt: serverTimestamp(),
            addressInfo: { address, phone, instructions },
            requestId: item.id,
            itemId: item.itemId,
            userId: currentUser.uid,
          },
          { merge: true }
        );

        await batch.commit();
        toast.success("Address saved.");
      } catch (err) {
        toast.error(err.message);
      } finally {
        setAddressModal({ open: false, item: null });
        setLoading((s) => ({ ...s, address: null }));
      }
    },
    [currentUser, loading.address]
  );

  // ======================================================================
  // PATCH 2 & 3: ENHANCED DELIVERY DETAILS + SELLER PICKUP HANDLERS
  // ======================================================================

  // Seller schedules pickup (FREE items)
  const handlePickupSchedule = useCallback(async (item, pickupData) => {
    if (loading.schedule) return;

    try {
      setLoading((s) => ({ ...s, schedule: item.id }));

      // Check if this is FREE item scheduling
      if (pickupData && pickupData.requestId) {
        // FREE item: save to request document
        await updateDoc(doc(db, "requests", pickupData.requestId), {
          sellerPickupDate: pickupData.pickupDate || serverTimestamp(),
          sellerPickupWindow: pickupData.pickupWindow || "",
          sellerPickupStatus: "proposed",
          sellerPickupUpdatedAt: serverTimestamp(),
        });
        toast.success("Pickup date proposed.");
      } else {
        // PREMIUM item (mock)
        toast.success("Pickup scheduled (mock)");
      }
    } catch (err) {
      console.error("Pickup scheduling error:", err);
      toast.error(err.message || "Failed to schedule pickup");
    } finally {
      setPickupModal({ open: false, donation: null, mode: "free", requestId: null });
      setLoading((s) => ({ ...s, schedule: null }));
    }
  }, [loading.schedule]);

  // Fetch delivery details for listing
  const fetchListingDeliveryDetails = useCallback(async (listing) => {
    try {
      // Check if listing has a deliveryDetails field
      if (listing.deliveryDetails) {
        return listing.deliveryDetails;
      }
      
      // Check if there's a deliveryDetails collection entry
      const deliveryDoc = await getDoc(doc(db, "deliveryDetails", listing.id));
      if (deliveryDoc.exists()) {
        return deliveryDoc.data();
      }
      
      return null;
    } catch (err) {
      console.error("Error fetching listing delivery details:", err);
      return null;
    }
  }, []);

  // Enhanced view handler for listings
  const handleViewListing = useCallback(async (listing) => {
    setLoadingDeliveryDetails((prev) => ({ ...prev, [listing.id]: true }));
    
    try {
      // Fetch delivery details
      const deliveryDetails = await fetchListingDeliveryDetails(listing);
      
      // Create enhanced listing
      const enhancedListing = {
        ...listing,
        deliveryDetails: deliveryDetails,
        donation: listing.donation ? {
          ...listing.donation,
          deliveryDetails: deliveryDetails
        } : undefined
      };

      setDrawer({ 
        open: true, 
        type: "listing", 
        item: enhancedListing 
      });
    } catch (err) {
      console.error("Error loading listing details:", err);
      setDrawer({ 
        open: true, 
        type: "listing", 
        item: listing 
      });
    } finally {
      setLoadingDeliveryDetails((prev) => ({ ...prev, [listing.id]: false }));
    }
  }, [fetchListingDeliveryDetails]);

  // Schedule pickup handler for listings
  const handleListingSchedulePickup = useCallback((listing) => {
    if (!listing) return;

    const isFreeItem = listing.donation?.type !== "premium";

    // -------------------------------------------
    // FREE ITEMS — pickup must be request-gated
    // -------------------------------------------
    if (isFreeItem) {
      // requestId must come from request context, never fallback
      const requestId = listing.deliveryDetails?.requestId || null;

      if (!listing.hasActiveRequest || !requestId) {
        toast.error("Pickup cannot be scheduled yet.");
        return;
      }

      setPickupModal({
        open: true,
        donation: listing,
        requestId,
        mode: "free",
      });

      return;
    }

    // -------------------------------------------
    // PREMIUM ITEMS — logistics visibility / future confirmation
    // -------------------------------------------
    setPickupModal({
      open: true,
      donation: listing,
      mode: "premium",
    });
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
      toast.error(err.message);
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

  // ======================================================================
  // BACKLOG #3: AUTO-COMPLETE DELIVERY WHEN BOTH CONFIRM
  // ======================================================================

  // Auto-complete delivery when buyer + seller have confirmed
  useEffect(() => {
    const deliveries = [];

    visReq.forEach((r) => {
      if (r.deliveryDetails) deliveries.push(r.deliveryDetails);
    });

    visPur.forEach((p) => {
      if (p.deliveryDetails) deliveries.push(p.deliveryDetails);
    });

    deliveries.forEach(async (delivery) => {
      if (
        delivery.buyerConfirmedAt &&
        delivery.sellerConfirmedAt &&
        delivery.deliveryStatus !== "completed"
      ) {
        try {
          await updateDoc(doc(db, "deliveryDetails", delivery.id), {
            deliveryStatus: "completed",
            deliveryCompletedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Auto-complete delivery failed:", err);
        }
      }
    });
  }, [visReq, visPur]);

  // ======================================================================
  // RENDER
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

    // Show donation loading only for requests tab
    if (activeTab === "requests" && donationLoading && visReq.length > 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="animate-spin text-gray-400 mb-4" size={28} />
          <p className="text-sm text-gray-500">Loading donation details...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "requests":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visReq.map((req) => (
              <RequestCard
                key={req.id}
                item={req}
                currentUser={currentUser}
                onView={() => setDrawer({ open: true, type: "free", item: req })}
                onDelete={() => handleDelete(req)}
                onAwardAction={(item, action) => {
                  action === "accept"
                    ? setAddressModal({ open: true, item })
                    : setDeclineModal({ open: true, item });
                }}
              />
            ))}
          </div>
        );

      case "purchases":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visPur.map((p) => (
              <PurchaseCard
                key={p.id}
                item={p}
                onView={() => setDrawer({ open: true, type: "premium", item: p })}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        );

      case "listings":
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
                onSellerConfirmDelivery={handleSellerConfirmDelivery}
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
  // ENHANCED DRAWER HANDLING
  // ======================================================================

  const renderDrawer = () => {
    if (!drawer.open) return null;

    switch (drawer.type) {
      case "free":
        return (
          <DetailDrawerFree
            open={drawer.open}
            item={drawer.item}
            currentUser={currentUser}
            onClose={() => setDrawer({ open: false, type: null, item: null })}
            onBuyerConfirm={() => handleBuyerConfirmDelivery(drawer.item)}
            onDelete={() => handleDelete(drawer.item)}
            onAcceptAward={() => setAddressModal({ open: true, item: drawer.item })}
            onDeclineAward={() => setDeclineModal({ open: true, item: drawer.item })}
            onSellerConfirmDelivery={handleSellerConfirmDelivery}
          />
        );

      case "premium":
        return (
          <DetailDrawerPremium
            open={drawer.open}
            item={drawer.item}
            currentUser={currentUser}
            onClose={() => setDrawer({ open: false, type: null, item: null })}
            onBuyerConfirm={() => handleBuyerConfirmDelivery(drawer.item)}
            onDelete={() => handleDelete(drawer.item)}
            onSchedulePickup={() => setPickupModal({ open: true, donation: drawer.item, mode: "premium" })}
            showDeliveryDetails={!!drawer.item?.deliveryDetails}
            onSellerConfirmDelivery={handleSellerConfirmDelivery}
          />
        );

      case "listing":
        return (
          <DetailDrawerPremium
            open={drawer.open}
            item={drawer.item}
            currentUser={currentUser}
            onClose={() => setDrawer({ open: false, type: null, item: null })}
            onBuyerConfirm={() => handleBuyerConfirmDelivery(drawer.item)}
            onDelete={() => handleDelete(drawer.item)}
            onSchedulePickup={() => setPickupModal({ 
              open: true, 
              donation: drawer.item,
              mode: drawer.item?.donation?.type === "premium" ? "premium" : "free"
            })}
            showDeliveryDetails={!!drawer.item?.deliveryDetails}
            onSellerConfirmDelivery={handleSellerConfirmDelivery}
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

      {/* CONTENT */}
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

      <PickupModal
        open={pickupModal.open}
        donation={pickupModal.donation}
        loading={loading.schedule}
        onClose={() => setPickupModal({ open: false, donation: null, mode: "free", requestId: null })}
        onSchedule={(pickupData) => {
          if (pickupModal.donation) {
            handlePickupSchedule(pickupModal.donation, pickupData);
          }
        }}
        mode={pickupModal.mode}
        requestId={pickupModal.requestId}
      />

      <DeclineReasonModal
        open={declineModal.open}
        item={declineModal.item}
        loading={loading.decline === declineModal.item?.id}
        onSubmit={(reason) => submitDecline(declineModal.item, reason)}
        onClose={() => setDeclineModal({ open: false, item: null })}
      />

      <AddressConfirmationModal
        open={addressModal.open}
        request={addressModal.item}
        loading={loading.address === addressModal.item?.id}
        onConfirm={submitAddress}
        onClose={() => setAddressModal({ open: false, item: null })}
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