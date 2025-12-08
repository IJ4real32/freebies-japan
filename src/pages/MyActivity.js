// ===============================================================
// FILE: src/pages/MyActivity.jsx
// FINAL — PHASE 2 STABLE BUILD (NULL-SAFE + UI + ACTIONS)
// ===============================================================

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

import { useAuth } from "../contexts/AuthContext";

import RequestCard from "../components/MyActivity/RequestCard";
import PurchaseCard from "../components/MyActivity/PurchaseCard";
import DepositCard from "../components/MyActivity/DepositCard";
import ListingCard from "../components/MyActivity/ListingCard";

import DetailDrawer from "../components/MyActivity/DetailDrawer";
import PickupModal from "../components/MyActivity/PickupModal";
import ConfirmActionModal from "../components/MyActivity/ConfirmActionModal";
import DeclineReasonModal from "../components/MyActivity/DeclineReasonModal";
import AddressConfirmationModal from "../components/MyActivity/AddressConfirmationModal";
import RelistModal from "../components/MyActivity/RelistModal";

import {
  Loader2,
  Gift,
  CreditCard,
  List,
  ShoppingBag,
  Plus,
} from "lucide-react";

import toast from "react-hot-toast";

/* -----------------------------------------------------------
   NULL-SAFE FILTER
----------------------------------------------------------- */
const filterVisible = (items) =>
  items?.filter((i) => i && !i.softDeleted) || [];

/* -----------------------------------------------------------
   PREMIUM STATUS NORMALIZER
----------------------------------------------------------- */
const normalizePremiumStatus = (status) => {
  const allowed = [
    "available",
    "depositPaid",
    "sellerAccepted",
    "preparingDelivery",
    "inTransit",
    "delivered",
    "sold",
    "cancelled",
    "buyerDeclined",
    "rejected",
    "completed",
    "autoClosed",
  ];
  return allowed.includes(status) ? status : "available";
};

/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */
export default function MyActivity() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const hasLoaded = useRef(false);

  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("myActivityActiveTab") || "requests"
  );

  const [requests, setRequests] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [listings, setListings] = useState([]);

  const [drawer, setDrawer] = useState({
    open: false,
    item: null,
    type: null,
  });

  const [pickupModal, setPickupModal] = useState({
    open: false,
    donation: null,
  });

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    item: null,
    type: null,
    action: null,
    message: null,
  });

  const [declineModal, setDeclineModal] = useState({
    open: false,
    item: null,
  });

  const [addressModal, setAddressModal] = useState({
    open: false,
    item: null,
  });

  const [relistModal, setRelistModal] = useState({
    open: false,
    item: null,
  });

  const [loading, setLoading] = useState({
    page: true,
    delete: null,
    accept: null,
    confirm: null,
    schedule: null,
    premium: null,
    relist: null,
  });

  /* -----------------------------------------------------------
     INITIAL HYDRATION (FULL DATA LOAD)
  ----------------------------------------------------------- */
  const loadData = useCallback(async () => {
    if (!currentUser || hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      setLoading((s) => ({ ...s, page: true }));
      const uid = currentUser.uid;

      // ------------------------------------
      // 1) FREE REQUESTS
      // ------------------------------------
      const reqSnap = await getDocs(
        query(
          collection(db, "requests"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        )
      );

      const reqData = await Promise.all(
        reqSnap.docs.map(async (d) => {
          const r = d.data();
          if (!r || r.softDeleted) return null;

          let donation = null;
          let delivery = null;

          if (r.itemId) {
            const ds = await getDoc(doc(db, "donations", r.itemId));
            if (ds.exists()) donation = ds.data();
          }

          const ddSnap = await getDocs(
            query(
              collection(db, "deliveryDetails"),
              where("requestId", "==", d.id)
            )
          );

          if (!ddSnap.empty) delivery = ddSnap.docs[0].data();

          return {
            id: d.id,
            ...r,
            itemData: donation,
            deliveryData: delivery,
            status: delivery?.status || r.status,
          };
        })
      );

      setRequests(filterVisible(reqData));

      // ------------------------------------
      // 2) PREMIUM PURCHASES
      // ------------------------------------
      const purSnap = await getDocs(
        query(
          collection(db, "payments"),
          where("userId", "==", uid),
          where("type", "==", "item"),
          orderBy("createdAt", "desc")
        )
      );

      const purData = await Promise.all(
        purSnap.docs.map(async (d) => {
          const p = d.data();
          if (!p || p.softDeleted) return null;

          let donation = null;
          if (p.targetId) {
            const ds = await getDoc(doc(db, "donations", p.targetId));
            if (ds.exists()) donation = ds.data();
          }

          return {
            id: d.id,
            ...p,
            isPremium: true,
            premiumStatus: normalizePremiumStatus(p.status),
            donation,
          };
        })
      );

      setPurchases(filterVisible(purData));

      // ------------------------------------
      // 3) DEPOSITS
      // ------------------------------------
      const depSnap = await getDocs(
        query(collection(db, "payments"), where("userId", "==", uid))
      );

      setDeposits(
        depSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((i) => i && !i.softDeleted)
      );

      // ------------------------------------
      // 4) USER LISTINGS
      // ------------------------------------
      const listSnap = await getDocs(
        query(
          collection(db, "donations"),
          where("donorId", "==", uid),
          where("donorType", "==", "user"),
          orderBy("createdAt", "desc")
        )
      );

      setListings(
        listSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((i) => i && !i.softDeleted)
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not load activity.");
    }

    setLoading((s) => ({ ...s, page: false }));
  }, [currentUser]);

  /* -----------------------------------------------------------
     REALTIME SNAPSHOTS (NULL SAFE)
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!currentUser) return;

    loadData();
    const uid = currentUser.uid;

    const unsub = [];

    // -----------------------
    // FREE REQUESTS
    // -----------------------
    unsub.push(
      onSnapshot(
        query(
          collection(db, "requests"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        ),
        async (snap) => {
          const loaded = await Promise.all(
            snap.docs.map(async (d) => {
              const r = d.data();
              if (!r || r.softDeleted) return null;

              let donation = null;
              let delivery = null;

              if (r.itemId) {
                const ds = await getDoc(doc(db, "donations", r.itemId));
                if (ds.exists()) donation = ds.data();
              }

              const dd = await getDocs(
                query(
                  collection(db, "deliveryDetails"),
                  where("requestId", "==", d.id)
                )
              );

              if (!dd.empty) delivery = dd.docs[0].data();

              return {
                id: d.id,
                ...r,
                itemData: donation,
                deliveryData: delivery,
                status: delivery?.status || r.status,
              };
            })
          );

          setRequests(filterVisible(loaded));
        }
      )
    );

    // -----------------------
    // PREMIUM PURCHASES
    // -----------------------
    unsub.push(
      onSnapshot(
        query(
          collection(db, "payments"),
          where("userId", "==", uid),
          where("type", "==", "item"),
          orderBy("createdAt", "desc")
        ),
        async (snap) => {
          const loaded = await Promise.all(
            snap.docs.map(async (d) => {
              const p = d.data();
              if (!p || p.softDeleted) return null;

              let donation = null;
              if (p.targetId) {
                const ds = await getDoc(doc(db, "donations", p.targetId));
                if (ds.exists()) donation = ds.data();
              }

              return {
                id: d.id,
                ...p,
                isPremium: true,
                premiumStatus: normalizePremiumStatus(p.status),
                donation,
              };
            })
          );

          setPurchases(filterVisible(loaded));
        }
      )
    );

    // -----------------------
    // DEPOSITS
    // -----------------------
    unsub.push(
      onSnapshot(
        query(collection(db, "payments"), where("userId", "==", uid)),
        (snap) =>
          setDeposits(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((i) => i && !i.softDeleted)
          )
      )
    );

    // -----------------------
    // LISTINGS
    // -----------------------
    unsub.push(
      onSnapshot(
        query(
          collection(db, "donations"),
          where("donorId", "==", uid),
          where("donorType", "==", "user")
        ),
        (snap) =>
          setListings(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((i) => i && !i.softDeleted)
          )
      )
    );

    return () => unsub.forEach((fn) => fn && fn());
  }, [currentUser, loadData]);

  /* -----------------------------------------------------------
     ACTION HANDLERS (Soft delete, premium, accept, decline…)
----------------------------------------------------------- */

  const handleDeleteItem = useCallback((item, type) => {
    setConfirmModal({
      open: true,
      item,
      type,
      action: "soft_delete",
      message: "Remove this item from your activity?",
    });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    const { item, type, action } = confirmModal;

    try {
      if (!item) return;

      setLoading((s) => ({ ...s, delete: item.id }));

      let ref = null;

      if (type === "request") ref = doc(db, "requests", item.id);
      if (type === "deposit" || type === "purchase")
        ref = doc(db, "payments", item.id);
      if (type === "listing") ref = doc(db, "donations", item.id);

      if (!ref) throw new Error("Invalid delete target.");

      if (action === "soft_delete") {
        await updateDoc(ref, {
          softDeleted: true,
          deletedAt: serverTimestamp(),
        });
        toast.success("Removed from activity.");
      }

      if (action === "cancel_purchase") {
        const fn = httpsCallable(functions, "cancelPremiumPurchase");
        const res = await fn({ paymentId: item.id });

        res?.data?.success
          ? toast.success("Purchase cancelled.")
          : toast.error("Cancellation failed.");
      }
    } catch (err) {
      toast.error(err.message);
    }

    setLoading((s) => ({ ...s, delete: null }));
    setConfirmModal({ open: false, item: null, type: null, action: null });
  }, [confirmModal]);

  const handleAcceptAward = useCallback((item) => {
    setAddressModal({ open: true, item });
  }, []);

  const handleDeclineAward = useCallback((item) => {
    setDeclineModal({ open: true, item });
  }, []);

  const submitDeclineReason = useCallback(
    async (item, reason) => {
      if (!item) return;

      setLoading((s) => ({ ...s, accept: item.id }));

      try {
        const batch = writeBatch(db);

        batch.update(doc(db, "requests", item.id), {
          status: "declined",
          deliveryStatus: "declined",
          declineReason: reason || "",
          softDeleted: true,
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        toast.success("Request declined.");
      } catch (err) {
        toast.error(err.message);
      }

      setDeclineModal({ open: false, item: null });
      setLoading((s) => ({ ...s, accept: null }));
    },
    []
  );
  const handleAddressConfirmation = useCallback(
  async ({ item, address, phone, instructions }) => {
    if (!item) return;

    setLoading((s) => ({ ...s, address: item.id }));

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, "requests", item.id), {
        status: "accepted",
        deliveryStatus: "accepted",
        updatedAt: serverTimestamp(),
      });

      batch.set(
        doc(db, "deliveryDetails", item.id),
        {
          status: "accepted",
          deliveryStatus: "accepted",
          updatedAt: serverTimestamp(),
          addressInfo: {
            address,
            phone,
            instructions: instructions || "",
          },
          requestId: item.id,
          userId: currentUser.uid,
          itemId: item.itemId,
        },
        { merge: true }
      );

      await batch.commit();
      toast.success("Address saved!");
    } catch (err) {
      toast.error(err.message);
    }

    setAddressModal({ open: false, item: null });
    setLoading((s) => ({ ...s, address: null }));
  },
  [currentUser]
);


  const handleConfirmDelivery = useCallback(async (item) => {
    if (!item) return;

    setLoading((s) => ({ ...s, confirm: item.id }));

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, "requests", item.id), {
        status: "completed",
        deliveryStatus: "delivered",
        deliveredAt: serverTimestamp(),
        softDeleted: true,
      });

      await batch.commit();
      toast.success("Delivery confirmed!");
    } catch (err) {
      toast.error(err.message);
    }

    setLoading((s) => ({ ...s, confirm: null }));
  }, []);

  const handlePremiumAction = useCallback(async (item, action) => {
    if (action === "cancel_purchase") {
      return setConfirmModal({
        open: true,
        item,
        type: "purchase",
        action: "cancel_purchase",
        message: "Cancel premium purchase?",
      });
    }

    if (action === "confirm_delivery") {
      try {
        setLoading((s) => ({ ...s, premium: item.id }));

        const fn = httpsCallable(functions, "confirmPremiumDelivery");
        const res = await fn({ paymentId: item.id });

        res?.data?.success
          ? toast.success("Premium delivery confirmed!")
          : toast.error("Failed to confirm.");

      } catch (err) {
        toast.error(err.message);
      }

      setLoading((s) => ({ ...s, premium: null }));
    }
  }, []);

  const handleSchedulePickup = useCallback(
  async (donationId, date) => {
    if (!donationId) return;

    setLoading((s) => ({ ...s, schedule: donationId }));

    try {
      const snap = await getDocs(
        query(
          collection(db, "requests"),
          where("itemId", "==", donationId),
          where("status", "in", ["awarded", "accepted"])
        )
      );

      if (snap.empty) {
        toast.error("No active request found.");
        return;
      }

      const requestId = snap.docs[0].id;

      const batch = writeBatch(db);

      batch.update(doc(db, "requests", requestId), {
        deliveryStatus: "pickup_scheduled",
        pickupDate: date,
        updatedAt: serverTimestamp(),
      });

      batch.set(
        doc(db, "deliveryDetails", requestId),
        {
          deliveryStatus: "pickup_scheduled",
          pickupDate: date,
          updatedAt: serverTimestamp(),
          requestId,
        },
        { merge: true }
      );

      await batch.commit();
      toast.success("Pickup scheduled!");
    } catch (err) {
      toast.error(err.message);
    }

    setPickupModal({ open: false, donation: null });
    setLoading((s) => ({ ...s, schedule: null }));
  },
  []
);

  const handleRelistItem = useCallback(async (item) => {
    setLoading((s) => ({ ...s, relist: item.id }));

    try {
      await updateDoc(doc(db, "donations", item.id), {
        status: "relisted",
        updatedAt: serverTimestamp(),
      });

      toast.success("Item relisted.");
    } catch (err) {
      toast.error(err.message);
    }

    setRelistModal({ open: false, item: null });
    setLoading((s) => ({ ...s, relist: null }));
  }, []);

  /* -----------------------------------------------------------
     UI COMPONENTS
----------------------------------------------------------- */

  const TabButton = ({ label, icon: Icon, active, count, onClick }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-3 border-b-2 relative ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
      }`}
    >
      <Icon size={18} className="mb-1" />
      <span className="text-xs font-medium">{label}</span>

      {count > 0 && (
        <span className="absolute -top-1 right-3 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded-full">
          {count}
        </span>
      )}
    </button>
  );

  const FloatingActionButton = () => (
    <button
      onClick={() => navigate("/donate")}
      className="fixed bottom-24 right-6 z-[999] bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center gap-2 px-4 py-3 rounded-full"
    >
      <Plus size={20} />
      <span className="text-sm font-semibold">List Item</span>
    </button>
  );

  const EmptyState = ({ icon: Icon, title, desc }) => (
    <div className="bg-white border rounded-xl p-10 text-center">
      <Icon className="mx-auto mb-4 text-gray-300" size={52} />
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{desc}</p>
    </div>
  );

  /* -----------------------------------------------------------
     MAIN RENDER
----------------------------------------------------------- */

  if (loading.page) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 size={36} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="sticky top-0 bg-white border-b z-30 p-4 shadow-sm">
        <h1 className="text-xl font-bold">My Activity</h1>
        <p className="text-xs text-gray-500">
          Manage requests, purchases, deposits & listings
        </p>
      </div>

      {/* TAB BAR */}
      <div className="sticky top-[64px] bg-white border-b z-20 px-2 flex h-14 items-center">
        <TabButton
          label="Requests"
          icon={Gift}
          active={activeTab === "requests"}
          count={filterVisible(requests).length}
          onClick={() => setActiveTab("requests")}
        />
        <TabButton
          label="Purchases"
          icon={ShoppingBag}
          active={activeTab === "purchases"}
          count={filterVisible(purchases).length}
          onClick={() => setActiveTab("purchases")}
        />
        <TabButton
          label="Deposits"
          icon={CreditCard}
          active={activeTab === "deposits"}
          count={filterVisible(deposits).length}
          onClick={() => setActiveTab("deposits")}
        />
        <TabButton
          label="Listings"
          icon={List}
          active={activeTab === "listings"}
          count={filterVisible(listings).length}
          onClick={() => setActiveTab("listings")}
        />
      </div>

      {/* CONTENT */}
      <div className="p-4">

        {/* EMPTY STATES */}
        {activeTab === "requests" && filterVisible(requests).length === 0 && (
          <EmptyState
            icon={Gift}
            title="No Requests"
            desc="You haven't requested any items yet."
          />
        )}

        {activeTab === "purchases" &&
          filterVisible(purchases).length === 0 && (
            <EmptyState
              icon={ShoppingBag}
              title="No Purchases"
              desc="Your premium purchases will appear here."
            />
          )}

        {activeTab === "deposits" &&
          filterVisible(deposits).length === 0 && (
            <EmptyState
              icon={CreditCard}
              title="No Deposits"
              desc="Your payment deposits will appear here."
            />
          )}

        {activeTab === "listings" &&
          filterVisible(listings).length === 0 && (
            <EmptyState
              icon={List}
              title="No Listings"
              desc="You haven't listed any items yet."
            />
          )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* REQUEST CARDS */}
          {activeTab === "requests" &&
            filterVisible(requests).map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                deleting={loading.delete === item.id}
                onView={() =>
                  setDrawer({ open: true, type: "request", item })
                }
                onDelete={() => handleDeleteItem(item, "request")}
                onAwardAction={(i, action) =>
                  action === "accept"
                    ? handleAcceptAward(i)
                    : handleDeclineAward(i)
                }
              />
            ))}

          {/* PURCHASE CARDS */}
          {activeTab === "purchases" &&
            filterVisible(purchases).map((item) => (
              <PurchaseCard
                key={item.id}
                item={item}
                loading={loading.premium === item.id}
                onDelete={() => handleDeleteItem(item, "purchase")}
                onView={() =>
                  setDrawer({ open: true, type: "purchase", item })
                }
                onPremiumAction={(action) =>
                  handlePremiumAction(item, action)
                }
              />
            ))}

          {/* DEPOSIT CARDS */}
          {activeTab === "deposits" &&
            filterVisible(deposits).map((item) => (
              <DepositCard
                key={item.id}
                item={item}
                deleting={loading.delete === item.id}
                onDelete={() => handleDeleteItem(item, "deposit")}
              />
            ))}

          {/* LISTINGS */}
          {activeTab === "listings" &&
            filterVisible(listings).map((listing) => (
              <ListingCard
                key={listing.id}
                item={listing}
                loading={loading.delete === listing.id}
                onView={() =>
                  setDrawer({
                    open: true,
                    type: "listing",
                    item: listing,
                  })
                }
                onRelist={() =>
                  setRelistModal({ open: true, item: listing })
                }
                onDelete={() => handleDeleteItem(listing, "listing")}
              />
            ))}
        </div>
      </div>

      <FloatingActionButton />

      {/* MODALS */}
      <DetailDrawer
        open={drawer.open}
        data={drawer.item}
        drawerType={drawer.type}
        currentUser={currentUser}
        loadingStates={loading}
        onClose={() => setDrawer({ open: false, item: null, type: null })}
        onDelete={(item) => handleDeleteItem(item, drawer.type)}
        onAcceptAward={handleAcceptAward}
        onDeclineAward={handleDeclineAward}
        onConfirmDelivery={handleConfirmDelivery}
        onSchedulePickup={(item) =>
          setPickupModal({ open: true, donation: item })
        }
        onPremiumAction={handlePremiumAction}
        onRelist={handleRelistItem}
      />

      <DeclineReasonModal
        open={declineModal.open}
        item={declineModal.item}
        loading={loading.accept === declineModal.item?.id}
        onClose={() => setDeclineModal({ open: false, item: null })}
        onSubmit={(reason) =>
          submitDeclineReason(declineModal.item, reason)
        }
      />

      <AddressConfirmationModal
        open={addressModal.open}
        request={addressModal.item}
        onClose={() => setAddressModal({ open: false, item: null })}
        onConfirm={handleAddressConfirmation}
      />

      <PickupModal
        open={pickupModal.open}
        donation={pickupModal.donation}
        loading={loading.schedule}
        onClose={() =>
          setPickupModal({ open: false, donation: null })
        }
        onSchedule={handleSchedulePickup}
      />

      <RelistModal
        open={relistModal.open}
        item={relistModal.item}
        loading={loading.relist === relistModal.item?.id}
        onClose={() => setRelistModal({ open: false, item: null })}
        onRelist={handleRelistItem}
      />

      <ConfirmActionModal
        open={confirmModal.open}
        message={confirmModal.message}
        loading={loading.delete === confirmModal.item?.id}
        onClose={() =>
          setConfirmModal({
            open: false,
            item: null,
            type: null,
            action: null,
          })
        }
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
