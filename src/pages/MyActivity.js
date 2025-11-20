// ✅ FILE: src/pages/MyActivity.js (PATCHED - Added Address Confirmation)
import React, { useEffect, useState, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocs,
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

// Import the specific card components
import RequestCard from "../components/MyActivity/RequestCard";
import DepositCard from "../components/MyActivity/DepositCard";

import DetailDrawer from "../components/MyActivity/DetailDrawer";
import PickupModal from "../components/MyActivity/PickupModal";
import AwardModal from "../components/MyActivity/AwardModal";
import ConfirmDeleteModal from "../components/MyActivity/ConfirmDeleteModal";
import NotificationCenter from "../components/MyActivity/NotificationCenter";
import AddressConfirmationModal from "../components/MyActivity/AddressConfirmationModal"; // NEW

import { Package, Loader2, CreditCard, Gift } from "lucide-react";
import toast from "react-hot-toast";

export default function MyActivity() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("requests");

  // Data sources
  const [requests, setRequests] = useState([]);
  const [deposits, setDeposits] = useState([]);

  // UI Controls
  const [drawer, setDrawer] = useState({ open: false, item: null });
  const [pickupModal, setPickupModal] = useState({ open: false, donation: null });
  const [awardModal, setAwardModal] = useState({ open: false, item: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [addressModal, setAddressModal] = useState({ open: false, item: null }); // NEW

  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState({
    page: true,
    delete: null,
    schedule: null,
    accept: null,
    confirm: null,
    address: null, // NEW
  });

  /* ======================================================
   * 🔥 REALTIME LISTENERS - ENHANCED with error handling
   * ====================================================== */

  useEffect(() => {
    if (!currentUser?.uid) {
      console.log("❌ No current user found");
      setLoading((p) => ({ ...p, page: false }));
      return;
    }

    console.log("🔄 Setting up MyActivity listeners for user:", currentUser.uid);

    let unsubRequests, unsubDeposits;

    try {
      // Requests listener
      // Requests listener - NOW MERGED WITH deliveryDetails SOURCE OF TRUTH
unsubRequests = onSnapshot(
  query(collection(db, "requests"), where("userId", "==", currentUser.uid)),
  async (snap) => {
    console.log("📥 Requests updated:", snap.size);
    const arr = [];

    for (const docSnap of snap.docs) {
      const r = docSnap.data();
      const requestId = docSnap.id;

      // ---------------------------
      // 1️⃣ Pull deliveryDetails (NEW PRIMARY SOURCE)
      // ---------------------------
      let delivery = null;
      try {
        const dSnap = await getDoc(doc(db, "deliveryDetails", requestId));
        if (dSnap.exists()) delivery = dSnap.data();
      } catch (err) {
        console.error("❌ Error loading deliveryDetails:", err);
      }

      // ---------------------------
      // 2️⃣ Fetch donation for title/image only (NO STATUS FROM HERE)
      // ---------------------------
      let itemData = null;
      if (r.itemId) {
        try {
          const donationSnap = await getDoc(doc(db, "donations", r.itemId));
          if (donationSnap.exists()) itemData = donationSnap.data();
        } catch (err) {
          console.error("❌ Donation fetch failed:", err);
        }
      }

      // ---------------------------
      // 3️⃣ MERGE — deliveryDetails overrides request data
      // ---------------------------
      arr.push({
        id: requestId,
        ...r,
        itemData,

        // 🔥 ALWAYS trust deliveryDetails > request > default
        deliveryStatus: delivery?.deliveryStatus || r.deliveryStatus || "pending",
        status: delivery?.status || r.status || "pending",

        // 🔥 Address Fields
        deliveryAddress: delivery?.deliveryAddress || r.deliveryAddress || null,
        deliveryPhone: delivery?.deliveryPhone || r.deliveryPhone || null,
        deliveryInstructions: delivery?.deliveryInstructions || r.deliveryInstructions || null,

        // 🔥 Timestamps
        awardAcceptedAt: delivery?.createdAt || r.awardAcceptedAt || null,
        updatedAt: delivery?.updatedAt || r.updatedAt || null,

        // Email fallback
        userEmail: r.userEmail || currentUser.email || null,
      });
    }

    setRequests(arr);
  },
  (error) => {
    console.error("❌ Requests listener error:", error);
    toast.error("Failed to load requests");
  }
);

       
      // Deposits listener
      unsubDeposits = onSnapshot(
        query(collection(db, "deposits"), where("userId", "==", currentUser.uid)),
        (snap) => {
          console.log("💰 Deposits updated:", snap.size);
          setDeposits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (error) => {
          console.error("❌ Deposits listener error:", error);
          toast.error("Failed to load deposits");
        }
      );

      setLoading((p) => ({ ...p, page: false }));

    } catch (error) {
      console.error("❌ Error setting up listeners:", error);
      setLoading((p) => ({ ...p, page: false }));
      toast.error("Failed to load activity data");
    }

    return () => {
      if (unsubRequests) unsubRequests();
      if (unsubDeposits) unsubDeposits();
    };
  }, [currentUser?.uid]);

  /* ======================================================
   * 🗑 DELETE HANDLER - ENHANCED with validation
   * ====================================================== */

  const handleDelete = async (item) => {
    if (!item?.id) {
      toast.error("Invalid item to delete");
      return;
    }

    setLoading((p) => ({ ...p, delete: item.id }));
    try {
      if (activeTab === "requests") {
        // Only allow deletion of pending or approved requests
        if (!['pending', 'approved'].includes(item.status)) {
          toast.error("Cannot delete this request in its current status");
          return;
        }
        
        await deleteDoc(doc(db, "requests", item.id));
        setRequests(prev => prev.filter(r => r.id !== item.id));
        toast.success("Request removed successfully.");
      } else if (activeTab === "deposits") {
        await deleteDoc(doc(db, "deposits", item.id));
        setDeposits(prev => prev.filter(dep => dep.id !== item.id));
        toast.success("Deposit record removed successfully.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete item: " + err.message);
    }

    setLoading((p) => ({ ...p, delete: null }));
    setDeleteModal({ open: false, item: null });
  };

  /* ======================================================
   * 🥇 AWARD ACCEPT / DECLINE - ENHANCED with Address Confirmation
   * ====================================================== */
// ✅ PATCHED: Enhanced award acceptance with debugging
const handleAcceptAward = (item) => {
  console.log('🎯 handleAcceptAward called with item:', {
    id: item?.id,
    hasId: !!item?.id,
    status: item?.status,
    userId: item?.userId,
    itemId: item?.itemId,
    itemName: item?.itemName,
    itemData: item?.itemData,
    // Log all keys to see what's available
    keys: item ? Object.keys(item) : 'no item'
  });

  if (!item?.id) {
    console.error('❌ handleAcceptAward: Missing item ID', item);
    toast.error("Invalid item to accept - missing ID");
    return;
  }

  if (item.status !== 'awarded') {
    console.warn('⚠️ handleAcceptAward: Item not in awarded status', item.status);
    toast.error("This item is not available for acceptance");
    return;
  }

  console.log('✅ Opening address modal for request:', item.id);
  setAddressModal({ open: true, item: item });
};

// ✅ PATCHED: Enhanced address confirmation with better error handling
// ✅ PATCHED: Fixed snackbar references - using toast instead
const handleAddressConfirmation = async (addressData) => {
  const { item, address, phone, instructions } = addressData;
  
  console.log('📍 handleAddressConfirmation called with:', {
    itemId: item?.id,
    hasItem: !!item,
    addressLength: address?.length,
    phoneLength: phone?.length,
    instructionsLength: instructions?.length
  });

  if (!item?.id) {
    console.error('❌ handleAddressConfirmation: Missing item ID', item);
    toast.error("Invalid item to confirm - missing ID");
    return;
  }

  if (!address?.trim() || !phone?.trim()) {
    toast.error("Address and phone number are required");
    return;
  }

  setLoading((p) => ({ ...p, address: item.id }));

  try {
    console.log('🔄 Starting address confirmation for request:', item.id);
    
    const updateData = {
      status: "accepted",
      deliveryStatus: "accepted",
      deliveryAddress: address.trim(),
      deliveryPhone: phone.trim(),
      deliveryInstructions: instructions?.trim() || "",
      awardAcceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log('📝 Firestore update data:', updateData);
    console.log('🔧 Updating document: requests/', item.id);

    // Update request with delivery details
    await updateDoc(doc(db, "requests", item.id), updateData);

    console.log("✅ Successfully accepted delivery with address for request:", item.id);
    
    // ✅ FIXED: Using toast instead of setSnackbar
    toast.success("🎉 Delivery details confirmed! Admin will contact you for pickup.");
    
    // Close modal and reset
    setAddressModal({ open: false, item: null });
    
  } catch (err) {
    console.error("❌ Address confirmation error:", err);
    console.error("❌ Error details:", {
      code: err.code,
      message: err.message,
      itemId: item?.id,
      firestoreError: err
    });
    
    if (err.code === 'permission-denied') {
      toast.error("Permission denied: Unable to update delivery details");
    } else if (err.code === 'not-found') {
      toast.error("Request not found. It may have been deleted.");
    } else {
      toast.error("Unable to confirm delivery details: " + err.message);
    }
  } finally {
    setLoading((p) => ({ ...p, address: null }));
  }
};

// ✅ PATCHED: Enhanced award decline with better user experience
const handleDeclineAward = async (item) => {
  console.log('❌ handleDeclineAward called with item:', {
    id: item?.id,
    hasId: !!item?.id,
    status: item?.status
  });

  if (!item?.id) {
    console.error('❌ handleDeclineAward: Missing item ID', item);
    toast.error("Invalid item to decline");
    return;
  }

  if (item.status !== 'awarded') {
    console.warn('⚠️ handleDeclineAward: Item not in awarded status', item.status);
    toast.error("This item is not available for decline");
    return;
  }

  const reason = window.prompt(
    "Please provide a reason for declining this award (optional):\n\n" +
    "This helps us improve our service.",
    ""
  );

  // If user cancels the prompt, don't proceed
  if (reason === null) {
    console.log('🚫 User cancelled decline operation');
    return;
  }

  setLoading((p) => ({ ...p, accept: item.id }));

  try {
    console.log('🔄 Declining award for request:', item.id);
    
    const updateData = {
      status: "declined",
      deliveryStatus: "declined",
      declineReason: reason?.trim() || "No reason provided",
      awardDeclinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log('📝 Decline update data:', updateData);

    await updateDoc(doc(db, "requests", item.id), updateData);

    console.log("✅ Successfully declined award for request:", item.id);
    
    toast.success("Offer declined. The item will be re-listed for others.");
    
    // Close any open modals
    setAwardModal({ open: false, item: null });
    setAddressModal({ open: false, item: null });
    
  } catch (err) {
    console.error("❌ Decline award error:", err);
    console.error("❌ Error details:", {
      code: err.code,
      message: err.message,
      itemId: item?.id
    });
    
    if (err.code === 'permission-denied') {
      toast.error("Permission denied: Unable to decline award");
    } else {
      toast.error("Unable to decline offer: " + err.message);
    }
  } finally {
    setLoading((p) => ({ ...p, accept: null }));
  }
};
 
  /* ======================================================
   * 🚚 PICKUP SCHEDULE - FIXED: Remove donation updates
   * ====================================================== */

  const handleSchedulePickup = async (donationId, pickupDate) => {
    if (!donationId || !pickupDate) {
      toast.error("Invalid pickup data");
      return;
    }

    setLoading((p) => ({ ...p, schedule: donationId }));

    try {
      // ✅ FIXED: Only update the request (users can't update donations)
      const requestSnap = await getDocs(
        query(collection(db, "requests"), 
        where("itemId", "==", donationId),
        where("status", "in", ["awarded", "accepted"])
        )
      );
      
      if (!requestSnap.empty) {
        await updateDoc(doc(db, "requests", requestSnap.docs[0].id), {
          deliveryStatus: "pickup_scheduled",
          pickupDate: pickupDate,
          pickupScheduledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("📅 Pickup scheduled successfully! Recipient has been notified.");
      } else {
        toast.error("No matching request found for this donation.");
      }
    } catch (err) {
      console.error("❌ Schedule pickup error:", err);
      toast.error("Could not schedule pickup: " + err.message);
    }

    setLoading((p) => ({ ...p, schedule: null }));
    setPickupModal({ open: false, donation: null });
  };

  /* ======================================================
   * 📦 DELIVERY CONFIRM - FIXED: Remove donation updates
   * ====================================================== */
  const handleConfirmDelivery = async (item) => {
    if (!item?.id) {
      toast.error("Invalid item to confirm delivery");
      return;
    }

    setLoading((p) => ({ ...p, confirm: item.id }));
    try {
      // ✅ FIXED: Only update request
      await updateDoc(doc(db, "requests", item.id), {
        deliveryStatus: "delivered",
        status: "completed",
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Successfully confirmed delivery for request:", item.id);
      
      toast.success("🎊 Delivery confirmed! Thank you for using Freebies Japan.");
    } catch (err) {
      console.error("❌ Confirm delivery error:", err);
      toast.error("Unable to confirm delivery: " + err.message);
    }

    setLoading((p) => ({ ...p, confirm: null }));
  };

  /* ======================================================
   * 🎯 AWARD ACTION HANDLER - NEW: Unified handler for award actions
   * ====================================================== */
  const handleAwardAction = (item, action) => {
    if (action === 'accept') {
      handleAcceptAward(item);
    } else if (action === 'decline') {
      handleDeclineAward(item);
    }
  };

  /* ======================================================
   * 🧮 DEBUG LOGGING
   * ====================================================== */

  // Debug logging
  console.log("🔍 MyActivity Debug:", {
    activeTab,
    requestsCount: requests.length,
    depositsCount: deposits.length,
    currentUser: currentUser?.uid,
    loading: loading.page
  });

  /* ======================================================
   * 🖼 MAIN UI WITH 2 TABS (FIXED & ENHANCED)
   * ====================================================== */

  if (loading.page)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-10 h-10 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your activity...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-4 flex justify-between items-center z-30 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Activity</h1>
          <p className="text-sm text-gray-600">Manage your requests and deposits</p>
        </div>

        <NotificationCenter
          notifications={notifications}
          onClearNotification={(id) =>
            setNotifications((prev) => prev.filter((n) => n.id !== id))
          }
          onClearAll={() => setNotifications([])}
        />
      </div>

      {/* TWO TABS - REQUESTS & DEPOSITS ONLY - ENHANCED */}
      <div className="flex border-b bg-white px-4 gap-6 text-sm font-medium sticky top-14 z-20">
        {[
          { key: "requests", label: "My Requests", icon: Gift, count: requests.length },
          { key: "deposits", label: "Deposits", icon: CreditCard, count: deposits.length }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-colors relative ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <IconComponent size={16} />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center ${
                  activeTab === tab.key 
                    ? "bg-blue-100 text-blue-600" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Grid - FIXED FILTERING */}
      <div className="p-4">
        {/* Empty State */}
        {activeTab === "requests" && requests.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No requests yet
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              You haven't made any requests for items yet.
            </p>
          </div>
        )}

        {activeTab === "deposits" && deposits.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No deposits yet
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              You haven't made any deposits yet.
            </p>
          </div>
        )}

        {/* Grid Layout - PROPERLY FILTERED */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Requests Tab - Only show when activeTab is "requests" */}
          {activeTab === "requests" && requests.map((req) => (
            <RequestCard
              key={req.id}
              item={req}
              onView={() => setDrawer({ open: true, item: req })}
              onDelete={() => setDeleteModal({ open: true, item: req })}
              onAwardAction={(item, action) => handleAwardAction(item, action)} // UPDATED
              deleting={loading.delete === req.id}
            />
          ))}

          {/* Deposits Tab - Only show when activeTab is "deposits" */}
          {activeTab === "deposits" && deposits.map((dep) => (
            <DepositCard
              key={dep.id}
              item={dep}
              onDelete={() => setDeleteModal({ open: true, item: dep })}
              deleting={loading.delete === dep.id}
            />
          ))}
        </div>
      </div>

      {/* MODALS & DRAWERS */}
      <DetailDrawer
        open={drawer.open}
        data={drawer.item}
        currentUser={currentUser}
        loadingStates={loading}
        onClose={() => setDrawer({ open: false, item: null })}
        onDelete={(item) => setDeleteModal({ open: true, item })}
        onSchedulePickup={(item) => setPickupModal({ open: true, donation: item })}
        onAcceptAward={handleAcceptAward} // UPDATED: Now opens address modal
        onDeclineAward={handleDeclineAward}
        onConfirmDelivery={handleConfirmDelivery}
      />

      {/* NEW: Address Confirmation Modal */}
     // In your MyActivity.js return statement, update the AddressConfirmationModal usage:
<AddressConfirmationModal
  open={addressModal.open}
  onClose={() => setAddressModal({ open: false, item: null })}
  request={addressModal.item}
  // ✅ REMOVE this onSuccess prop since we're using toast directly:
  // onSuccess={() => {
  //   setSnackbar({ 
  //     open: true, 
  //     message: 'Delivery details confirmed! Admin will contact you for pickup.', 
  //     severity: 'success' 
  //   });
  // }}
/>
      <AwardModal
        open={awardModal.open}
        item={awardModal.item}
        onClose={() => setAwardModal({ open: false, item: null })}
        onAccept={handleAcceptAward} // UPDATED: Now opens address modal
        onDecline={handleDeclineAward}
        loading={loading.accept}
      />

      <PickupModal
        open={pickupModal.open}
        donation={pickupModal.donation}
        onClose={() => setPickupModal({ open: false, donation: null })}
        loading={loading.schedule}
        onSchedule={handleSchedulePickup}
      />

      <ConfirmDeleteModal
        open={deleteModal.open}
        item={deleteModal.item}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={() => handleDelete(deleteModal.item)}
        loading={loading.delete === deleteModal.item?.id}
      />
    </div>
  );
}