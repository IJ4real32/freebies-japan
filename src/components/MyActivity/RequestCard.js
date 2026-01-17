// ============================================================================
// FILE: RequestCard.jsx
// PHASE-2 FINAL — BUYER REQUEST CARD (DELIVERY-AUTHORITATIVE)
// ============================================================================

import React from "react";
import { motion } from "framer-motion";
import { Trash, Loader2, Award, Check, X } from "lucide-react";
import StatusBadge from "./StatusBadge";

/* ------------------------------------------------------------
   DELIVERY STATES THAT LOCK BUYER ACTIONS
------------------------------------------------------------ */
const LOCKED_DELIVERY = [
  "pickup_scheduled",
  "pickup_confirmed",
  "in_transit",
  "delivered",
  "completed",
  "force_closed",
];

/* ------------------------------------------------------------
   DELETE-ALLOWED (UI-ONLY, PRE-AWARD)
------------------------------------------------------------ */
const ALLOW_DELETE = ["rejected", "cancelled", "expired"];

export default function RequestCard({
  item,
  currentUser,
  onView,
  onDelete,
  onAwardAction,
  deleting,
}) {
  if (!item || !currentUser) return null;

  const donation = item.donation || item;

  // 🔒 Premium never appears here
  if (donation.type === "premium" || item.isPremium) return null;

  const delivery = item.deliveryData || {};
  const isBuyer = currentUser.uid === item.userId;
  const deliveryStatus = delivery.deliveryStatus || "";

  /* ------------------------------------------------------------
     LOCK STATE — PHASE-2 CANONICAL
  ------------------------------------------------------------ */
  const isLocked = LOCKED_DELIVERY.includes(deliveryStatus);

  /* ------------------------------------------------------------
     BUYER ACTION GUARDS
  ------------------------------------------------------------ */
  const canAcceptAward =
    isBuyer &&
    deliveryStatus === "pending_recipient_confirmation" &&
    !isLocked;

  const canDelete =
    isBuyer &&
    ALLOW_DELETE.includes(item.status) &&
    !delivery.deliveryStatus;

  /* ------------------------------------------------------------
     UI HELPERS
  ------------------------------------------------------------ */
  const img =
    donation.images?.[0] ||
    donation.imageUrls?.[0] ||
    donation.image ||
    "/images/default-item.jpg";

  const title = donation.title || "Untitled Item";
  const description = donation.description || "No description available.";

  const safeClick = (e) => {
    if (e.target.closest(".action-btn")) return;
    onView?.();
  };

  const formatDate = () => {
    const d = item.updatedAt || donation.updatedAt;
    if (d?.toDate) return d.toDate().toLocaleDateString();
    if (d) return new Date(d).toLocaleDateString();
    return "—";
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={safeClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
    >
      {/* BUYER TAG */}
      <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full z-20">
        Your Request
      </div>

      {/* AWARDED — AWAITING ACCEPTANCE */}
      {canAcceptAward && (
        <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg z-20 flex items-center gap-1">
          <Award size={12} />
          Awarded
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="absolute top-3 right-3 z-30 flex gap-2">
        {canAcceptAward && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAwardAction?.(item, "accept");
              }}
              className="action-btn bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full shadow transition hover:scale-110"
              title="Accept award"
            >
              <Check size={14} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAwardAction?.(item, "decline");
              }}
              className="action-btn bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full shadow transition hover:scale-110"
              title="Decline award"
            >
              <X size={14} />
            </button>
          </>
        )}

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
          <StatusBadge deliveryStatus={deliveryStatus} />
          <span className="text-xs text-gray-500">
            {formatDate()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
