// =============================================================
// FILE: RequestCard.jsx (PHASE-2 — FINAL STABLE PATCH)
// =============================================================

import React from "react";
import { motion } from "framer-motion";
import {
  Trash,
  Loader2,
  Calendar,
  Award,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function RequestCard({
  item,
  onView,
  onDelete,
  onAwardAction,
  deleting,
}) {
  // ============================================================
  // 1. SAFETY — IGNORE premium (MyActivity filters but recheck here)
  // ============================================================
  if (!item || item?.itemData?.type === "premium") return null;

  // ============================================================
  // 2. DELETE RULES (Phase-2 Delivery Lock)
  // ============================================================
  const DELIVERY_LOCK = [
    "accepted",
    "pickup_scheduled",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "completed",
  ];

  const canDelete = !DELIVERY_LOCK.includes(item.deliveryStatus);

  // ============================================================
  // 3. AWARD FLOW — only if free + awarded && NOT already moving
  // ============================================================
  const showAwardAction =
    item.status === "awarded" &&
    !DELIVERY_LOCK.includes(item.deliveryStatus);

  // ============================================================
  // 4. HELPERS
  // ============================================================
  const getTitle = () =>
    item.itemData?.title || item.itemTitle || "Untitled Item";

  const getImage = () =>
    item.itemData?.images?.[0] ??
    item.itemImages?.[0] ??
    "/images/default-item.jpg";

  const getDate = () => {
    try {
      if (item.updatedAt?.toDate)
        return item.updatedAt.toDate().toLocaleDateString();
      if (item.updatedAt) return new Date(item.updatedAt).toLocaleDateString();
      return "—";
    } catch {
      return "—";
    }
  };

  // Prevent opening drawer if clicking action buttons
  const handleCardClick = (e) => {
    if (e.target.closest(".action-button")) return;
    onView();
  };

  const handleAcceptAward = (e) => {
    e.stopPropagation();
    onAwardAction(item, "accept");
  };

  const handleDeclineAward = (e) => {
    e.stopPropagation();
    onAwardAction(item, "decline");
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item);
  };

  // ============================================================
  // 5. UI
  // ============================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
      onClick={handleCardClick}
    >
      {/* ====================== AWARD BADGE ======================= */}
      {showAwardAction && (
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1 animate-pulse">
            <Award size={12} /> AWARDED
          </div>
        </div>
      )}

      {/* ====================== LEGACY BADGE ====================== */}
      {item.status === "deleted" && (
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
            <AlertCircle size={12} /> LEGACY
          </div>
        </div>
      )}

      {/* ====================== ACTION BUTTONS ====================== */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">

        {/* ==== Accept / Decline Award ==== */}
        {showAwardAction && (
          <div className="flex gap-1 action-button">
            <button
              onClick={handleAcceptAward}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-md transition hover:scale-110"
            >
              <Check size={14} />
            </button>

            <button
              onClick={handleDeclineAward}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md transition hover:scale-110"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ==== DELETE ==== */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="action-button bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md transition hover:scale-110 disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash size={14} />
            )}
          </button>
        )}
      </div>

      {/* ====================== IMAGE ====================== */}
      <div className="relative w-full h-48 bg-gray-100 rounded-t-xl overflow-hidden">
        <img
          src={getImage()}
          alt={getTitle()}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
          onError={(e) => (e.target.src = "/images/default-item.jpg")}
        />

        {/* Size */}
        {item.itemData?.size && (
          <div className="absolute bottom-2 right-2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded font-medium">
            {item.itemData.size}
          </div>
        )}
      </div>

      {/* ====================== BODY ====================== */}
      <div className="p-4">

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {getTitle()}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.itemData?.description || "No description available."}
        </p>

        {/* Status + Updated Date */}
        <div className="flex items-center justify-between mb-2">
          <StatusBadge
            status={item.status}
            deliveryStatus={item.deliveryStatus}
          />
          <span className="text-xs text-gray-500">{getDate()}</span>
        </div>

        {/* ================== DELIVERY PROGRESS ================== */}
        {DELIVERY_LOCK.includes(item.deliveryStatus) && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    item.deliveryStatus === "accepted"
                      ? "#3b82f6"
                      : item.deliveryStatus === "pickup_scheduled"
                      ? "#f59e0b"
                      : item.deliveryStatus === "in_transit"
                      ? "#8b5cf6"
                      : item.deliveryStatus === "out_for_delivery"
                      ? "#fbbf24"
                      : item.deliveryStatus === "delivered"
                      ? "#16a34a"
                      : "#065f46",
                }}
              />

              {{
                accepted: "Delivery Accepted",
                pickup_scheduled: "Pickup Scheduled",
                in_transit: "In Transit",
                out_for_delivery: "Out for Delivery",
                delivered: "Delivered",
                completed: "Completed",
              }[item.deliveryStatus] || "Processing"}
            </div>

            {/* Address */}
            {item.deliveryAddress && (
              <div className="mt-1 text-gray-500 truncate">
                📍 {item.deliveryAddress}
              </div>
            )}

            {/* Pickup Date */}
            {item.pickupDate && (
              <div className="mt-1 text-gray-500 flex items-center gap-1">
                <Calendar size={10} />
                {new Date(item.pickupDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
