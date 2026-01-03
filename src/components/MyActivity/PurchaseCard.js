// ======================================================================
// FILE: PurchaseCard.jsx — PHASE-2 FINAL PREMIUM PURCHASE CARD
// Updated for MyActivity compatibility
// ======================================================================

import React from "react";
import { motion } from "framer-motion";
import { Eye, Trash2, XCircle, CheckCircle, Clock } from "lucide-react";

// PREMIUM DELIVERY STATES
const LOCKED = [
  "depositpaid",
  "preparingdelivery",
  "sellerscheduledpickup",
  "intransit",
  "delivered",
  "completioncheck",
];

// DELETABLE AFTER COMPLETION
const ALLOW_DELETE = ["completed", "sold", "cancelled", "rejected"];

// STATUS MAP
const STATUS = {
  available: {
    badge: "Available",
    color: "bg-gray-200 text-gray-700",
  },
  depositpaid: {
    badge: "Deposit Paid",
    color: "bg-amber-500 text-white",
  },
  preparingdelivery: {
    badge: "Preparing Delivery",
    color: "bg-indigo-600 text-white",
  },
  sellerscheduledpickup: {
    badge: "Pickup Scheduled",
    color: "bg-purple-700 text-white",
  },
  intransit: {
    badge: "In Transit",
    color: "bg-blue-600 text-white",
  },
  delivered: {
    badge: "Delivered",
    color: "bg-green-600 text-white",
  },
  completioncheck: {
    badge: "Completion Check",
    color: "bg-green-800 text-white",
  },
  completed: {
    badge: "Completed",
    color: "bg-gray-700 text-white",
  },
  cancelled: {
    badge: "Cancelled",
    color: "bg-red-600 text-white",
  },
  rejected: {
    badge: "Payment Rejected",
    color: "bg-red-500 text-white",
  },
  buyerdeclined: {
    badge: "Declined by Buyer",
    color: "bg-red-500 text-white",
  },
  buyerdeclinedatdoor: {
    badge: "Declined At Door",
    color: "bg-red-700 text-white",
  },
  unknown: {
    badge: "Processing",
    color: "bg-gray-500 text-white",
  },
};

export default function PurchaseCard({
  item,
  onView,
  onDelete,
  loading,
}) {
  if (!item) return null;

  const donation = item.donation || {};

  // HARD GUARD — premium must never appear here
  if (donation.type !== "premium") return null;

  // Use deliveryData if available (from MyActivity safe fetch)
  const delivery = item.deliveryData || {};

  const premiumStatus = (item.premiumStatus || "unknown")
    .toLowerCase()
    .replace(/[-_]/g, "");

  const status = STATUS[premiumStatus] || STATUS.unknown;

  // IMAGE
  const img =
    donation.images?.[0] ||
    item.itemImage ||
    "/images/default-item.jpg";

  // BUYER CONFIRM DELIVERY
  const canBuyerConfirm =
    premiumStatus === "delivered" ||
    premiumStatus === "completioncheck";

  // DECLINE AT DOOR (only allowed in "delivered")
  const canDeclineAtDoor =
    premiumStatus === "delivered";

  // DELETE PERMISSION
  const canDelete =
    ALLOW_DELETE.includes(premiumStatus) &&
    !LOCKED.includes(premiumStatus);

  const safeClick = (e) => {
    if (e.target.closest(".action-btn")) return;
    onView();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={safeClick}
      className="bg-white rounded-xl border border-gray-200 shadow hover:shadow-md cursor-pointer transition relative"
    >
      {/* STATUS BADGE */}
      <div className="absolute top-3 left-3 px-2 py-1 text-xs rounded-full font-semibold shadow z-20 flex items-center gap-1">
        <span className={status.color}>{status.badge}</span>
      </div>

      {/* IMAGE */}
      <div className="w-full h-44 bg-gray-200 overflow-hidden rounded-t-xl">
        <img
          src={img}
          alt={donation.title}
          onError={(e) => (e.target.src = "/images/default-item.jpg")}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
        />
      </div>

      {/* BODY */}
      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold text-gray-900 text-base mb-2">
          {donation.title || "Premium Item"}
        </h3>

        <p className="text-sm text-indigo-700 font-semibold">
          ¥{(donation.price || 0).toLocaleString()}
        </p>

        {/* DELIVERY INFO */}
        {delivery.status && (
          <p className="mt-1 text-xs text-gray-600">
            Delivery: {delivery.status}
          </p>
        )}

        {/* ACTIONS */}
        <div className="mt-4 space-y-2">
          {/* BUYER CONFIRM DELIVERY - MyActivity handles this in drawer */}
          {canBuyerConfirm && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // This is handled in DetailDrawerPremium
                // Just navigate to view
                onView();
              }}
              disabled={loading}
              className="w-full py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition action-btn"
            >
              <CheckCircle size={16} className="inline mr-2" />
              View Details
            </button>
          )}

          {/* DECLINE AT DOOR - MyActivity handles this in drawer */}
          {canDeclineAtDoor && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // This is handled in DetailDrawerPremium
                // Just navigate to view
                onView();
              }}
              disabled={loading}
              className="w-full py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition action-btn"
            >
              <XCircle size={16} className="inline mr-2" />
              View Details
            </button>
          )}

          {/* DELETE */}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={loading}
              className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition action-btn flex justify-center"
            >
              <Trash2 size={16} className="mr-2" />
              Remove
            </button>
          )}

          {/* DEFAULT VIEW BUTTON */}
          {!canBuyerConfirm && !canDeclineAtDoor && !canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition action-btn"
            >
              <Eye size={16} className="inline mr-2" />
              View Details
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}