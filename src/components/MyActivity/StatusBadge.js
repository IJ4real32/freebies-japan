// ================================================================
// FILE: StatusBadge.js — FINAL PHASE-2 SYNCED VERSION
// - Supports sellerAccepted (missing in your version)
// - Premium + Free delivery pipelines fully updated
// - Correct fallback behavior
// - Fully aligned with PremiumTimeline, PremiumActionPanel, DetailDrawer
// ================================================================

import React from 'react';
import { 
  Clock, UserCheck, XCircle, Award, Users,
  CheckCircle, Calendar, Truck, Package, Bike,
  Star, RefreshCcw, CreditCard, Shield, Crown
} from 'lucide-react';

const StatusBadge = ({
  status,
  deliveryStatus,
  isPremium = false,
  isListing = false,
  size = "sm"
}) => {

  // ==========================================================
  // PREMIUM STATUS CONFIG — PHASE 2
  // Includes sellerAccepted (missing before!)
  // ==========================================================
  const premiumConfig = {
    available:        { color:"bg-emerald-100 text-emerald-800 border-emerald-200", icon:Crown,         label:"Available" },
    depositPaid:      { color:"bg-amber-100 text-amber-800 border-amber-200",       icon:CreditCard,   label:"Deposit Paid" },
    buyerAccepted:    { color:"bg-blue-100 text-blue-800 border-blue-200",          icon:UserCheck,    label:"Buyer Accepted" },

    // NEW — IMPORTANT (phase-2)
    sellerAccepted:   { color:"bg-indigo-100 text-indigo-800 border-indigo-200",    icon:UserCheck,    label:"Seller Accepted" },

    buyerDeclined:    { color:"bg-red-100 text-red-800 border-red-200",             icon:XCircle,      label:"Buyer Declined" },
    preparingDelivery:{ color:"bg-indigo-100 text-indigo-800 border-indigo-200",    icon:Package,      label:"Preparing Delivery" },
    inTransit:        { color:"bg-purple-100 text-purple-800 border-purple-200",    icon:Truck,        label:"In Transit" },
    delivered:        { color:"bg-green-100 text-green-800 border-green-200",        icon:CheckCircle,  label:"Delivered" },
    sold:             { color:"bg-gray-100 text-gray-700 border-gray-300",           icon:CheckCircle,  label:"Sold" },
    cancelled:        { color:"bg-gray-100 text-gray-700 border-gray-300",           icon:XCircle,      label:"Cancelled" },
    autoClosed:       { color:"bg-gray-100 text-gray-700 border-gray-300",           icon:Clock,        label:"Auto Closed" },
  };

  // ==========================================================
  // FREE ITEM CONFIG
  // ==========================================================
  const statusConfig = {
    pending:          { color:'bg-yellow-100 text-yellow-800 border-yellow-200', icon:Clock, label:'Pending' },
    approved:         { color:'bg-blue-100 text-blue-800 border-blue-200',       icon:UserCheck, label:'Approved' },
    rejected:         { color:'bg-red-100 text-red-800 border-red-200',          icon:XCircle, label:'Rejected' },
    cancelled:        { color:'bg-gray-100 text-gray-800 border-gray-200',       icon:XCircle, label:'Cancelled' },

    requestClosed:    { color:'bg-gray-100 text-gray-700 border-gray-300',       icon:XCircle, label:'Closed' },
    closed:           { color:'bg-gray-100 text-gray-700 border-gray-300',       icon:XCircle, label:'Closed' },

    awarded:          { color:'bg-purple-100 text-purple-800 border-purple-200', icon:Award, label:'Awarded!' },
    awarded_to_other: { color:'bg-gray-100 text-gray-600 border-gray-300',       icon:Users, label:'Awarded to Another' },

    // Delivery pipeline
    accepted:          { color:'bg-green-100 text-green-800 border-green-200',   icon:CheckCircle, label:'Delivery Accepted' },
    pickup_scheduled:  { color:'bg-indigo-100 text-indigo-800 border-indigo-200',icon:Calendar, label:'Pickup Scheduled' },
    in_transit:        { color:'bg-purple-100 text-purple-800 border-purple-200',icon:Truck, label:'In Transit' },
    out_for_delivery:  { color:'bg-yellow-100 text-yellow-800 border-yellow-200',icon:Bike, label:'Out for Delivery' },
    delivered:         { color:'bg-emerald-100 text-emerald-800 border-emerald-200',icon:Package, label:'Delivered' },
    completed:         { color:'bg-teal-100 text-teal-800 border-teal-200',      icon:CheckCircle, label:'Completed' },

    // Listings
    active:            { color:'bg-blue-100 text-blue-800 border-blue-200',      icon:Star, label:'Active' },
    expired:           { color:'bg-gray-100 text-gray-600 border-gray-300',      icon:Clock, label:'Expired' },
    relisted:          { color:'bg-green-100 text-green-800 border-green-200',   icon:RefreshCcw, label:'Relisted' },
  };

  // ==========================================================
  // DELIVERY OVERRIDE (FREE ITEMS ONLY)
  // ==========================================================
  const deliveryOverride =
    !!deliveryStatus &&
    !isPremium &&
    !isListing;

  const currentStatus = deliveryOverride ? deliveryStatus : status;

  // ==========================================================
  // FINAL CONFIG SELECTION
  // ==========================================================
  const cfg = isPremium
    ? premiumConfig[currentStatus] || premiumConfig.available
    : statusConfig[currentStatus] || statusConfig.pending;

  const IconComponent = cfg.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${cfg.color}`}
    >
      <IconComponent size={size === "lg" ? 18 : 14} />
      <span>{cfg.label}</span>
    </div>
  );
};

export default StatusBadge;
