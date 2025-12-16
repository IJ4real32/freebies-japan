// ========================================================================
// FILE: StatusBadge.js — FINAL PHASE-2 SYNC (UPGRADED STATUS BAR + TIMELINE)
// ========================================================================

import React from "react";
import {
  Clock, UserCheck, XCircle, Award, Users,
  CheckCircle, Calendar, Truck, Package, Bike,
  Star, RefreshCcw, CreditCard, Crown
} from "lucide-react";

const StatusBadge = ({
  status,
  deliveryStatus,
  isPremium = false,
  isListing = false,
  size = "sm",
  showTimeline = false, // NEW: mobile-first progress bar
}) => {

  // ==========================================================
  // PREMIUM CONFIG — FINAL PHASE-2 LIST (CORRECTED)
  // ==========================================================
  const premiumConfig = {
    available:        { color:"bg-emerald-100 text-emerald-800 border-emerald-200", icon:Crown,       label:"Available", step:0 },

    pending_cod_confirmation: {
      color:"bg-amber-100 text-amber-800 border-amber-200",
      icon:Clock,
      label:"COD Requested",
      step:1,
    },

    depositPaid:      { color:"bg-amber-100 text-amber-800 border-amber-200", icon:CreditCard, label:"Deposit Paid", step:1 },

    sellerScheduledPickup: {
      color:"bg-indigo-100 text-indigo-800 border-indigo-200",
      icon:Calendar,
      label:"Pickup Scheduled",
      step:2,
    },

    preparingDelivery:{ color:"bg-indigo-100 text-indigo-800 border-indigo-200", icon:Package, step:3, label:"Preparing" },
    inTransit:        { color:"bg-purple-100 text-purple-800 border-purple-200", icon:Truck,   step:4, label:"In Transit" },
    delivered:        { color:"bg-green-100 text-green-800 border-green-200",  icon:CheckCircle, step:5, label:"Delivered" },

    completionCheck: {
      color:"bg-blue-100 text-blue-800 border-blue-200",
      icon:Clock,
      step:6,
      label:"Awaiting Confirmation",
    },

    sold:             { color:"bg-gray-100 text-gray-700 border-gray-300", icon:CheckCircle, step:7, label:"Completed" },

    buyerDeclined:    { color:"bg-red-100 text-red-800 border-red-200", icon:XCircle, step:-1, label:"Buyer Declined" },
    buyerDeclinedAtDoor:{ color:"bg-red-200 text-red-900 border-red-300", icon:XCircle, step:-1, label:"Declined at Door" },

    cancelled:        { color:"bg-gray-100 text-gray-700 border-gray-300", icon:XCircle, step:-1, label:"Cancelled" },
    autoClosed:       { color:"bg-gray-100 text-gray-700 border-gray-300", icon:Clock,  step:-1, label:"Auto Closed" },

    unknown:          { color:"bg-gray-100 text-gray-700 border-gray-300", icon:Clock, step:0, label:"Processing" },
  };

  // ==========================================================
  // FREE CONFIG — FINAL PHASE-2 SET
  // ==========================================================
  const freeConfig = {
    pending:          { color:'bg-yellow-100 text-yellow-800 border-yellow-200', icon:Clock,       label:'Pending', step:0 },
    approved:         { color:'bg-blue-100 text-blue-800 border-blue-200',       icon:UserCheck,   label:'Approved', step:1 },
    rejected:         { color:'bg-red-100 text-red-800 border-red-200',          icon:XCircle,     label:'Rejected', step:-1 },
    cancelled:        { color:'bg-gray-100 text-gray-800 border-gray-200',       icon:XCircle,     label:'Cancelled', step:-1 },

    awarded:          { color:'bg-purple-100 text-purple-800 border-purple-200', icon:Award,       label:'Awarded', step:2 },
    accepted:         { color:'bg-green-100 text-green-800 border-green-200',    icon:CheckCircle, label:'Accepted', step:3 },
    pickup_scheduled: { color:'bg-indigo-100 text-indigo-800 border-indigo-200', icon:Calendar,    label:'Pickup Scheduled', step:4 },
    in_transit:       { color:'bg-purple-100 text-purple-800 border-purple-200', icon:Truck,       label:'In Transit', step:5 },
    out_for_delivery: { color:'bg-yellow-100 text-yellow-800 border-yellow-200', icon:Bike,        label:'Out for Delivery', step:6 },
    delivered:        { color:'bg-emerald-100 text-emerald-800 border-emerald-200',icon:Package,  label:'Delivered', step:7 },
    completed:        { color:'bg-teal-100 text-teal-800 border-teal-200',        icon:CheckCircle, label:'Completed', step:8 },
  };

  const pipeline = [
    'pending','approved','awarded','accepted','pickup_scheduled','in_transit','out_for_delivery','delivered','completed'
  ];

  const useDelivery = !isPremium && deliveryStatus && pipeline.includes(deliveryStatus);
  const finalStatus = useDelivery ? deliveryStatus : status;

  const cfg = isPremium
    ? premiumConfig[finalStatus] || premiumConfig.unknown
    : freeConfig[finalStatus] || freeConfig.pending;

  const Icon = cfg.icon;

  const sizeMap = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Badge */}
      <div className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeMap[size]} ${cfg.color}`}>
        <Icon size={size === 'lg' ? 18 : 14} />
        <span>{cfg.label}</span>
      </div>

      {/* Mobile-first Timeline */}
      {showTimeline && cfg.step >= 0 && (
        <div className="flex items-center gap-1 mt-1">
          {pipeline.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= cfg.step ? 'bg-green-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusBadge;
