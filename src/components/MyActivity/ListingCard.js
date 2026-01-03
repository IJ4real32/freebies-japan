// ============================================================================
// FILE: ListingCard.jsx — PHASE-2 FINAL (COMPATIBLE)
// Fixed for MyActivity data structure
// ============================================================================

import React from "react";
import { motion } from "framer-motion";
import {
  Trash,
  Loader2,
  RefreshCw,
  Truck,
  Calendar,
  Check,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function ListingCard({
  item,
  currentUser,
  onView,
  onDelete,
  onRelist,
  onSchedulePickup,
  isLoading,
  showDeliveryInfo = false,
}) {
  if (!item) return null;

  /* ------------------------------------------------------------
     CORE DATA - Handle MyActivity data structure
  ------------------------------------------------------------ */
  // In MyActivity, listings come from donations collection directly
  // So 'item' IS the donation, not wrapped in donation property
  const donation = item || {};
  
  // For backward compatibility, check if item has donation property
  const listingData = item.donation || item;

  // 🔑 Phase-2 delivery source of truth
  const delivery = item.deliveryData || {};

  const deliveryStatus =
    delivery.status || delivery.deliveryStatus || null;

  const isSeller = currentUser?.uid === listingData.donorId;
  const isFreeItem = listingData.type !== "premium";

  /* ------------------------------------------------------------
     REQUEST / PICKUP GATING (FREE ITEMS)
  ------------------------------------------------------------ */
  const hasActiveRequest = item.hasActiveRequest || false;

  const hasScheduledPickup =
    delivery.pickupStatus &&
    ["proposed", "confirmed", "rescheduled"].includes(
      delivery.pickupStatus
    );

  /* ------------------------------------------------------------
     IMAGE - Handle multiple image sources
  ------------------------------------------------------------ */
  const getImage = () => {
    if (listingData.images?.length) {
      return listingData.images[0];
    }
    if (listingData.imageUrls?.length) {
      return listingData.imageUrls[0];
    }
    if (listingData.image) {
      return listingData.image;
    }
    return "/images/default-item.jpg";
  };

  const image = getImage();

  /* ------------------------------------------------------------
     TITLE & DESCRIPTION
  ------------------------------------------------------------ */
  const getTitle = () => {
    return listingData.title || 
           listingData.itemTitle || 
           "Untitled Listing";
  };

  const getDescription = () => {
    return listingData.description || 
           listingData.itemDescription || 
           "No description provided.";
  };

  /* ------------------------------------------------------------
     STATUS
  ------------------------------------------------------------ */
  const status = listingData.status || "active";

  const canRelist =
    ["expired", "completed", "closed", "sold", "cancelled"].includes(status) &&
    !isLoading;

  const hasDelivery =
    !!deliveryStatus &&
    [
      "pickupscheduled",
      "accepted",
      "intransit",
      "outfordelivery",
      "delivered",
      "completed",
    ].includes(
      deliveryStatus
        .toLowerCase()
        .replace(/[-_]/g, "")
    );

  const bothConfirmed =
    delivery.buyerConfirmedAt &&
    delivery.sellerConfirmedAt;

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
    try {
      const date = listingData.updatedAt || listingData.createdAt;
      if (date?.toDate) {
        return date.toDate().toLocaleDateString();
      }
      if (date) {
        return new Date(date).toLocaleDateString();
      }
    } catch {}
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
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
    >
      {/* IMAGE */}
      <div className="relative w-full h-48 bg-gray-100 rounded-t-xl overflow-hidden">
        <img
          src={image}
          alt={getTitle()}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/default-item.jpg";
          }}
        />

        {/* STATUS BADGE */}
        <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>

        {/* DELIVERY BADGE */}
        {hasDelivery && showDeliveryInfo && (
          <div className="absolute top-10 left-2 z-10 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Truck size={10} />
            <span>Delivery In Progress</span>
          </div>
        )}

        {/* PICKUP BADGE (FREE ITEMS) */}
        {hasScheduledPickup && isFreeItem && (
          <div className="absolute top-18 left-2 z-10 bg-indigo-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Calendar size={10} />
            <span>
              Pickup {delivery.pickupStatus}
            </span>
          </div>
        )}

        {/* COMPLETED BADGE */}
        {bothConfirmed && (
          <div className="absolute top-2 right-2 z-10 bg-green-700 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Check size={10} />
            <span>Completed</span>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        {/* SCHEDULE PICKUP — FREE ITEMS */}
        {isSeller &&
          isFreeItem &&
          hasActiveRequest &&
          !hasScheduledPickup && (
            <button
              className="action-btn bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-md transition hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                onSchedulePickup();
              }}
              title="Schedule Pickup"
            >
              <Calendar size={14} />
            </button>
          )}

        {/* RELIST */}
        {canRelist && (
          <button
            className="action-btn bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onRelist();
            }}
            title="Relist Item"
          >
            <RefreshCw size={14} />
          </button>
        )}

        {/* DELETE */}
        <button
          disabled={isLoading}
          className="action-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md transition hover:scale-110 disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete Listing"
        >
          {isLoading ? (
            <Loader2
              className="animate-spin"
              size={14}
            />
          ) : (
            <Trash size={14} />
          )}
        </button>
      </div>

      {/* BODY */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {getTitle()}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {getDescription()}
        </p>

        {/* PRICE */}
        {listingData.price && (
          <p className="text-sm font-semibold text-indigo-700 mb-2">
            ¥{(listingData.price || 0).toLocaleString()}
          </p>
        )}

        {/* CONDITION */}
        {listingData.condition && (
          <p className="text-xs text-gray-500 mb-2">
            Condition: {listingData.condition}
          </p>
        )}

        {/* STATUS + DATE */}
        <div className="flex items-center justify-between mt-2">
          <StatusBadge
            status={status}
            deliveryStatus={deliveryStatus}
            isPremium={listingData.type === "premium"}
          />

          <span className="text-xs text-gray-500">
            {formatDate()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}