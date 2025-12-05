// ================================================================
// FILE: PremiumTimeline.js  — FINAL PHASE-2 PREMIUM DELIVERY TIMELINE
// - Supports all premium states including sellerAccepted
// - Clean vertical timeline with stable order
// - Fully aligned with PremiumStatusConfig, DetailDrawer & PremiumActionPanel
// ================================================================

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
  // FULL ORDERED TIMELINE (PHASE-2 STANDARD)
  // ============================================================
  const timeline = [
    { key: "depositPaid", label: "Deposit Paid", icon: CreditCard },
    { key: "buyerAccepted", label: "Buyer Accepted", icon: CheckCircle },
    { key: "sellerAccepted", label: "Seller Accepted", icon: CheckCircle },
    { key: "preparingDelivery", label: "Preparing Delivery", icon: Package },
    { key: "inTransit", label: "In Transit", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
    { key: "sold", label: "Completed (Sold)", icon: CheckCircle },
  ];

  // ============================================================
  // CANCELLATION / FAILURE STATES
  // ============================================================
  const cancelledStates = ["buyerDeclined", "cancelled", "autoClosed"];

  const currentIndex = timeline.findIndex((s) => s.key === currentStatus);

  const isCancelled = cancelledStates.includes(currentStatus);

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">
        Delivery Timeline
      </h3>

      <div className="relative ml-3">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-gray-200"></div>

        {/* ============================================================
         * CANCELLED / FAILED SECTION
         * ========================================================== */}
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
                This premium purchase was cancelled or declined.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
         * NORMAL TIMELINE STEPS
         * ========================================================== */}
        {timeline.map((step) => {
          const Icon = step.icon;

          let completed = false;

          if (currentStatus === "sold") {
            completed = true; // mark all as completed for sold
          } else if (!isCancelled) {
            const stepIndex = timeline.findIndex((s) => s.key === step.key);
            completed =
              currentIndex !== -1 &&
              stepIndex !== -1 &&
              stepIndex <= currentIndex;
          }

          return (
            <div key={step.key} className="flex items-start mb-4 relative">
              {/* Bullet */}
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border-2
                  ${
                    completed
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
              >
                <Icon size={14} />
              </div>

              {/* Label */}
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    completed ? "text-gray-900" : "text-gray-500"
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
