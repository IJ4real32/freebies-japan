// ===================================================================
// DetailDrawerFree.jsx
// PHASE-2 FINAL — FREE ITEM DETAIL DRAWER (AUTHORITATIVE)
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
  Home,
} from "lucide-react";

import StatusBadge from "../StatusBadge";
import SellerPickupScheduler from "../../Logistics/SellerPickupScheduler";
import RecipientConfirmDelivery from "../RecipientConfirmDelivery";

export default function DetailDrawerFree({
  open,
  item,
  currentUser,
  onClose,
  onAcceptAward,
  onDeclineAward,
  onSubmitAddress,
}) {
  if (!open || !item) return null;

  const donation = item.donation || {};
  const delivery = item.deliveryData || {};

  const deliveryStatus = delivery.deliveryStatus || "";

  /* -------------------------------------------------
   * ROLES (AUTHORITATIVE)
   * ------------------------------------------------- */
  const isBuyer = currentUser?.uid === delivery.buyerId;
  const isSeller = currentUser?.uid === delivery.sellerId;

  /* -------------------------------------------------
   * FLAGS (AUTHORITATIVE)
   * ------------------------------------------------- */
  const hasAddress = delivery.addressSubmitted === true;
  const isClosed =
  deliveryStatus === "completed" ||
  deliveryStatus === "force_closed";

  /* -------------------------------------------------
   * ACTION GUARDS (PHASE-2 CANONICAL)
   * ------------------------------------------------- */
  const canAcceptAward =
  isBuyer &&
  deliveryStatus === "pending_recipient_confirmation" &&
  !isClosed;

 


  const canSubmitAddress =
    isBuyer &&
    deliveryStatus === "awaiting_address" &&
    !hasAddress &&
    !isClosed;

  const canSellerSchedulePickup =
    isSeller &&
    deliveryStatus === "pickup_requested" &&
    !isClosed;

  const canConfirmDelivery =
    isBuyer &&
    deliveryStatus === "delivered" &&
    delivery.buyerConfirmed !== true &&
    !isClosed;

  /* -------------------------------------------------
   * DELIVERY TIMELINE (READ-ONLY, ACCURATE)
   * ------------------------------------------------- */
  const timeline = [
    {
      label: "Award accepted",
      icon: Award,
     done: deliveryStatus === "awaiting_address" ||
      deliveryStatus === "pickup_requested" ||
      deliveryStatus === "pickup_scheduled" ||
      deliveryStatus === "pickup_confirmed" ||
      deliveryStatus === "in_transit" ||
      deliveryStatus === "delivered" ||
      deliveryStatus === "completed",

    },
    {
      label: "Address submitted",
      icon: MapPin,
      done: hasAddress,
    },
    {
      label: "Pickup scheduled",
      icon: Calendar,
      done: ["pickup_scheduled", "pickup_confirmed", "in_transit", "delivered", "completed"].includes(
        deliveryStatus
      ),
    },
    {
      label: "In transit",
      icon: Truck,
      done: ["in_transit", "delivered", "completed"].includes(
        deliveryStatus
      ),
    },
    {
      label: "Delivered",
      icon: CheckCircle,
      done: ["delivered", "completed"].includes(deliveryStatus),
    },
  ];

  /* -------------------------------------------------
   * UI
   * ------------------------------------------------- */
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

        <div className="p-4 space-y-6">

          {donation.images?.[0] && (
            <img
              src={donation.images[0]}
              alt={donation.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          <div>
            <h3 className="text-xl font-semibold">{donation.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {donation.description || "No description available."}
            </p>
          </div>

          <StatusBadge
            status={item.status}
            deliveryStatus={deliveryStatus}
            isListing={false}
          />

          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              Delivery progress
            </h4>

            <div className="space-y-3">
              {timeline.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
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

          {canAcceptAward && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">
                You’ve been awarded this item.
              </p>
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
            </div>
          )}

          {canSubmitAddress && (
            <div className="pt-4 border-t">
              <button
                onClick={onSubmitAddress}
                className="w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                Submit Delivery Address
              </button>
            </div>
          )}

         {canSellerSchedulePickup && (
  <SellerPickupScheduler
    delivery={delivery}
    currentUserId={currentUser?.uid}
  />
)}


          {canConfirmDelivery && (
            <RecipientConfirmDelivery
              request={item}
              onDone={onClose}
            />
          )}

          {!deliveryStatus && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Waiting for delivery initialization…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
