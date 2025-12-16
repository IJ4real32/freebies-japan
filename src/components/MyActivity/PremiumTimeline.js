// =====================================================================
// FILE: PremiumTimeline.js — PHASE-2 FINAL (Backend-Aligned)
// Matches allowedTransitions in premiumActions.ts
// Supports:
//  - sellerScheduledPickup
//  - completionCheck
//  - buyerDeclinedAtDoor
// =====================================================================

import React from "react";
import {
  Package,
  CreditCard,
  CheckCircle,
  XCircle,
  Truck,
  Clock,
} from "lucide-react";

export default function PremiumTimeline({ currentStatus }) {
  // ============================================================
  // TRUE PHASE-2 ORDER (SOURCE OF TRUTH FROM BACKEND)
  // ============================================================
  const timeline = [
    { key: "depositPaid", label: "Deposit Paid", icon: CreditCard },
    { key: "preparingDelivery", label: "Preparing Delivery", icon: Package },
    {
      key: "sellerScheduledPickup",
      label: "Seller Scheduled Pickup",
      icon: Clock,
    },
    { key: "inTransit", label: "In Transit", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
    {
      key: "completionCheck",
      label: "Awaiting Both Parties Confirmation",
      icon: Clock,
    },
    { key: "sold", label: "Completed (Sold)", icon: CheckCircle },
  ];

  // ============================================================
  // CANCELLED / DECLINED STATES
  // ============================================================
  const cancelledStates = [
    "buyerDeclined",
    "buyerDeclinedAtDoor", // ⭐ NEW
    "cancelled",
    "autoClosed",
  ];

  const isCancelled = cancelledStates.includes(currentStatus);

  const currentIndex = timeline.findIndex((s) => s.key === currentStatus);

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">
        Delivery Timeline
      </h3>

      <div className="relative ml-3">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-gray-200"></div>

        {/* ============================================================
         * CANCELLED SECTION
         * ============================================================ */}
        {isCancelled && (
          <div className="flex items-start mb-4 relative">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 bg-red-600 border-red-600 text-white">
              <XCircle size={14} />
            </div>

            <div className="ml-3">
              <p className="text-sm font-medium text-red-700">
                Purchase Cancelled
              </p>
              <p className="text-xs text-gray-500">
                This premium order was cancelled or declined.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
         * NORMAL TIMELINE STEPS
         * ============================================================ */}
        {timeline.map((step) => {
          const Icon = step.icon;

          let completed = false;

          // When fully sold → everything completed
          if (currentStatus === "sold") {
            completed = true;
          } else if (!isCancelled) {
            const stepIndex = timeline.findIndex((s) => s.key === step.key);

            completed =
              currentIndex !== -1 && stepIndex !== -1 && stepIndex < currentIndex;
          }

          const isCurrent =
            !isCancelled &&
            currentIndex !== -1 &&
            step.key === timeline[currentIndex]?.key;

          return (
            <div key={step.key} className="flex items-start mb-4 relative">
              {/* Bullet */}
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border-2
                  ${
                    completed
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isCurrent
                      ? "bg-blue-200 border-blue-400 text-blue-700"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
              >
                <Icon size={14} />
              </div>

              {/* Label */}
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    completed
                      ? "text-gray-900"
                      : isCurrent
                      ? "text-blue-700"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
