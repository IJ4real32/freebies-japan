// ================================================================
// FILE: PremiumActionPanel.js  — FINAL PHASE-2 PREMIUM ACTION ENGINE
// - Fully aligned with MyActivity.js, DetailDrawer.js & PurchaseCard.js
// - Handles full Buyer & Seller flows with correct transition names
// - Safe, consistent, and regression-proof
// ================================================================

import React from "react";
import { Package, CheckCircle, XCircle, Truck, Clock } from "lucide-react";

export default function PremiumActionPanel({
  item,
  isOwner,
  isBuyer,
  onPremiumAction,
  loading,
}) {
  if (!item || !item.isPremium) return null;

  const status = item.premiumStatus;

  const disabled = loading === item.id;

  // ============================================================
  // TERMINAL STATES — No actions available
  // ============================================================
  const terminal = [
    "sold",
    "delivered",
    "buyerDeclined",
    "cancelled",
    "autoClosed",
  ];

  if (terminal.includes(status)) return null;

  // ============================================================
  // BUYER ACTIONS
  // ============================================================
  if (isBuyer) {
    switch (status) {
      case "depositPaid":
        return (
          <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-2">Confirm Purchase</h4>

            <p className="text-xs text-gray-600 mb-3">
              Do you want to accept this item for delivery?
            </p>

            <div className="flex gap-3">
              {/* ACCEPT PREMIUM PURCHASE */}
              <button
                disabled={disabled}
                onClick={() => onPremiumAction(item, "buyerAccepted")}
                className={`flex-1 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                Accept
              </button>

              {/* DECLINE PREMIUM PURCHASE */}
              <button
                disabled={disabled}
                onClick={() => onPremiumAction(item, "buyerDeclined")}
                className={`flex-1 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 transition ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                Decline
              </button>
            </div>
          </div>
        );

      case "inTransit":
        return (
          <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-xl">
            <h4 className="font-semibold text-green-800 mb-2">
              Confirm Delivery
            </h4>

            <p className="text-xs text-green-700 mb-3">
              Tap below once the item arrives.
            </p>

            <button
              disabled={disabled}
              onClick={() => onPremiumAction(item, "confirm_delivery")}
              className={`w-full py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition ${
                disabled ? "opacity-50" : ""
              }`}
            >
              Confirm Received
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  // ============================================================
  // SELLER ACTIONS
  // ============================================================
  if (isOwner) {
    switch (status) {
      case "depositPaid":
        return (
          <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-2">
              Approve Buyer Request
            </h4>

            <p className="text-xs text-blue-700 mb-3">
              Buyer has paid a deposit. Mark as accepted to prepare for delivery.
            </p>

            <button
              disabled={disabled}
              onClick={() => onPremiumAction(item, "sellerAccepted")}
              className={`w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition ${
                disabled ? "opacity-50" : ""
              }`}
            >
              Mark as Accepted
            </button>
          </div>
        );

      case "sellerAccepted":
        return (
          <div className="mt-4 bg-purple-50 border border-purple-200 p-4 rounded-xl">
            <h4 className="font-semibold text-purple-800 mb-2">
              Prepare Delivery
            </h4>

            <p className="text-xs text-purple-700 mb-3">
              Click below once the item has been packaged.
            </p>

            <button
              disabled={disabled}
              onClick={() => onPremiumAction(item, "preparingDelivery")}
              className={`w-full py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition ${
                disabled ? "opacity-50" : ""
              }`}
            >
              Mark Preparing
            </button>
          </div>
        );

      case "preparingDelivery":
        return (
          <div className="mt-4 bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
            <h4 className="font-semibold text-indigo-800 mb-2">
              Ship the Item
            </h4>

            <p className="text-xs text-indigo-600 mb-3">
              Mark the item in transit once handed to a courier.
            </p>

            <button
              disabled={disabled}
              onClick={() => onPremiumAction(item, "inTransit")}
              className={`w-full py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition ${
                disabled ? "opacity-50" : ""
              }`}
            >
              Mark In Transit
            </button>
          </div>
        );

      case "inTransit":
        return (
          <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-700 mb-2">In Transit</h4>
            <p className="text-xs text-gray-600">
              Waiting for buyer to confirm delivery.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return null;
}
