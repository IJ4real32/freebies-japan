// ========================================================================
// FILE: DeliveryTimeline.jsx — PHASE-2 UPGRADED VERSION
// Fully aligned with StatusBadge, DetailDrawer & backend delivery pipeline
// ========================================================================

import React from "react";
import { motion } from "framer-motion";
import {
  UserCheck,
  Calendar,
  Truck,
  Package,
  CheckCircle,
  Bike,
  XCircle,
} from "lucide-react";

/* Normalize delivery status */
function normalizeStatus(raw) {
  if (!raw) return null;

  const key = raw.replace(/[-_]/g, "").toLowerCase();

  const map = {
    accepted: "accepted",
    pickupscheduled: "pickup_scheduled",
    intransit: "in_transit",
    outfordelivery: "out_for_delivery",
    delivered: "delivered",
    completed: "completed",
    cancelled: "cancelled",
    failed: "failed",
  };

  return map[key] || null;
}

function formatDateSafe(date) {
  if (!date) return null;
  try {
    if (date?.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  } catch {
    return null;
  }
}

const DeliveryTimeline = ({
  status,
  deliveryStatus,
  pickupDate,
  isSeller = false,
}) => {
  const pipeline = [
    "accepted",
    "pickup_scheduled",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "completed",
  ];

  const normalizedDelivery = normalizeStatus(deliveryStatus);
  const normalizedStatus = normalizeStatus(status);

  const useDelivery =
    normalizedDelivery && pipeline.includes(normalizedDelivery);

  const current = useDelivery ? normalizedDelivery : normalizedStatus;

  const failedStates = ["cancelled", "failed"];

  // -------------------------------------------------------------
  // ROLE-AWARE DESCRIPTIONS (UPGRADED)
  // -------------------------------------------------------------
  const steps = [
    {
      key: "accepted",
      label: "Delivery Accepted",
      icon: UserCheck,
      descriptionBuyer: "You confirmed your delivery details.",
      descriptionSeller:
        "The recipient has confirmed their delivery details.",
    },
    {
      key: "pickup_scheduled",
      label: "Pickup Scheduled",
      icon: Calendar,
      descriptionBuyer: "Admin has scheduled pickup for your item.",
      descriptionSeller: "Pickup has been scheduled for the item.",
    },
    {
      key: "in_transit",
      label: "In Transit",
      icon: Truck,
      descriptionBuyer: "Your item is being transported.",
      descriptionSeller:
        "Courier is transporting the item to the recipient.",
    },
    {
      key: "out_for_delivery",
      label: "Item Is On The Way To Recipient",   // ⭐ UPDATED AS REQUESTED
      icon: Bike,
      descriptionBuyer: "Your item is arriving shortly.",
      descriptionSeller:
        "Item is currently being delivered to the recipient.",
    },
    {
      key: "delivered",
      label: "Delivered",
      icon: Package,
      descriptionBuyer: "Your item has been delivered.",
      descriptionSeller: "The item has been delivered to the recipient.",
    },
    {
      key: "completed",
      label: "Completed",
      icon: CheckCircle,
      descriptionBuyer: "Delivery completed.",
      descriptionSeller:
        "Delivery completed. Awaiting confirmation if required.",
    },
  ];

  const currentIndex = steps.findIndex((s) => s.key === current);
  const safeIndex = currentIndex >= 0 ? currentIndex : -1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h4 className="font-semibold text-gray-900 text-lg mb-6 flex items-center gap-3">
        <Truck className="w-5 h-5 text-blue-600" />
        Delivery Progress
      </h4>

      {failedStates.includes(current) && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex gap-3 items-start">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-semibold">Delivery Failed</p>
            <p className="text-red-600 text-sm">
              This delivery was cancelled or failed. Contact support if unexpected.
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Progress Vertical Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200">
          <div
            className="bg-green-500 transition-all duration-500"
            style={{
              height:
                safeIndex >= 0
                  ? `${(safeIndex / (steps.length - 1)) * 100}%`
                  : "0%",
            }}
          />
        </div>

        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted =
              index < safeIndex && !failedStates.includes(current);
            const isCurrent = index === safeIndex;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="flex items-start gap-4 relative"
              >
                {/* Status Icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                      ${
                        isCompleted
                          ? "bg-green-500 border-green-600 text-white scale-110"
                          : isCurrent
                          ? "bg-blue-500 border-blue-600 text-white shadow-lg scale-110"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Step Info */}
                <div
                  className={`flex-1 min-w-0 pb-6 ${
                    index < steps.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <p
                      className={`font-semibold text-lg ${
                        isCompleted
                          ? "text-green-700"
                          : isCurrent
                          ? "text-blue-700"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>

                    {isCurrent && !failedStates.includes(current) && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                        In Progress
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    {isSeller ? step.descriptionSeller : step.descriptionBuyer}
                  </p>

                  {/* Pickup Date Bubble */}
                  {step.key === "pickup_scheduled" &&
                    isCurrent &&
                    formatDateSafe(pickupDate) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                        <p className="text-blue-700 text-sm font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Pickup on {formatDateSafe(pickupDate)}
                        </p>
                      </div>
                    )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeliveryTimeline;
