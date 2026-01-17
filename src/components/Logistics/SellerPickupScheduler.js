// ===================================================================
// SellerPickupScheduler.js
// PHASE-2 CANONICAL — Seller proposes pickup date + time slot
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";
import { Calendar, CheckCircle, Clock } from "lucide-react";

/* ------------------------------------------------------------------
 * PHASE-2 CANONICAL TIME SLOTS (MUST MATCH BACKEND)
 * ------------------------------------------------------------------ */
const TIME_SLOTS = [
  "08:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
];

export default function SellerPickupScheduler({
  delivery,
  currentUserId,
}) {
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]); // default
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
  const submitPickup = async () => {
    if (!date) {
      toast.error("Please select a pickup date.");
      return;
    }

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
        pickupOptions: [
          {
            date,       // YYYY-MM-DD
            timeSlot,   // PHASE-2 REQUIRED
          },
        ],
      });

      toast.success("Pickup proposal submitted");
    } catch (err) {
      console.error("submitSellerPickupOptions error:", err);
      toast.error(err?.message || "Failed to submit pickup proposal.");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */
  return (
    <div className="mt-6 border rounded-lg p-4 bg-gray-50">
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Propose Pickup
      </h4>

      {/* DATE */}
      <label className="block text-xs text-gray-600 mb-1">
        Pickup Date
      </label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border rounded px-3 py-2 text-sm w-full mb-3"
      />

      {/* TIME SLOT */}
      <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Time Slot
      </label>
      <select
        value={timeSlot}
        onChange={(e) => setTimeSlot(e.target.value)}
        className="border rounded px-3 py-2 text-sm w-full"
      >
        {TIME_SLOTS.map((slot) => (
          <option key={slot} value={slot}>
            {slot}
          </option>
        ))}
      </select>

      <button
        onClick={submitPickup}
        disabled={loading || !date}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Pickup Proposal"}
      </button>
    </div>
  );
}
