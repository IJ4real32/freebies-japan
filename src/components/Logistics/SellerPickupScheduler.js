// ===================================================================
// SellerPickupScheduler.js
// PHASE-2 CANONICAL — Seller proposes pickup dates
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";
import { Calendar, CheckCircle } from "lucide-react";

export default function SellerPickupScheduler({
  delivery,
  currentUserId,
}) {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!delivery) return null;

  /* --------------------------------------------------
   * PHASE-2 HARD GUARDS (AUTHORITATIVE)
   * -------------------------------------------------- */

  // Seller only
  if (!delivery.sellerId || delivery.sellerId !== currentUserId) return null;

  // Buyer MUST have submitted address
  if (delivery.addressSubmitted !== true) return null;

  // Canonical lifecycle state
  if (delivery.deliveryStatus !== "pickup_requested") return null;

  const pickupStatus = delivery.pickupStatus || null;

  // One-time proposal only
  if (
    pickupStatus === "pickup_scheduled" ||
    pickupStatus === "pickup_confirmed"
  ) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Pickup already scheduled
      </div>
    );
  }

  /* --------------------------------------------------
   * HANDLERS
   * -------------------------------------------------- */
  const submitPickupDates = async () => {
    if (!dates.length) {
      toast.error("Please select a pickup date.");
      return;
    }

    // 🔑 PHASE-2 CANONICAL REQUEST ID
    const requestId = delivery.requestId || delivery.id;
    if (!requestId) {
      toast.error("Delivery reference missing.");
      return;
    }

    try {
      setLoading(true);

      const fn = httpsCallable(functions, "submitSellerPickupOptions");

      await fn({
        requestId,
        pickupOptions: dates,
      });

      toast.success("Pickup date submitted");
    } catch (err) {
      console.error("submitSellerPickupOptions error:", err);
      toast.error(err?.message || "Failed to submit pickup date.");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */
  return (
    <div className="mt-6 border rounded-lg p-4 bg-gray-50">
      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Propose Pickup Date
      </h4>

      <input
        type="date"
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            setDates([]);
            return;
          }

          const date = new Date(`${value}T10:00:00`);
          if (Number.isNaN(date.getTime())) {
            toast.error("Invalid pickup date");
            return;
          }

          setDates([date.toISOString()]);
        }}
        className="border rounded px-3 py-2 text-sm w-full"
      />

      <button
        onClick={submitPickupDates}
        disabled={loading || !dates.length}
        className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Pickup Date"}
      </button>
    </div>
  );
}
