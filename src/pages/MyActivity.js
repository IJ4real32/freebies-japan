// ===============================================================
// FILE: src/pages/MyActivity.jsx
// FINAL PHASE-2 DELIVERY & PREMIUM FLOW — FIRESTORE-SAFE + FAB RESTORED
// ===============================================================

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

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
  serverTimestamp,
  writeBatch,
  orderBy,
} from "firebase/firestore";

import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";

/* COMPONENTS */
import RequestCard from "../components/MyActivity/RequestCard";
import DepositCard from "../components/MyActivity/DepositCard";
import ListingCard from "../components/MyActivity/ListingCard";
import PurchaseCard from "../components/MyActivity/PurchaseCard";

import DetailDrawer from "../components/MyActivity/DetailDrawer";
import PickupModal from "../components/MyActivity/PickupModal";
import AwardModal from "../components/MyActivity/AwardModal";
import ConfirmDeleteModal from "../components/MyActivity/ConfirmDeleteModal";
import AddressConfirmationModal from "../components/MyActivity/AddressConfirmationModal";
import RelistModal from "../components/MyActivity/RelistModal";
import ConfirmActionModal from "../components/MyActivity/ConfirmActionModal";
import DeclineReasonModal from "../components/MyActivity/DeclineReasonModal";

/* ICONS */
import {
  Package,
  Loader2,
  CreditCard,
  Gift,
  Plus,
  List,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react";

import toast from "react-hot-toast";

/* ==========================================================
   PREMIUM STATUS CONFIG
========================================================== */
const PremiumStatusConfig = {
  pending_deposit: {
    label: "Pending Deposit",
    badgeColor: "bg-yellow-600 text-white",
    color: "bg-yellow-100 text-yellow-800",
    icon: CreditCard,
  },
  pending_cod_confirmation: {
    label: "Pending COD Confirmation",
    badgeColor: "bg-yellow-600 text-white",
    color: "bg-yellow-100 text-yellow-800",
    icon: CreditCard,
  },
  deposit_paid: {
    label: "Deposit Paid",
    badgeColor: "bg-green-600 text-white",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  preparing_delivery: {
    label: "Preparing Delivery",
    badgeColor: "bg-blue-600 text-white",
    color: "bg-blue-100 text-blue-800",
    icon: Package,
  },
  in_transit: {
    label: "In Transit",
    badgeColor: "bg-purple-600 text-white",
    color: "bg-purple-100 text-purple-800",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    badgeColor: "bg-emerald-600 text-white",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    badgeColor: "bg-gray-600 text-white",
    color: "bg-gray-100 text-gray-800",
    icon: CheckCircle,
  },
};

/* ==========================================================
   DEPOSIT STATUS CONFIG
========================================================== */
const DepositStatusConfig = {
  pending_cod_confirmation: {
    label: "Pending COD Confirmation",
    badgeColor: "bg-yellow-500 text-white",
    color: "bg-yellow-100 text-yellow-800",
  },
  pending_deposit: {
    label: "Pending Deposit",
    badgeColor: "bg-blue-500 text-white",
    color: "bg-blue-100 text-blue-800",
  },
  verified: {
    label: "Verified",
    badgeColor: "bg-green-600 text-white",
    color: "bg-green-100 text-green-800",
  },
  rejected: {
    label: "Rejected",
    badgeColor: "bg-red-600 text-white",
    color: "bg-red-100 text-red-800",
  },
  cancelled: {
    label: "Cancelled",
    badgeColor: "bg-gray-600 text-white",
    color: "bg-gray-100 text-gray-800",
  },
};

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function MyActivity() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const hasInitialLoad = useRef(false);

  /* TABS */
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("myActivityActiveTab");
    return ["requests", "purchases", "deposits", "listings"].includes(saved)
      ? saved
      : "requests";
  });

  /* DATA */
  const [requests, setRequests] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [listings, setListings] = useState([]);

  /* UI STATES */
  const [drawer, setDrawer] = useState({ open: false, item: null, type: null });
  const [pickupModal, setPickupModal] = useState({ open: false, donation: null });
  const [awardModal, setAwardModal] = useState({ open: false, item: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, type: null });
  const [addressModal, setAddressModal] = useState({ open: false, item: null });
  const [relistModal, setRelistModal] = useState({ open: false, item: null });
  const [declineModal, setDeclineModal] = useState({ open: false, item: null });

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    item: null,
    type: null,
    message: "",
    action: null,
  });

  /* LOADING */
  const [loading, setLoading] = useState({
    page: true,
    delete: null,
    accept: null,
    confirm: null,
    schedule: null,
    premium: null,
    relist: null,
  });

  /* ==========================================================
     INITIAL LOAD — free + premium + listings
  =========================================================== */
  const loadInitialData = useCallback(async () => {
    if (!currentUser?.uid || hasInitialLoad.current) return;
    try {
      setLoading((s) => ({ ...s, page: true }));
      const userId = currentUser.uid;

      /* ---------------- FREE REQUESTS ---------------- */
      const reqSnap = await getDocs(
        query(
          collection(db, "requests"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )
      );

      const _requests = await Promise.all(
        reqSnap.docs.map(async (d) => {
          const r = d.data();
          let itemData = null;
          let deliveryData = null;

          if (r.itemId) {
            const iSnap = await getDoc(doc(db, "donations", r.itemId));
            if (iSnap.exists()) itemData = iSnap.data();
          }

          const ddSnap = await getDocs(
            query(
              collection(db, "deliveryDetails"),
              where("requestId", "==", d.id)
            )
          );

          if (!ddSnap.empty) deliveryData = ddSnap.docs[0].data();

          return {
            id: d.id,
            ...r,
            itemData,
            deliveryData,
            status: deliveryData?.status || r.status,
          };
        })
      );

      setRequests(_requests);

      /* ---------------- PREMIUM PURCHASES ---------------- */
      const paySnap = await getDocs(
        query(
          collection(db, "payments"),
          where("userId", "==", userId),
          where("type", "==", "item"),
          orderBy("createdAt", "desc")
        )
      );

      setPurchases(
        paySnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          isPremium: true,
          premiumStatus:
            PremiumStatusConfig[d.data().status] ? d.data().status : "pending_deposit",
        }))
      );

      /* ---------------- DEPOSITS ---------------- */
      const depSnap = await getDocs(
        query(
          collection(db, "payments"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )
      );
      setDeposits(depSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      /* ---------------- LISTINGS (FREE + PREMIUM) ---------------- */
      const listSnap = await getDocs(
        query(
          collection(db, "donations"),
          where("donorId", "==", userId),
          where("donorType", "==", "user"),
          orderBy("createdAt", "desc")
        )
      );

      setListings(
        listSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          isOwner: true,
        }))
      );

      hasInitialLoad.current = true;
    } catch (e) {
      console.error(e);
      toast.error("Could not load activity.");
    }

    setLoading((s) => ({ ...s, page: false }));
  }, [currentUser]);

  /* ==========================================================
     REALTIME LISTENERS
  =========================================================== */
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!hasInitialLoad.current) loadInitialData();

    const uid = currentUser.uid;
    const unsub = [];

    /* FREE REQUESTS */
    unsub.push(
      onSnapshot(
        query(
          collection(db, "requests"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        ),
        async (snap) => {
          const arr = await Promise.all(
            snap.docs.map(async (d) => {
              const r = d.data();
              let itemData = null;
              let deliveryData = null;

              if (r.itemId) {
                const iSnap = await getDoc(doc(db, "donations", r.itemId));
                if (iSnap.exists()) itemData = iSnap.data();
              }

              const ddSnap = await getDocs(
                query(collection(db, "deliveryDetails"), where("requestId", "==", d.id))
              );
              if (!ddSnap.empty) deliveryData = ddSnap.docs[0].data();

              return {
                id: d.id,
                ...r,
                itemData,
                deliveryData,
                status: deliveryData?.status || r.status,
              };
            })
          );

          setRequests(arr);
        }
      )
    );

    /* PREMIUM PURCHASES */
    unsub.push(
      onSnapshot(
        query(
          collection(db, "payments"),
          where("userId", "==", uid),
          where("type", "==", "item"),
          orderBy("createdAt", "desc")
        ),
        (snap) => {
          setPurchases(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              isPremium: true,
              premiumStatus:
                PremiumStatusConfig[d.data().status] ? d.data().status : "pending_deposit",
            }))
          );
        }
      )
    );

    /* DEPOSITS */
    unsub.push(
      onSnapshot(
        query(
          collection(db, "payments"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        ),
        (snap) => {
          setDeposits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      )
    );

    /* LISTINGS */
    unsub.push(
      onSnapshot(
        query(
          collection(db, "donations"),
          where("donorId", "==", uid),
          where("donorType", "==", "user"),
          orderBy("createdAt", "desc")
        ),
        (snap) => {
          setListings(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              isOwner: true,
            }))
          );
        }
      )
    );

    return () => unsub.forEach((u) => u());
  }, [currentUser, loadInitialData]);

  /* Persist tab */
  useEffect(() => {
    localStorage.setItem("myActivityActiveTab", activeTab);
  }, [activeTab]);

  /* ==========================================================
     ACTION HANDLERS — SAME AS BEFORE (UNCHANGED)
  =========================================================== */

  const handleAcceptAward = useCallback(
    (item) => {
      if (item?.itemData?.type === "premium")
        return toast.error("Premium items do not use award acceptance.");
      setAddressModal({ open: true, item });
    },
    []
  );

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
          declineReason: reason || "(no reason provided)",
          updatedAt: serverTimestamp(),
        });

        batch.set(
          doc(db, "deliveryDetails", item.id),
          {
            status: "declined",
            deliveryStatus: "declined",
            declineReason: reason || "(no reason provided)",
            updatedAt: serverTimestamp(),
            requestId: item.id,
            userId: currentUser.uid,
            itemId: item.itemId,
          },
          { merge: true }
        );

        await batch.commit();
        toast.success("Award declined.");
      } catch (err) {
        toast.error(err.message);
      }

      setDeclineModal({ open: false, item: null });
      setLoading((s) => ({ ...s, accept: null }));
    },
    [currentUser]
  );

  const handleDeleteItem = useCallback((item, type) => {
  setConfirmModal({
    open: true,
    item,
    type,
    message: `Delete this ${type}?`,
    action: "delete_item",
  });
}, []);



  const handlePremiumAction = useCallback(async (item, action) => {
    if (action === "cancel_purchase") {
      setConfirmModal({
        open: true,
        item,
        type: "purchase",
        message: "Cancel purchase? Deposit may be lost.",
        action: "cancel_purchase",
      });
      return;
    }

    if (action === "confirm_delivery") {
      try {
        setLoading((s) => ({ ...s, premium: item.id }));
        const fn = httpsCallable(functions, "confirmPremiumDelivery");
        const res = await fn({ paymentId: item.id });
        res?.data?.success ? toast.success("Delivery confirmed!") : toast.error("Failed.");
      } catch (err) {
        toast.error(err.message);
      }
      setLoading((s) => ({ ...s, premium: null }));
    }
  }, []);

  const handleConfirmDelivery = useCallback(
    async (item) => {
      setLoading((s) => ({ ...s, confirm: item.id }));
      try {
        const batch = writeBatch(db);

        batch.update(doc(db, "requests", item.id), {
          status: "completed",
          deliveryStatus: "delivered",
          deliveredAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(
          doc(db, "deliveryDetails", item.id),
          {
            status: "completed",
            deliveryStatus: "delivered",
            deliveredAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            requestId: item.id,
            userId: currentUser.uid,
            itemId: item.itemId,
          },
          { merge: true }
        );

        await batch.commit();
        toast.success("Delivery confirmed!");
      } catch (err) {
        toast.error(err.message);
      }
      setLoading((s) => ({ ...s, confirm: null }));
    },
    [currentUser]
  );

  const handleSchedulePickup = useCallback(async (donationId, date) => {
    setLoading((s) => ({ ...s, schedule: donationId }));
    try {
      const snap = await getDocs(
        query(collection(db, "requests"), where("itemId", "==", donationId))
      );

      if (snap.empty) return toast.error("No active request found.");

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
      toast.success("Pickup scheduled.");
    } catch (err) {
      toast.error(err.message);
    }

    setPickupModal({ open: false, donation: null });
    setLoading((s) => ({ ...s, schedule: null }));
  }, []);

  const handleAddressConfirmation = useCallback(
    async ({ item, address, phone, instructions }) => {
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
            addressInfo: { address, phone, instructions: instructions || "" },
            updatedAt: serverTimestamp(),
            requestId: item.id,
            userId: currentUser.uid,
            itemId: item.itemId,
          },
          { merge: true }
        );

        await batch.commit();
        toast.success("Delivery information saved.");
      } catch (err) {
        toast.error(err.message);
      }
      setAddressModal({ open: false, item: null });
      setLoading((s) => ({ ...s, address: null }));
    },
    [currentUser]
  );

  const handleRelistItem = useCallback(async (item, data) => {
    setLoading((s) => ({ ...s, relist: item.id }));
    try {
      await updateDoc(doc(db, "donations", item.id), {
        status: "relisted",
        requestWindowEnd: data.requestWindowEnd,
        updatedAt: serverTimestamp(),
      });
      toast.success("Item relisted.");
    } catch (err) {
      toast.error(err.message);
    }
    setRelistModal({ open: false, item: null });
    setLoading((s) => ({ ...s, relist: null }));
  }, []);

  const handleDepositAction = useCallback((item, action) => {
    setConfirmModal({
      open: true,
      item,
      type: "deposit",
      message: `Delete this deposit record?`,
      action: "delete_item",
    });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    const { item, type, action } = confirmModal;

    if (action === "delete_item") {
      setLoading((s) => ({ ...s, delete: item.id }));
      try {
        if (type === "request") await deleteDoc(doc(db, "requests", item.id));
        if (type === "listing") await deleteDoc(doc(db, "donations", item.id));
        if (type === "purchase")
          await updateDoc(doc(db, "payments", item.id), { status: "cancelled" });
        if (type === "deposit") await deleteDoc(doc(db, "payments", item.id));

        toast.success("Deleted.");
      } catch (err) {
        toast.error(err.message);
      }
      setLoading((s) => ({ ...s, delete: null }));
    }

    if (action === "cancel_purchase") {
      try {
        setLoading((s) => ({ ...s, premium: item.id }));
        const cancelFn = httpsCallable(functions, "cancelPremiumPurchase");
        const res = await cancelFn({ paymentId: item.id });
        res?.data?.success
          ? toast.success("Purchase cancelled.")
          : toast.error("Failed.");
      } catch (err) {
        toast.error(err.message);
      }
      setLoading((s) => ({ ...s, premium: null }));
    }

    setConfirmModal({ open: false, item: null, type: null, message: "", action: null });
  }, [confirmModal]);

  /* ==========================================================
     UI HELPERS
  =========================================================== */
  const TabButton = ({ tabKey, label, icon: Icon, count, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center flex-1 pb-2 border-b-2 ${
        isActive ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
      }`}
    >
      <Icon size={20} className="mb-1" />
      <span className="text-xs">{label}</span>
      {count > 0 && (
        <span className="absolute -top-1 right-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
          {count}
        </span>
      )}
    </button>
  );

  const FloatingActionButton = ({ navigate }) => (
    <button
      onClick={() => navigate("/donate")}
      className="fixed bottom-24 right-6 p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 z-[999]"
    >
      <Plus size={26} />
    </button>
  );

  /* ==========================================================
     LOADING STATE
  =========================================================== */
  if (loading.page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  /* ==========================================================
     MAIN RETURN
  =========================================================== */

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}
      <div className="sticky top-0 bg-white p-4 border-b z-30 shadow-sm">
        <h1 className="text-xl font-bold">My Activity</h1>
        <p className="text-sm text-gray-600">
          Manage requests, purchases, deposits & listings
        </p>
      </div>

      {/* TABS */}
      <div className="flex bg-white border-b sticky top-16 z-20 px-2">
        {[
          { key: "requests", label: "Requests", icon: Gift, count: requests.length },
          { key: "purchases", label: "Purchases", icon: ShoppingBag, count: purchases.length },
          { key: "deposits", label: "Deposits", icon: CreditCard, count: deposits.length },
          { key: "listings", label: "Listings", icon: List, count: listings.length },
        ].map((t) => (
          <div key={t.key} className="flex-1">
            <TabButton
              {...t}
              isActive={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
            />
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div className="p-4">
        {/* EMPTY STATES */}
        {activeTab === "requests" && requests.length === 0 && (
          <EmptyState
            icon={Gift}
            title="No requests yet"
            desc="You haven't made any requests yet."
          />
        )}
        {activeTab === "purchases" && purchases.length === 0 && (
          <EmptyState
            icon={ShoppingBag}
            title="No purchases yet"
            desc="You haven't purchased any premium items yet."
          />
        )}
        {activeTab === "deposits" && deposits.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title="No deposits yet"
            desc="You haven't made any deposits yet."
          />
        )}
        {activeTab === "listings" && listings.length === 0 && (
          <EmptyState
            icon={List}
            title="No listings yet"
            desc="You haven't listed any items yet."
          />
        )}

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* REQUESTS */}
          {activeTab === "requests" &&
            requests.map((req) => (
              <RequestCard
                key={req.id}
                item={req}
                onView={() => setDrawer({ open: true, item: req, type: "request" })}
                onDelete={() => setDeleteModal({ open: true, item: req, type: "request" })}
                onAwardAction={(item, action) =>
                  action === "accept"
                    ? handleAcceptAward(item)
                    : handleDeclineAward(item)
                }
                deleting={loading.delete === req.id}
              />
            ))}

          {/* PURCHASES */}
          {activeTab === "purchases" &&
            purchases.map((purchase) => (
              <PurchaseCard
                key={purchase.id}
                item={purchase}
                statusConfig={PremiumStatusConfig[purchase.premiumStatus]}
                onView={() => setDrawer({ open: true, item: purchase, type: "purchase" })}
                onPremiumAction={(a) => handlePremiumAction(purchase, a)}
                loading={loading.premium === purchase.id}
                onDelete={() =>
                  setDeleteModal({ open: true, item: purchase, type: "purchase" })
                }
              />
            ))}

          {/* DEPOSITS */}
          {activeTab === "deposits" &&
            deposits.map((dep) => (
              <DepositCard
                key={dep.id}
                item={dep}
                statusConfig={DepositStatusConfig[dep.status]}
                onDelete={() => handleDepositAction(dep, "delete")}
                onCancel={() => handleDepositAction(dep, "cancel")}
                deleting={loading.delete === dep.id}
              />
            ))}

          {/* LISTINGS */}
          {activeTab === "listings" &&
            listings.map((listing) => (
              <ListingCard
                key={listing.id}
                item={listing}
                onView={() => setDrawer({ open: true, item: listing, type: "listing" })}
                onRelist={() => setRelistModal({ open: true, item: listing })}
                onDelete={() =>
                  setDeleteModal({ open: true, item: listing, type: "listing" })
                }
                loading={loading.delete === listing.id}
              />
            ))}
        </div>
      </div>

      {/* FLOATING BUTTON — ALWAYS VISIBLE */}
      <FloatingActionButton navigate={navigate} />

      {/* MODALS */}
      <DetailDrawer
        open={drawer.open}
        data={drawer.item}
        drawerType={drawer.type}
        currentUser={currentUser}
        loadingStates={loading}
        onClose={() => setDrawer({ open: false, item: null, type: null })}
        onDelete={(it) => setDeleteModal({ open: true, item: it, type: drawer.type })}
        onSchedulePickup={(it) => setPickupModal({ open: true, donation: it })}
        onAcceptAward={handleAcceptAward}
        onDeclineAward={handleDeclineAward}
        onConfirmDelivery={handleConfirmDelivery}
        onRelist={(it) => setRelistModal({ open: true, item: it })}
        onPremiumAction={(it, a) => handlePremiumAction(it, a)}
        premiumStatusConfig={PremiumStatusConfig}
      />

      <AwardModal
        open={awardModal.open}
        item={awardModal.item}
        onClose={() => setAwardModal({ open: false, item: null })}
        onAccept={(it) => handleAcceptAward(it)}
        onDecline={(it) => handleDeclineAward(it)}
        loading={loading.accept}
      />

      <DeclineReasonModal
        open={declineModal.open}
        item={declineModal.item}
        loading={loading.accept === declineModal.item?.id}
        onClose={() => setDeclineModal({ open: false, item: null })}
        onSubmit={(reason) => submitDeclineReason(declineModal.item, reason)}
      />

      <RelistModal
        open={relistModal.open}
        item={relistModal.item}
        onClose={() => setRelistModal({ open: false, item: null })}
        onRelist={handleRelistItem}
        loading={loading.relist === relistModal.item?.id}
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
        onClose={() => setPickupModal({ open: false, donation: null })}
        loading={loading.schedule}
        onSchedule={handleSchedulePickup}
      />

      <ConfirmActionModal
        open={confirmModal.open}
        message={confirmModal.message}
        loading={
          loading.delete === confirmModal.item?.id ||
          loading.premium === confirmModal.item?.id ||
          loading.accept === confirmModal.item?.id
        }
        onClose={() =>
          setConfirmModal({ open: false, item: null, type: null, message: "", action: null })
        }
        onConfirm={handleConfirmAction}
      />

      <ConfirmDeleteModal
        open={deleteModal.open}
        item={deleteModal.item}
        itemType={deleteModal.type}
        onClose={() => setDeleteModal({ open: false, item: null, type: null })}
        onConfirm={() => handleDeleteItem(deleteModal.item, deleteModal.type)}
        loading={loading.delete === deleteModal.item?.id}
      />
    </div>
  );

  function EmptyState({ icon: Icon, title, desc }) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border">
        <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 max-w-sm mx-auto">{desc}</p>
      </div>
    );
  }
}
