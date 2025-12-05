// ========================================================================
// FILE: DetailDrawer.js — Phase-2 Premium + Free Flow (FINAL STABLE PATCH)
// Fully aligned with MyActivity v4, PurchaseCard v3, RequestCard v3
// ========================================================================

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  X,
  Package,
  Truck,
  CheckCircle,
  CreditCard,
  Clock,
  Gift,
  ShoppingBag,
  XCircle
} from "lucide-react";

import StatusBadge from "./StatusBadge";
import ActionButton from "./ActionButton";
import DeliveryTimeline from "./DeliveryTimeline";
import PremiumTimeline from "./PremiumTimeline";
import PremiumActionPanel from "./PremiumActionPanel";

// ----------------------------------------------------------------------
// PREMIUM STATUS CONFIG — UNIFIED WITH PurchaseCard + MyActivity
// ----------------------------------------------------------------------
const PremiumStatusConfig = {
  available: {
    label: "Available",
    badgeColor: "bg-emerald-600 text-white",
    icon: Package,
    canDelete: true,
  },
  depositPaid: {
    label: "Deposit Paid",
    badgeColor: "bg-amber-600 text-white",
    icon: CreditCard,
    canDelete: false,
  },
  sellerAccepted: {
    label: "Seller Accepted",
    badgeColor: "bg-blue-600 text-white",
    icon: CheckCircle,
    canDelete: false,
  },
  preparingDelivery: {
    label: "Preparing Delivery",
    badgeColor: "bg-indigo-600 text-white",
    icon: Package,
    canDelete: false,
  },
  inTransit: {
    label: "In Transit",
    badgeColor: "bg-purple-600 text-white",
    icon: Truck,
    canDelete: false,
  },
  delivered: {
    label: "Delivered",
    badgeColor: "bg-green-600 text-white",
    icon: CheckCircle,
    canDelete: false,
  },
  sold: {
    label: "Completed",
    badgeColor: "bg-gray-700 text-white",
    icon: CheckCircle,
    canDelete: false,
  },
  buyerDeclined: {
    label: "Buyer Declined",
    badgeColor: "bg-red-600 text-white",
    icon: XCircle,
    canDelete: true,
  },
  cancelled: {
    label: "Cancelled",
    badgeColor: "bg-gray-600 text-white",
    icon: X,
    canDelete: true,
  },
  autoClosed: {
    label: "Auto Closed",
    badgeColor: "bg-gray-600 text-white",
    icon: Clock,
    canDelete: true,
  },
  unknown: {
    label: "Processing",
    badgeColor: "bg-gray-500 text-white",
    icon: Clock,
    canDelete: false,
  }
};

// ========================================================================
// MAIN COMPONENT
// ========================================================================

export default function DetailDrawer({
  open,
  onClose,
  data,
  drawerType,
  currentUser,
  loadingStates,
  onDelete,
  onAcceptAward,
  onDeclineAward,
  onConfirmDelivery,
  onSchedulePickup,
  onRelist,
  onPremiumAction,
}) {
  const [imageIndex] = useState(0);

  if (!open || !data) return null;

  // ------------------------------------------------------------------
  // User roles
  // ------------------------------------------------------------------
  const isPremiumItem = data?.isPremium || data?.type === "premium";
  const isBuyer = data?.userId === currentUser?.uid || data?.buyerId === currentUser?.uid;
  const isOwner = data?.donorId === currentUser?.uid;
  const isRequester = data?.userId === currentUser?.uid;

  // ------------------------------------------------------------------
  // Premium status
  // ------------------------------------------------------------------
  const premiumStatus = data?.premiumStatus || "unknown";
  const statusConfig = PremiumStatusConfig[premiumStatus] || PremiumStatusConfig.unknown;

  // ------------------------------------------------------------------
  // Delete permissions
  // ------------------------------------------------------------------
  const canDeletePremium =
    isPremiumItem &&
    isOwner &&
    ["cancelled", "buyerDeclined", "autoClosed", "available"].includes(
      premiumStatus
    );

  const canDeleteFree =
    !isPremiumItem &&
    ["expired", "cancelled", "completed", "delivered"].includes(
      data?.status
    );

  // ------------------------------------------------------------------
  // Confirm delivery permissions
  // ------------------------------------------------------------------
  const canConfirmDeliveryFree =
    isRequester && data?.deliveryStatus === "delivered";

  const canConfirmDeliveryPremium =
    isPremiumItem &&
    isBuyer &&
    premiumStatus === "inTransit";

  // ------------------------------------------------------------------
  // Relist permissions
  // ------------------------------------------------------------------
  const canRelistPremium =
    isPremiumItem &&
    isOwner &&
    ["cancelled", "buyerDeclined", "autoClosed", "available"].includes(
      premiumStatus
    );

  // ------------------------------------------------------------------
  // Safe values
  // ------------------------------------------------------------------
  const images =
    data?.images ||
    data?.itemData?.images ||
    ["/images/default-item.jpg"];

  const safeImage = images[imageIndex];

  const title =
    data?.title ||
    data?.itemData?.title ||
    data?.itemTitle ||
    "Untitled Item";

  const description =
    data?.description ||
    data?.itemData?.description ||
    "No description available";

  // ======================================================================
  // PREMIUM SECTION
  // ======================================================================

  const renderPremiumContent = () => (
    <div className="space-y-6">

      {/* Header card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">Premium Item</h3>
              <p className="text-indigo-100 text-sm">Exclusive purchase</p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-full ${statusConfig.badgeColor}`}>
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <PremiumTimeline currentStatus={premiumStatus} />

      {/* Action panel */}
      <PremiumActionPanel
        item={data}
        onPremiumAction={onPremiumAction}
        loading={loadingStates.premium === data.id}
      />

      {/* Confirm delivery */}
      {canConfirmDeliveryPremium && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h4 className="flex items-center gap-2 text-lg font-semibold text-green-800 mb-3">
            <Package className="w-5 h-5" />
            Confirm Delivery
          </h4>

          <p className="text-green-700 text-sm mb-4">
            Please confirm once the item arrives.
          </p>

          <ActionButton
            variant="success"
            fullWidth
            loading={loadingStates.premium === data.id}
            onClick={() => onPremiumAction(data, "confirm_delivery")}
          >
            Confirm Received
          </ActionButton>
        </div>
      )}
    </div>
  );

  // ======================================================================
  // FREE CONTENT
  // ======================================================================

  const renderFreeContent = () => (
    <div className="space-y-6">

      <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl p-5 flex items-center gap-3">
        <Gift className="w-6 h-6" />
        <h3 className="text-lg font-bold">Free Item</h3>
      </div>

      <DeliveryTimeline
        status={data.status}
        deliveryStatus={data.deliveryStatus}
        pickupDate={data.pickupDate}
      />

      {canConfirmDeliveryFree && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h4 className="flex items-center gap-2 text-lg font-semibold text-green-800 mb-3">
            <Package className="w-5 h-5" />
            Confirm Delivery
          </h4>

          <p className="text-green-700 text-sm mb-4">
            Confirm once item is received.
          </p>

          <ActionButton
            variant="success"
            fullWidth
            loading={loadingStates.confirm === data.id}
            onClick={() => onConfirmDelivery(data)}
          >
            Confirm Received
          </ActionButton>
        </div>
      )}
    </div>
  );

  // ======================================================================
  // MAIN UI
  // ======================================================================

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end md:items-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >

          {/* DRAWER */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >

            {/* HEADER */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <img
                  src={safeImage}
                  className="w-16 h-16 object-cover rounded-lg"
                  alt=""
                  onError={(e) => (e.target.src = "/images/default-item.jpg")}
                />
                <div>
                  <h2 className="text-lg font-bold">{title}</h2>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <StatusBadge
                  status={isPremiumItem ? premiumStatus : data.status}
                  isPremium={isPremiumItem}
                  size="lg"
                />
              </div>

              {isPremiumItem ? renderPremiumContent() : renderFreeContent()}

              {/* DELETE */}
              {(canDeletePremium || canDeleteFree) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 mt-6">
                  <h4 className="text-red-800 font-semibold mb-3">Remove Item</h4>

                  <ActionButton
                    variant="danger"
                    fullWidth
                    loading={loadingStates.delete === data.id}
                    onClick={() => onDelete(data)}
                  >
                    Remove from List
                  </ActionButton>
                </div>
              )}

              {/* RELIST PREMIUM */}
              {canRelistPremium && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-6">
                  <h4 className="text-blue-800 font-semibold mb-3">Relist Item</h4>

                  <ActionButton
                    variant="primary"
                    fullWidth
                    loading={loadingStates.relist === data.id}
                    onClick={() => onRelist(data)}
                  >
                    Relist Premium Item
                  </ActionButton>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
