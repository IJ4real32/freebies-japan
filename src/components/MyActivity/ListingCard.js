// ============================================================================
// FILE: ListingCard.jsx — PHASE-2 FINAL (Seller Pickup + Seller Delivery Confirm)
// ============================================================================

import React from "react";
import { motion } from "framer-motion";
import {
  Trash,
  Loader2,
  RefreshCw,
  Truck,
  Calendar,
  MapPin,
  Phone,
  MessageSquare,
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
  onSellerConfirmDelivery, // NEW: BACKLOG #3
  isLoading,
  showDeliveryInfo = false,
}) {
  if (!item) return null;

  // ------------------------------------------------------------
  // CORE DATA
  // ------------------------------------------------------------
  const donation = item.donation || {};
  const deliveryDetails = item.deliveryDetails || donation.deliveryDetails;

  const isSeller = currentUser?.uid === donation.donorId;
  const isFreeItem = donation.type !== "premium";

  // Phase-2 SAFE: gate pickup on request lifecycle, not delivery inference
  const hasActiveRequest =
    item.requestStatus &&
    ["awarded", "accepted"].includes(item.requestStatus);

  const hasScheduledPickup =
    item.sellerPickupStatus &&
    ["proposed", "confirmed", "rescheduled"].includes(
      item.sellerPickupStatus
    );

  // ------------------------------------------------------------
  // BACKLOG #3: SELLER DELIVERY CONFIRMATION LOGIC
  // ------------------------------------------------------------
  const deliveryStatus = deliveryDetails?.deliveryStatus;
  
  // Seller can confirm delivery when:
  // 1. User is the seller
  // 2. Delivery status is "delivered"
  // 3. Seller hasn't already confirmed
  const canSellerConfirmDelivery =
    isSeller &&
    deliveryStatus === "delivered" &&
    !deliveryDetails?.sellerConfirmedAt;

  // Both confirmed for UI display
  const bothConfirmed = 
    deliveryDetails?.buyerConfirmedAt && 
    deliveryDetails?.sellerConfirmedAt;

  // ------------------------------------------------------------
  // IMAGE RESOLVER
  // ------------------------------------------------------------
  const image =
    donation.images?.[0] || "/images/default-item.jpg";

  // ------------------------------------------------------------
  // STATUS LOGIC (PHASE-2 CLEAN)
  // ------------------------------------------------------------
  const status =
    donation.type === "premium"
      ? donation.premiumStatus
      : donation.status || "active";

  const canRelist =
    ["expired", "completed", "closed"].includes(status) && !isLoading;

  const hasDelivery =
    deliveryDetails &&
    [
      "scheduled",
      "accepted",
      "shipped",
      "in_transit",
      "delivered",
    ].includes(deliveryStatus);

  // ------------------------------------------------------------
  // PREVENT DRAWER OPEN ON ICON CLICK
  // ------------------------------------------------------------
  const safeClick = (e) => {
    if (e.target.closest(".action-btn")) return;
    onView(item);
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
      onClick={safeClick}
    >
      {/* ------------------- IMAGE ------------------- */}
      <div className="relative w-full h-48 bg-gray-100 rounded-t-xl overflow-hidden">
        <img
          src={image}
          alt={donation.title || "Listing"}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
          onError={(e) => (e.target.src = "/images/default-item.jpg")}
        />

        {/* Delivery Badge */}
        {hasDelivery && showDeliveryInfo && (
          <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Truck size={10} />
            <span>Delivery Scheduled</span>
          </div>
        )}

        {/* Pickup Badge (offset to avoid overlap) */}
        {hasScheduledPickup && isFreeItem && (
          <div className="absolute top-10 left-2 z-10 bg-indigo-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Calendar size={10} />
            <span>Pickup {item.sellerPickupStatus}</span>
          </div>
        )}

        {/* Seller Confirm Delivery Badge */}
        {canSellerConfirmDelivery && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Check size={10} />
            <span>Confirm Delivery</span>
          </div>
        )}

        {/* Both Confirmed Badge */}
        {bothConfirmed && (
          <div className="absolute top-2 left-2 z-10 bg-green-700 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Check size={10} />
            <span>Completed</span>
          </div>
        )}
      </div>

      {/* ------------------- ACTION BUTTONS ------------------- */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        {/* BACKLOG #3: Seller Confirm Delivery Button */}
        {canSellerConfirmDelivery && (
          <button
            className="action-btn bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full shadow-md transition hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onSellerConfirmDelivery?.(deliveryDetails.id);
            }}
            title="Confirm Delivery"
          >
            <Check size={14} />
          </button>
        )}

        {/* Schedule Pickup — FREE items, seller only */}
        {isSeller &&
          isFreeItem &&
          hasActiveRequest &&
          !hasScheduledPickup && (
            <button
              className="action-btn bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-md transition hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                onSchedulePickup?.(item);
              }}
              title="Schedule Pickup"
            >
              <Calendar size={14} />
            </button>
          )}

        {/* Relist */}
        {canRelist && (
          <button
            className="action-btn bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onRelist(item);
            }}
            title="Relist Item"
          >
            <RefreshCw size={14} />
          </button>
        )}

        {/* Delete */}
        <button
          disabled={isLoading}
          className="action-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md transition hover:scale-110 disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          title="Delete Listing"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Trash size={14} />
          )}
        </button>
      </div>

      {/* ------------------- BODY ------------------- */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {donation.title || "Untitled Listing"}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {donation.description || "No description provided."}
        </p>

        {/* ------------------- CONFIRMATION STATUS ------------------- */}
        {deliveryDetails && showDeliveryInfo && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">Delivery Status</span>
              <span className={`text-xs font-medium ${
                deliveryStatus === "completed" ? "text-green-600" : 
                deliveryStatus === "delivered" ? "text-blue-600" : 
                "text-gray-600"
              }`}>
                {deliveryStatus || "—"}
              </span>
            </div>
            
            {deliveryDetails.buyerConfirmedAt || deliveryDetails.sellerConfirmedAt ? (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Confirmations:</span>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      deliveryDetails.buyerConfirmedAt 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      Buyer
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      deliveryDetails.sellerConfirmedAt 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      Seller
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ------------------- PICKUP INFO ------------------- */}
        {hasScheduledPickup && isFreeItem && (
          <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-700 mb-2">
              <Calendar size={14} />
              <span className="text-sm font-medium">
                Pickup {item.sellerPickupStatus}
              </span>
            </div>

            {item.sellerPickupDate && (
              <p className="text-xs text-gray-700">
                <span className="font-medium">Date:</span>{" "}
                {item.sellerPickupDate.toDate
                  ? item.sellerPickupDate
                      .toDate()
                      .toLocaleDateString()
                  : new Date(
                      item.sellerPickupDate
                    ).toLocaleDateString()}
              </p>
            )}

            {item.sellerPickupWindow && (
              <p className="text-xs text-gray-700">
                <span className="font-medium">Time:</span>{" "}
                {item.sellerPickupWindow}
              </p>
            )}
          </div>
        )}

        {/* ------------------- DELIVERY INFO ------------------- */}
        {hasDelivery &&
          showDeliveryInfo &&
          deliveryDetails?.addressInfo && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Truck size={14} />
                <span className="text-sm font-medium">
                  Delivery Details
                </span>
              </div>

              <div className="space-y-1">
                {deliveryDetails.addressInfo.address && (
                  <div className="flex items-start gap-2 text-xs text-gray-700">
                    <MapPin size={12} />
                    <span className="line-clamp-1">
                      {deliveryDetails.addressInfo.address}
                    </span>
                  </div>
                )}

                {deliveryDetails.addressInfo.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <Phone size={12} />
                    <span>
                      {deliveryDetails.addressInfo.phone}
                    </span>
                  </div>
                )}

                {deliveryDetails.addressInfo.instructions && (
                  <div className="flex items-start gap-2 text-xs text-gray-700">
                    <MessageSquare size={12} />
                    <span className="line-clamp-1">
                      {
                        deliveryDetails.addressInfo
                          .instructions
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Status + Date */}
        <div className="flex items-center justify-between">
          <StatusBadge
            status={status}
            deliveryStatus={deliveryStatus || donation.deliveryStatus}
            premium={donation.type === "premium"}
          />

          <span className="text-xs text-gray-500">
            {donation.updatedAt?.toDate
              ? donation.updatedAt
                  .toDate()
                  .toLocaleDateString()
              : donation.updatedAt
              ? new Date(
                  donation.updatedAt
                ).toLocaleDateString()
              : "—"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}