// ============================================================================
// FILE: RequestCard.jsx — PHASE-2 FINAL STRICT FREE-ITEM REQUEST CARD (PATCHED)
// Free items ONLY — No premium logic allowed.
// Mobile-first layout — works with Request drawer.
// FIXES:
// - Guaranteed image rendering
// - Safe donation fallback
// - Zero assumptions about joined data
// ============================================================================

import React from "react";
import { motion } from "framer-motion";
import {
  Trash,
  Loader2,
  Award,
  Check,
  X,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

/* ------------------------------------------------------------
   CONSTANTS
------------------------------------------------------------ */

// Delivery states where buyer cannot act anymore
const DELIVERY_LOCK = [
  "accepted",
  "pickup_scheduled",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "buyer_confirmed",
];

// Allowed delete states
const ALLOW_DELETE = [
  "rejected",
  "cancelled",
  "expired",
  "completed",
  "delivered",
  "buyer_confirmed",
];

/* ------------------------------------------------------------
   IMAGE RESOLVER (CRITICAL FIX)
------------------------------------------------------------ */
const resolveImage = (item) => {
  // Preferred: joined donation images
  if (item?.donation?.images?.length) {
    return item.donation.images[0];
  }

  // Fallback: embedded images (legacy / partial joins)
  if (item?.itemImages?.length) {
    return item.itemImages[0];
  }

  // Absolute fallback
  return "/images/default-item.jpg";
};

/* ------------------------------------------------------------
   COMPONENT
------------------------------------------------------------ */
export default function RequestCard({
  item,
  currentUser,
  onView,
  onDelete,
  onAwardAction,            // accept / decline award
  onBuyerConfirmDelivery,   // Confirm delivery (FREE)
  deleting,
}) {
  if (!item) return null;

  const donation = item.donation || {};
  const delivery = item.deliveryData || {};

  // Premium items MUST NOT show here
  if (donation.type === "premium" || item.isPremium) return null;

  const userId = currentUser?.uid;
  const isBuyer = userId === item.userId;
  const isSeller = userId === donation.donorId;

  const deliveryStatus = (delivery.deliveryStatus || "")
    .toLowerCase()
    .replace(/[-_]/g, "");

  const isLocked = DELIVERY_LOCK.includes(deliveryStatus);

  // Delete permission
  const canDelete = ALLOW_DELETE.includes(item.status) && !isLocked;

  // Award zone (buyer only)
  const canAcceptOrDecline = item.status === "awarded" && isBuyer;

  // FREE DELIVERY CONFIRMATION (buyer only)
  const canBuyerConfirmDelivery =
    isBuyer &&
    ["delivered", "intransit", "outfordelivery", "completioncheck"].includes(
      deliveryStatus
    );

  // ✅ SAFE IMAGE
  const img = resolveImage(item);

  const safeClick = (e) => {
    if (e.target.closest(".action-btn")) return;
    onView(item);
  };

  const formatDate = () => {
    try {
      if (item.updatedAt?.toDate)
        return item.updatedAt.toDate().toLocaleDateString();
      if (item.updatedAt)
        return new Date(item.updatedAt).toLocaleDateString();
    } catch {}
    return "—";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={safeClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
    >
      {/* BUYER / SELLER BADGE */}
      {(isBuyer || isSeller) && (
        <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full z-20">
          {isBuyer ? "Your Request" : "Your Item"}
        </div>
      )}

      {/* AWARDED BADGE */}
      {item.status === "awarded" && (
        <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg z-20 flex items-center gap-1">
          <Award size={12} />
          AWARDED
        </div>
      )}

      {/* DELIVERY LOCK RIBBON */}
      {isLocked && (
        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg z-30">
          Delivery In Progress
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="absolute top-3 right-3 z-30 flex gap-2">

        {/* Award accept / decline (buyer only) */}
        {canAcceptOrDecline && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAwardAction(item, "accept");
              }}
              className="action-btn bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow transition hover:scale-110"
            >
              <Check size={14} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAwardAction(item, "decline");
              }}
              className="action-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow transition hover:scale-110"
            >
              <X size={14} />
            </button>
          </>
        )}

        {/* Delete */}
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            disabled={deleting}
            className="action-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow transition hover:scale-110 disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash size={14} />
            )}
          </button>
        )}
      </div>

      {/* IMAGE */}
      <div className="relative w-full h-48 bg-gray-100 rounded-t-xl overflow-hidden">
        <img
          src={img}
          alt={donation.title || "Item"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/default-item.jpg";
          }}
        />
      </div>

      {/* BODY */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {donation.title || "Untitled Item"}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {donation.description || "No description available."}
        </p>

        <div className="flex items-center justify-between">
          <StatusBadge
            status={item.status}
            deliveryStatus={delivery.deliveryStatus}
          />
          <span className="text-xs text-gray-500">{formatDate()}</span>
        </div>

        {/* BUYER DELIVERY CONFIRMATION */}
        {canBuyerConfirmDelivery && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuyerConfirmDelivery(item);
            }}
            className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm"
          >
            Confirm Delivery
          </button>
        )}
      </div>
    </motion.div>
  );
}
