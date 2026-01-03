// ===================================================================
// DetailDrawerFree.jsx
// PHASE-2 FINAL — FREE ITEM DETAIL DRAWER (SAFE + AUTHORITATIVE)
// ===================================================================
// Rules:
// - READ-ONLY delivery timeline
// - deliveryData is the Phase-2 source of truth
// - deliveryDetails supported as legacy fallback
// - No backend mutations here
// ===================================================================

import React from "react";
import {
  X,
  Award,
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
export default function DetailDrawerFree({
  open,
  item,
  currentUser,
  onClose,

  // Award actions (buyer only)
  onAcceptAward,
  onDeclineAward,
}) {
  if (!open || !item) return null;

  const {
    status,
    userId,
    ownerId,
    donation = {},
  } = item;

  const {
    title,
    description,
    images = [],
  } = donation;

  // 🔑 PHASE-2 DELIVERY SOURCE OF TRUTH
  const delivery =
    item.deliveryData ||
    item.deliveryDetails ||
    {};

  const isBuyer = currentUser?.uid === userId;
  const isSeller = currentUser?.uid === ownerId;

  /* =====================================================
   * NORMALIZED DELIVERY STATUS (Phase-2 safe)
   * =================================================== */
  const normalizedDeliveryStatus = (
    delivery.status ||
    delivery.deliveryStatus ||
    ""
  )
    .toLowerCase()
    .replace(/[-_]/g, "");

  const hasAddress =
    !!delivery.address ||
    !!delivery.deliveryAddress;

  /* =====================================================
   * READ-ONLY DELIVERY TIMELINE (AUTHORITATIVE)
   * =================================================== */
  const timeline = [
    {
      key: "award",
      label: "Award accepted",
      icon: Award,
      done: status !== "awarded" && status !== "pending",
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
      done:
        normalizedDeliveryStatus === "pickupscheduled" ||
        normalizedDeliveryStatus === "pickupconfirmed" ||
        normalizedDeliveryStatus === "intransit" ||
        normalizedDeliveryStatus === "outfordelivery" ||
        normalizedDeliveryStatus === "delivered" ||
        normalizedDeliveryStatus === "completed",
    },
    {
      key: "transit",
      label: "In transit",
      icon: Truck,
      done:
        normalizedDeliveryStatus === "intransit" ||
        normalizedDeliveryStatus === "outfordelivery" ||
        normalizedDeliveryStatus === "delivered" ||
        normalizedDeliveryStatus === "completed",
    },
    {
      key: "completed",
      label: "Delivered",
      icon: CheckCircle,
      done:
        normalizedDeliveryStatus === "delivered" ||
        normalizedDeliveryStatus === "completed",
    },
  ];

  /* =====================================================
   * UI
   * =================================================== */
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Item details</h2>
          <button onClick={onClose}>
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
            />
          )}

          {/* TITLE */}
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          </div>

          {/* STATUS BADGE */}
          <div>
            <StatusBadge
              status={status}
              deliveryStatus={
                delivery.status || delivery.deliveryStatus
              }
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
          {isSeller && (
            <SellerPickupScheduler delivery={delivery} />
          )}

          {/* BUYER AWARD ACTIONS (LOCKED AFTER ADDRESS) */}
          {isBuyer && status === "awarded" && !hasAddress && (
            <div className="flex gap-3">
              <button
                onClick={onAcceptAward}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg"
              >
                Accept
              </button>
              <button
                onClick={onDeclineAward}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
              >
                Decline
              </button>
            </div>
          )}

          {/* FALLBACK */}
          {!status && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Waiting for activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
