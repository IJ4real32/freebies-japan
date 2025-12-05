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

/* -----------------------------------------------------------
 * NORMALIZE DELIVERY STATUS
 * Accepts: in_transit, inTransit, in-transit, etc.
 * ----------------------------------------------------------*/
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

const DeliveryTimeline = ({ status, deliveryStatus, pickupDate }) => {
  const normalized = normalizeStatus(deliveryStatus || status);

  /* -------------------------------------------------------
   * FAILED / CANCELLED DELIVERY (Phase-2)
   * ------------------------------------------------------*/
  const failedStates = ["cancelled", "failed"];

  const steps = [
    {
      key: "accepted",
      label: "Delivery Accepted",
      icon: UserCheck,
      description: "You confirmed your delivery details.",
    },
    {
      key: "pickup_scheduled",
      label: "Pickup Scheduled",
      icon: Calendar,
      description: "Admin has scheduled the pickup for your item.",
    },
    {
      key: "in_transit",
      label: "In Transit",
      icon: Truck,
      description: "Your item is being transported.",
    },
    {
      key: "out_for_delivery",
      label: "Out for Delivery",
      icon: Bike,
      description: "Your item is on the final route to you.",
    },
    {
      key: "delivered",
      label: "Delivered",
      icon: Package,
      description: "Your item has been delivered.",
    },
    {
      key: "completed",
      label: "Completed",
      icon: CheckCircle,
      description: "Transaction completed. Enjoy your item!",
    },
  ];

  const currentIndex = steps.findIndex((s) => s.key === normalized);

  /* -------------------------------------------------------
   * INVALID STATUS PROTECTION
   * Prevent broken timeline
   * ------------------------------------------------------*/
  const safeIndex = currentIndex >= 0 ? currentIndex : -1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h4 className="font-semibold text-gray-900 text-lg mb-6 flex items-center gap-3">
        <Truck className="w-5 h-5 text-blue-600" />
        Delivery Progress
      </h4>

      {/* CANCELLED STATE VIEW */}
      {failedStates.includes(normalized) && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex gap-3 items-start">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-semibold">Delivery Failed</p>
            <p className="text-red-600 text-sm">
              This delivery was cancelled or failed.  
              Contact support if this was unexpected.
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200">
          <div
            className="bg-green-500 transition-all duration-500 ease-in-out"
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
            const isCompleted = index < safeIndex && !failedStates.includes(normalized);
            const isCurrent = index === safeIndex;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="flex items-start gap-4 relative"
              >
                {/* Step icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
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

                {/* Step content */}
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

                    {isCurrent && !failedStates.includes(normalized) && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                        In Progress
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">{step.description}</p>

                  {/* Pickup date bubble */}
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

      {/* Footer progress bar */}
      {!failedStates.includes(normalized) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 font-medium text-sm">
                Progress: {safeIndex + 1} of {steps.length}
              </p>
              <p className="text-blue-600 text-xs">
                {safeIndex === steps.length - 1
                  ? "Completed! 🎉"
                  : "Keep going!"}
              </p>
            </div>

            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${((safeIndex + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryTimeline;
