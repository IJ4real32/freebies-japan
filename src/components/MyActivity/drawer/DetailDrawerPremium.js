// ===================================================================
// DetailDrawerPremium.jsx
// PHASE-2 FINAL — PREMIUM ITEM DETAIL DRAWER (AUTHORITATIVE)
// ===================================================================
// Rules:
// - deliveryData is the Phase-2 source of truth
// - deliveryDetails supported as legacy fallback
// - No direct backend mutations
// - Dual confirmation respected (buyer + seller)
// ===================================================================

import React, { useMemo } from "react";
import {
  X,
  CreditCard,
  MapPin,
  Calendar,
  Truck,
  CheckCircle,
  Clock,
} from "lucide-react";

import StatusBadge from "../StatusBadge";
import SellerPickupScheduler from "../../Logistics/SellerPickupScheduler";

/* =========================================================
 * COMPONENT
 * ======================================================= */
export default function DetailDrawerPremium({
  open,
  item,
  currentUser,
  onClose,
}) {
  // 🔑 PHASE-2 DELIVERY SOURCE OF TRUTH - WITH NULL SAFETY
  const delivery = useMemo(() => {
    if (!item) return null;
    
    // Check if deliveryData exists and has keys
    if (item.deliveryData && 
        typeof item.deliveryData === 'object' && 
        Object.keys(item.deliveryData).length > 0) {
      return item.deliveryData;
    }
    
    // Legacy fallback - check deliveryDetails
    if (item.deliveryDetails && 
        typeof item.deliveryDetails === 'object' && 
        Object.keys(item.deliveryDetails).length > 0) {
      return item.deliveryDetails;
    }
    
    return null;
  }, [item]);

  const {
    images = [],
    title,
    description,
    premiumStatus,
    userId,
    ownerId,
  } = item || {};

  const isBuyer = currentUser?.uid === userId;
  const isSeller = currentUser?.uid === ownerId;

  /* =====================================================
   * NORMALIZED DELIVERY STATUS (Phase-2 safe)
   * =================================================== */
  const normalizedDeliveryStatus = useMemo(() => {
    if (!delivery) return "";
    
    const status = (
      delivery.status ||
      delivery.deliveryStatus ||
      ""
    );
    
    return status.toLowerCase().replace(/[-_]/g, "");
  }, [delivery]);

  const hasAddress = useMemo(() => {
    if (!delivery) return false;
    return !!(delivery.address || delivery.deliveryAddress);
  }, [delivery]);

  const buyerConfirmed = useMemo(() => {
    if (!delivery) return false;
    return !!delivery.buyerConfirmedDelivery;
  }, [delivery]);

  const sellerConfirmed = useMemo(() => {
    if (!delivery) return false;
    return !!delivery.sellerConfirmedDelivery;
  }, [delivery]);

  /* =====================================================
   * READ-ONLY DELIVERY TIMELINE (AUTHORITATIVE)
   * =================================================== */
  const timeline = useMemo(() => {
    const baseTimeline = [
      {
        key: "deposit",
        label: "Deposit paid",
        icon: CreditCard,
        done: premiumStatus === "depositPaid",
      },
      {
        key: "address",
        label: "Address submitted",
        icon: MapPin,
        done: hasAddress,
      },
      {
        key: "pickup",
        label: "Pickup scheduled",
        icon: Calendar,
        done: normalizedDeliveryStatus === "pickupscheduled" ||
              normalizedDeliveryStatus === "intransit" ||
              normalizedDeliveryStatus === "outfordelivery" ||
              normalizedDeliveryStatus === "delivered" ||
              normalizedDeliveryStatus === "completed",
      },
      {
        key: "transit",
        label: "In transit",
        icon: Truck,
        done: normalizedDeliveryStatus === "intransit" ||
              normalizedDeliveryStatus === "outfordelivery" ||
              normalizedDeliveryStatus === "delivered" ||
              normalizedDeliveryStatus === "completed",
      },
      {
        key: "delivered",
        label: "Delivered",
        icon: CheckCircle,
        done: normalizedDeliveryStatus === "delivered" ||
              normalizedDeliveryStatus === "completed",
      },
    ];

    // If no delivery data, only show deposit status
    if (!delivery) {
      return baseTimeline.filter(step => step.key === "deposit");
    }

    return baseTimeline;
  }, [delivery, premiumStatus, hasAddress, normalizedDeliveryStatus]);

  // Early return must come AFTER all hooks
  if (!open || !item) return null;

  /* =====================================================
   * UI
   * =================================================== */
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">
            Premium item details
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 space-y-6">
          {/* IMAGE */}
          {images[0] && (
            <img
              src={images[0]}
              alt={title}
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}

          {/* TITLE */}
          <div>
            <h3 className="text-xl font-semibold">{title || "Untitled Item"}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {description || "No description provided"}
            </p>
          </div>

          {/* STATUS BADGE */}
          <div>
            <StatusBadge
              status={premiumStatus}
              deliveryStatus={delivery?.status || delivery?.deliveryStatus}
              isPremium
              isListing={false}
            />
          </div>

          {/* DELIVERY TIMELINE */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              Delivery progress
            </h4>

            <div className="space-y-3">
              {timeline.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      step.done
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        step.done
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        step.done
                          ? "text-emerald-800"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SELLER PICKUP SCHEDULER */}
          {isSeller && delivery && (
            <SellerPickupScheduler delivery={delivery} />
          )}

          {/* CONFIRMATION STATUS (READ-ONLY) */}
          {(buyerConfirmed || sellerConfirmed) && (
            <div className="p-3 rounded-lg bg-gray-50 border text-sm space-y-1">
              {buyerConfirmed && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Buyer confirmed delivery</span>
                </div>
              )}
              
              {sellerConfirmed && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Seller confirmed delivery</span>
                </div>
              )}
            </div>
          )}

          {/* FALLBACK FOR NO DELIVERY DATA */}
          {!delivery && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Delivery information pending</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Delivery details will appear here once the seller schedules pickup.
              </p>
            </div>
          )}

          {/* FALLBACK FOR NO PREMIUM STATUS */}
          {!premiumStatus && delivery && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Waiting for deposit payment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}