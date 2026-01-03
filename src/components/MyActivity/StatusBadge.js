// ========================================================================
// FILE: StatusBadge.js — PHASE-2 FINAL (FREE + PREMIUM SAFE)
// ========================================================================

import React from "react";
import {
  Clock,
  UserCheck,
  XCircle,
  Award,
  CheckCircle,
  Calendar,
  Truck,
  Package,
  Bike,
  CreditCard,
  Crown,
} from "lucide-react";

const StatusBadge = ({
  status,
  deliveryStatus,
  isPremium = false,
  isListing = false,
  size = "sm",
  showTimeline = false,
}) => {
  /* ==========================================================
     PREMIUM CONFIG — LOCKED
  ========================================================== */
  const premiumConfig = {
    available: {
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: Crown,
      label: "Available",
      step: 0,
    },
    pending_cod_confirmation: {
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Clock,
      label: "COD Requested",
      step: 1,
    },
    depositPaid: {
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: CreditCard,
      label: "Deposit Paid",
      step: 1,
    },
    sellerScheduledPickup: {
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: Calendar,
      label: "Pickup Scheduled",
      step: 2,
    },
    preparingDelivery: {
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: Package,
      label: "Preparing",
      step: 3,
    },
    inTransit: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Truck,
      label: "In Transit",
      step: 4,
    },
    delivered: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Delivered",
      step: 5,
    },
    completionCheck: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Clock,
      label: "Awaiting Confirmation",
      step: 6,
    },
    sold: {
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: CheckCircle,
      label: "Completed",
      step: 7,
    },
    buyerDeclined: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
      label: "Buyer Declined",
      step: -1,
    },
    buyerDeclinedAtDoor: {
      color: "bg-red-200 text-red-900 border-red-300",
      icon: XCircle,
      label: "Declined at Door",
      step: -1,
    },
    cancelled: {
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: XCircle,
      label: "Cancelled",
      step: -1,
    },
    autoClosed: {
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: Clock,
      label: "Auto Closed",
      step: -1,
    },
    force_closed: {
      color: "bg-red-100 text-red-800 border-red-300",
      icon: XCircle,
      label: "Force Closed",
      step: -1,
    },
    unknown: {
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: Clock,
      label: "Processing",
      step: 0,
    },
  };

  /* ==========================================================
     FREE CONFIG — UI STATES ONLY
  ========================================================== */
  const freeConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
      label: "Pending",
      step: 0,
    },
    approved: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: UserCheck,
      label: "Approved",
      step: 1,
    },
    awarded: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Award,
      label: "Awarded",
      step: 2,
    },
    accepted: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Accepted",
      step: 3,
    },
    in_transit: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Truck,
      label: "In Transit",
      step: 5,
    },
    delivered: {
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: Package,
      label: "Delivered",
      step: 7,
    },
    completed: {
      color: "bg-teal-100 text-teal-800 border-teal-200",
      icon: CheckCircle,
      label: "Completed",
      step: 8,
    },
    rejected: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
      label: "Rejected",
      step: -1,
    },
    cancelled: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: XCircle,
      label: "Cancelled",
      step: -1,
    },
    force_closed: {
      color: "bg-red-100 text-red-800 border-red-300",
      icon: XCircle,
      label: "Force Closed",
      step: -1,
    },
  };

  /* ==========================================================
     FREE STATUS RESOLVER — PHASE-2 AUTHORITATIVE
  ========================================================== */
  const terminalStates = ["rejected", "cancelled", "force_closed"];

  const normalize = (v) =>
    (v || "").toLowerCase().replace(/[-_]/g, "");

  const normalizedDelivery = normalize(deliveryStatus);

  const resolvedFreeStatus = terminalStates.includes(status)
    ? status
    : normalizedDelivery.includes("intransit")
    ? "in_transit"
    : normalizedDelivery.includes("delivered")
    ? "delivered"
    : normalizedDelivery.includes("completed")
    ? "completed"
    : normalizedDelivery
    ? "accepted"
    : status || "pending";

  const cfg = isPremium
    ? premiumConfig[status] || premiumConfig.unknown
    : freeConfig[resolvedFreeStatus] || freeConfig.pending;

  const Icon = cfg.icon;
  const isTerminal = cfg.step < 0;

  const sizeMap = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const showProgress = showTimeline && !isTerminal && !isListing;
  const pipelineSteps = 9;

  return (
    <div className="flex flex-col gap-1">
      {/* STATUS BADGE */}
      <div
        className={`inline-flex items-center gap-1 rounded-full border font-medium
        ${sizeMap[size]}
        ${cfg.color}`}
      >
        <Icon size={size === "lg" ? 18 : 14} />
        <span>{cfg.label}</span>
      </div>

      {/* PROGRESS BAR */}
      {showProgress && (
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: pipelineSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= cfg.step ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusBadge;
