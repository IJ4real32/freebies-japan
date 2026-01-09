// ============================================================================
// FILE: ListingCard.jsx — PHASE-2 FINAL (ROLE-SAFE)
// Seller-only delivery logic for MyActivity → Listings
// ============================================================================

import React from "react";
import { motion } from "framer-motion";
import {
  Trash,
  Loader2,
  RefreshCw,
  Calendar,
  Check,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import SellerPickupScheduler from "../Logistics/SellerPickupScheduler";

export default function ListingCard({
  item,
  currentUser,
  onView,
  onDelete,
  onRelist,
  isLoading,
}) {
  if (!item || !currentUser) return null;

  /* ------------------------------------------------------------
     SOURCE DATA (MyActivity structure)
  ------------------------------------------------------------ */
  const listing = item.donation || item;
  const delivery = item.deliveryData || null;

  const isSeller = listing.donorId === currentUser.uid;
  if (!isSeller) return null; // 🔒 HARD ROLE LOCK

  const isFreeItem = listing.type !== "premium";

  /* ------------------------------------------------------------
     IMAGE
  ------------------------------------------------------------ */
  const image =
    listing.images?.[0] ||
    listing.imageUrls?.[0] ||
    listing.image ||
    "/images/default-item.jpg";

  /* ------------------------------------------------------------
     STATUS
  ------------------------------------------------------------ */
  const status = listing.status || "active";

  const canRelist =
    ["expired", "completed", "closed", "sold", "cancelled"].includes(status) &&
    !isLoading;

  /* ------------------------------------------------------------
     PICKUP STATE (SELLER PIPELINE ONLY)
  ------------------------------------------------------------ */
  const pickupStatus = delivery?.pickupStatus || null;

  const hasPickupActivity =
    pickupStatus &&
    ["pending_seller_confirmation", "pickup_proposed", "pickup_confirmed"].includes(
      pickupStatus
    );

  const bothConfirmed =
    delivery?.buyerConfirmedAt && delivery?.sellerConfirmedAt;

  /* ------------------------------------------------------------
     SAFE CLICK
  ------------------------------------------------------------ */
  const safeClick = (e) => {
    if (e.target.closest(".action-btn")) return;
    onView();
  };

  /* ------------------------------------------------------------
     FORMAT DATE
  ------------------------------------------------------------ */
  const formatDate = () => {
    const d = listing.updatedAt || listing.createdAt;
    if (d?.toDate) return d.toDate().toLocaleDateString();
    if (d) return new Date(d).toLocaleDateString();
    return "—";
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={safeClick}
      className="bg-white rounded-xl border shadow-sm hover:shadow-md transition cursor-pointer relative"
    >
      {/* IMAGE */}
      <div className="relative h-48 overflow-hidden rounded-t-xl bg-gray-100">
        <img
          src={image}
          alt={listing.title}
          className="w-full h-full object-cover hover:scale-105 transition"
          onError={(e) => {
            e.currentTarget.src = "/images/default-item.jpg";
          }}
        />

        {/* LISTING STATUS */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
          {status}
        </div>

        {/* PICKUP BADGE */}
        {hasPickupActivity && isFreeItem && (
          <div className="absolute top-10 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Calendar size={10} />
            Pickup {pickupStatus.replace(/_/g, " ")}
          </div>
        )}

        {/* COMPLETED */}
        {bothConfirmed && (
          <div className="absolute top-2 right-2 bg-green-700 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Check size={10} />
            Completed
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        {canRelist && (
          <button
            className="action-btn bg-blue-600 text-white p-2 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onRelist();
            }}
          >
            <RefreshCw size={14} />
          </button>
        )}

        <button
          disabled={isLoading}
          className="action-btn bg-red-600 text-white p-2 rounded-full disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Trash size={14} />
          )}
        </button>
      </div>

      {/* BODY */}
      <div className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-2">
          {listing.title || "Untitled Listing"}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
          {listing.description || "No description provided"}
        </p>

        {listing.condition && (
          <p className="text-xs text-gray-500 mb-2">
            Condition: {listing.condition}
          </p>
        )}

        {/* SELLER PICKUP PIPELINE */}
        {isFreeItem && delivery && (
          <SellerPickupScheduler delivery={delivery} />
        )}

        <div className="flex justify-between items-center mt-3">
          <StatusBadge status={status} />
          <span className="text-xs text-gray-500">
            {formatDate()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
