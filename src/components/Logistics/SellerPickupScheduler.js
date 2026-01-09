// ===================================================================
// SellerPickupScheduler.js
// PHASE-2 CANONICAL — Seller proposes pickup dates
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";
import { Calendar, CheckCircle } from "lucide-react";

export default function SellerPickupScheduler({ delivery }) {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!delivery) return null;

  /* --------------------------------------------------
   * PHASE-2 HARD GUARDS
   * -------------------------------------------------- */

  // Admin-sponsored items → seller never proposes pickup
  if (delivery.donorType === "admin") return null;

  // 🔑 PHASE-2: buyer MUST have submitted address
  if (delivery.addressSubmitted !== true) return null;

  // 🔑 PHASE-2: pickup must be requested
  if (delivery.deliveryStatus !== "pickup_requested") return null;

  // Seller may propose pickup ONLY ONCE
  if (
    delivery.pickupStatus === "pickup_scheduled" ||
    delivery.pickupStatus === "pickup_confirmed"
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
      toast.error("Please select at least one pickup date.");
      return;
    }

    try {
      setLoading(true);

      const fn = httpsCallable(functions, "submitSellerPickupOptions");

      await fn({
        deliveryId: delivery.id,
        pickupOptions: dates,
      });

      toast.success("Pickup dates submitted");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to submit pickup dates.");
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
        Propose Pickup Dates
      </h4>

      <input
        type="date"
        onChange={(e) => setDates([e.target.value])}
        className="border rounded px-3 py-2 text-sm w-full"
      />

      <button
        onClick={submitPickupDates}
        disabled={loading}
        className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Pickup Date"}
      </button>
    </div>
  );
}
