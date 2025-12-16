// ======================================================================
// FILE: PremiumActionPanel.js — PHASE-2 UPGRADED VERSION
// Seller no longer accepts/declines — only schedules pickup
// Buyer sees decline/accept + doorstep decline
// COD / Deposit auto-locks item → “Item unavailable”
// ======================================================================

import React from "react";
import { XCircle, Clock } from "lucide-react";

export default function PremiumActionPanel({
  item,
  isOwner,
  isBuyer,
  onPremiumAction,
  onSchedulePickup,   // ⭐ NEW: Seller scheduling callback
  loading,
}) {
  if (!item || !item.isPremium) return null;

  const status = item.premiumStatus;
  const disabled = loading === item.id;

  // -----------------------------------------------
  // TERMINAL STATES → return nothing
  // -----------------------------------------------
  const terminal = [
    "sold",
    "delivered",
    "buyerDeclined",
    "buyerDeclinedAtDoor",
    "cancelled",
    "autoClosed",
  ];
  if (terminal.includes(status)) return null;

  // ===================================================================
  // BUYER ACTIONS (unchanged logic except wording updates)
  // ===================================================================
  if (isBuyer) {
    switch (status) {
      // --------------------------------------------------------------
      // Buyer confirms after deposit
      // --------------------------------------------------------------
      case "depositPaid":
        return (
          <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-2">
              Confirm Purchase
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Confirm if you want this item delivered.
            </p>

            <div className="flex gap-3">
              <button
                disabled={disabled}
                onClick={() => onPremiumAction("buyerAccepted")}
                className={`flex-1 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                Accept
              </button>

              <button
                disabled={disabled}
                onClick={() => onPremiumAction("buyerDeclined")}
                className={`flex-1 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                Decline
              </button>
            </div>
          </div>
        );

      // --------------------------------------------------------------
      // Doorstep decline (Phase-2)
      // --------------------------------------------------------------
      case "inTransit":
      case "out_for_delivery":
        return (
          <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-xl">
            <h4 className="font-semibold text-red-800 mb-2">
              Decline at Door
            </h4>
            <p className="text-xs text-red-700 mb-3">
              If you do not want the item anymore, decline delivery.
            </p>

            <button
              disabled={disabled}
              onClick={() => onPremiumAction("buyerDeclinedAtDoor")}
              className={`w-full py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 ${
                disabled ? "opacity-50" : ""
              }`}
            >
              Decline Delivery
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  // ===================================================================
  // SELLER ACTIONS — UPGRADED (NO ACCEPT/DECLINE)
  // Seller now ONLY schedules pickup
  // ===================================================================
  if (isOwner) {
    // --------------------------------------------------------------
    // After deposit → seller schedules pickup
    // --------------------------------------------------------------
    if (status === "depositPaid") {
      return (
        <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <h4 className="font-semibold text-blue-800 mb-2">
            Schedule Pickup
          </h4>

          <p className="text-xs text-blue-700 mb-3">
            Buyer has completed the deposit. Select a pickup date to proceed.
          </p>

          <button
            disabled={disabled}
            onClick={onSchedulePickup}
            className={`w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            Choose Pickup Date
          </button>
        </div>
      );
    }

    // --------------------------------------------------------------
    // After scheduling but before pickup → no actions, just info
    // --------------------------------------------------------------
    if (status === "sellerScheduledPickup") {
      return (
        <div className="mt-4 bg-purple-50 border border-purple-200 p-4 rounded-xl">
          <h4 className="font-semibold text-purple-800 mb-2">Pickup Scheduled</h4>
          <p className="text-xs text-purple-700">
            Waiting for logistics to pick up the item.
          </p>
        </div>
      );
    }

    // --------------------------------------------------------------
    // After pickup → transit handled by logistics (no seller action)
    // --------------------------------------------------------------
    if (status === "inTransit") {
      return (
        <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
          <h4 className="font-semibold text-gray-700 mb-1">In Transit</h4>
          <p className="text-xs text-gray-500">
            The courier is transporting the item.
          </p>
        </div>
      );
    }

    // --------------------------------------------------------------
    // After delivery → waiting for both confirmations
    // --------------------------------------------------------------
    if (status === "completionCheck") {
      return (
        <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-xl">
          <h4 className="font-semibold text-green-800 mb-2">
            Awaiting Confirmation
          </h4>
          <p className="text-xs text-green-700">
            Waiting for both buyer and seller to confirm completion.
          </p>
        </div>
      );
    }
  }

  return null;
}
