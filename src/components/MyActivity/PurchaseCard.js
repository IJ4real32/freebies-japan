// =============================================================
// FILE: PurchaseCard.js (PHASE-2 — FINAL STABLE PATCH v3)
// Premium Buyer Activity Card — Uses donations.images ALWAYS
// =============================================================

import React from "react";
import { Eye, Trash2 } from "lucide-react";

// Premium delivery lock stages (cannot delete)
const DELIVERY_LOCK = [
  "depositPaid",
  "sellerAccepted",
  "preparingDelivery",
  "inTransit",
  "delivered",
  "sold",
];

// Allowed delete statuses (your confirmed rules)
const ALLOW_DELETE = ["cancelled", "completed", "rejected", "available"];

export default function PurchaseCard({
  item,
  onView,
  onDelete,
  loading,
  statusConfig = {},
}) {
  if (!item) return null;

  // ============================================================
  // 🔥 ABSOLUTE FIX — USE donation.images AS THE ONLY SOURCE
  // ============================================================
  const donation = item?.donation || {}; // Hydrated in MyActivity

  const images = donation.images || [];
  const safeImage =
    images.length > 0 ? images[0] : "/images/default-item.jpg";

  const safeTitle =
    donation.title || item.itemTitle || "Premium Item";

  const price =
    donation.price || item.itemPriceJPY || null;

  const premiumStatus = item.premiumStatus || "unknown";

  // ============================================================
  // FINAL DELETE LOGIC (Phase-2 Confirmed)
  // ============================================================
  const canDelete =
    !DELIVERY_LOCK.includes(premiumStatus) &&
    ALLOW_DELETE.includes(premiumStatus);

  // ============================================================
  // Premium Status → Badge + Description
  // ============================================================
  const PREMIUM_STATUS_MAP = {
    available: {
      badge: "Available",
      color: "bg-gray-200 text-gray-700",
      msg: null,
    },
    depositPaid: {
      badge: "Deposit Paid",
      color: "bg-amber-600 text-white",
      msg: "⏳ Seller preparing your item",
    },
    sellerAccepted: {
      badge: "Accepted",
      color: "bg-blue-600 text-white",
      msg: "📦 Seller accepted your purchase",
    },
    preparingDelivery: {
      badge: "Preparing",
      color: "bg-indigo-600 text-white",
      msg: "🔧 Preparing item for dispatch",
    },
    inTransit: {
      badge: "In Transit",
      color: "bg-purple-600 text-white",
      msg: "🚚 Item is on the way",
    },
    delivered: {
      badge: "Delivered",
      color: "bg-green-600 text-white",
      msg: "✅ Delivered successfully",
    },
    sold: {
      badge: "Completed",
      color: "bg-gray-700 text-white",
      msg: "🎉 Transaction complete",
    },
    cancelled: {
      badge: "Cancelled",
      color: "bg-red-600 text-white",
      msg: "❌ Purchase was cancelled",
    },
    rejected: {
      badge: "Rejected",
      color: "bg-red-500 text-white",
      msg: "⚠️ Payment was rejected",
    },
    completed: {
      badge: "Completed",
      color: "bg-green-700 text-white",
      msg: "🎉 Order completed",
    },
    unknown: {
      badge: "Processing",
      color: "bg-gray-500 text-white",
      msg: "Processing your order",
    },
  };

  const status =
    PREMIUM_STATUS_MAP[premiumStatus] || PREMIUM_STATUS_MAP.unknown;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-4">

        {/* ====================== HEADER ====================== */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
              {safeTitle}
            </h3>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}
              >
                {status.badge}
              </span>

              <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white">
                Premium
              </span>
            </div>
          </div>

          {/* Thumbnail */}
          <img
            src={safeImage}
            alt={safeTitle}
            className="w-16 h-16 ml-2 rounded-lg object-cover shadow-sm"
            onClick={() => onView(item)}
            onError={(e) => (e.target.src = "/images/default-item.jpg")}
          />
        </div>

        {/* ====================== PRICE ====================== */}
        {price && (
          <div className="flex justify-between text-sm text-gray-700 mb-2">
            <span>Price:</span>
            <span className="font-semibold text-indigo-700">
              ¥{price.toLocaleString()}
            </span>
          </div>
        )}

        {/* ====================== STATUS MESSAGE ====================== */}
        {status.msg && (
          <p className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded">
            {status.msg}
          </p>
        )}

        {/* ====================== ACTIONS ====================== */}
        <div className="flex justify-between items-center mt-4">

          <button
            onClick={() => onView(item)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
          >
            <Eye size={16} />
            View Details
          </button>

          <button
            onClick={() => onDelete(item)}
            disabled={loading || !canDelete}
            className={`p-1.5 rounded-full transition-colors ${
              canDelete
                ? "hover:bg-red-50 hover:text-red-600 text-gray-500"
                : "opacity-40 cursor-not-allowed text-gray-400"
            }`}
            title={
              canDelete ? "Delete record" : "Cannot delete during delivery"
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
