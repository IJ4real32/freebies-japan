// ============================================================================
// FILE: RequestCard.jsx — PHASE-2 FINAL (LOCKED & AUTHORITATIVE)
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
   CONSTANTS — PHASE-2 CANONICAL
------------------------------------------------------------ */

// Delivery states where buyer actions are LOCKED
const DELIVERY_LOCK = [
  "recipientaccepted",
  "accepted",
  "addresssubmitted",
  "pickupconfirmed",
  "intransit",
  "completed",
  "forceclosed",
];

// Allowed delete states (UI-only cleanup)
const ALLOW_DELETE = ["rejected", "cancelled", "expired"];

/* ------------------------------------------------------------
   IMAGE RESOLVER (SAFE)
------------------------------------------------------------ */
const resolveImage = (item) => {
  const donation = item.donation || item;

  if (donation.images?.length) return donation.images[0];
  if (donation.imageUrls?.length) return donation.imageUrls[0];
  if (donation.image) return donation.image;
  if (item.itemImages?.length) return item.itemImages[0];

  return "/images/default-item.jpg";
};

/* ------------------------------------------------------------
   TITLE & DESCRIPTION RESOLVER
------------------------------------------------------------ */
const resolveTitle = (item) => {
  const donation = item.donation || item;
  return (
    donation.title ||
    donation.itemTitle ||
    item.itemTitle ||
    "Untitled Item"
  );
};

const resolveDescription = (item) => {
  const donation = item.donation || item;
  return (
    donation.description ||
    donation.itemDescription ||
    item.itemDescription ||
    "No description available."
  );
};

/* ------------------------------------------------------------
   COMPONENT
------------------------------------------------------------ */
export default function RequestCard({
  item,
  currentUser,
  onView,
  onDelete,
  onAwardAction,
  deleting,
}) {
  if (!item) return null;

  const donation = item.donation || item;
  const delivery = item.deliveryData || {};

  // Premium items NEVER appear here
  if (donation.type === "premium" || item.isPremium) return null;

  const userId = currentUser?.uid;
  const isBuyer = userId === item.userId;

  /* ------------------------------------------------------------
     DELIVERY LOCK — BACKEND AUTHORITATIVE
  ------------------------------------------------------------ */
  const normalizedDeliveryStatus = (
    delivery.deliveryStatus ||
    item.deliveryStatus ||
    ""
  )
    .toLowerCase()
    .replace(/[-_]/g, "");

  const isLocked =
    DELIVERY_LOCK.includes(normalizedDeliveryStatus) ||
    !!delivery.deliveryAddress;

  /* ------------------------------------------------------------
     PERMISSIONS
  ------------------------------------------------------------ */

  const canDelete =
    ALLOW_DELETE.includes(item.status) &&
    !isLocked &&
    !delivery.deliveryStatus;

  const canAccept =
    item.status === "awarded" &&
    isBuyer &&
    !isLocked;

  const img = resolveImage(item);
  const title = resolveTitle(item);
  const description = resolveDescription(item);

  const safeClick = (e) => {
    if (e.target.closest(".action-btn")) return;
    onView?.();
  };

  const formatDate = () => {
    try {
      const date = item.updatedAt || donation.updatedAt;
      if (date?.toDate) return date.toDate().toLocaleDateString();
      if (date) return new Date(date).toLocaleDateString();
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
      {/* BUYER BADGE */}
      {isBuyer && (
        <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full z-20">
          Your Request
        </div>
      )}

      {/* AWARDED BADGE */}
      {item.status === "awarded" && !isLocked && (
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
        {/* ACCEPT AWARD */}
        {canAccept && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAwardAction(item, "accept");
              }}
              className="action-btn bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow transition hover:scale-110"
              title="Accept item"
            >
              <Check size={14} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="action-btn bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full shadow transition hover:scale-110"
              title="Remove from my activity"
            >
              <X size={14} />
            </button>
          </>
        )}

        {/* DELETE */}
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
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
          alt={title}
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
          {title}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center justify-between">
          <StatusBadge
            status={item.status}
            deliveryStatus={
              delivery.deliveryStatus || item.deliveryStatus
            }
          />
          <span className="text-xs text-gray-500">
            {formatDate()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
