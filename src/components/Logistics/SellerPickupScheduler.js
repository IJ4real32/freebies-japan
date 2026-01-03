// ===================================================================
// SellerPickupScheduler.js
// PHASE-2 FINAL — Seller proposes pickup date options (AUTHORITATIVE)
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";
import { Calendar, CheckCircle } from "lucide-react";

export default function SellerPickupScheduler({ delivery }) {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------------
  // HARD GUARDS — Phase-2 rules (BACKEND CANONICAL)
  // ------------------------------------------------------------------
  if (!delivery) return null;

  // Admin-sponsored items → seller must never see pickup UI
  if (delivery.donorType === "admin") return null;

  // ✅ FIX 1: Align with backend canonical pickup state
  if (delivery.pickupStatus !== "pickupRequested") return null;

  const handleAddDate = (value) => {
    if (!value) return;
    if (dates.includes(value)) return;

    if (dates.length >= 3) {
      toast.error("Maximum of 3 pickup dates allowed");
      return;
    }

    setDates((prev) => [...prev, value]);
  };

  const removeDate = (value) => {
    setDates((prev) => prev.filter((d) => d !== value));
  };

  const handleSubmit = async () => {
    if (dates.length === 0) {
      toast.error("Please select at least one pickup date");
      return;
    }

    setLoading(true);

    try {
      // ✅ FIX 2: Correct callable function name
      const submitPickup = httpsCallable(
        functions,
        "submitSellerPickupOptions"
      );

      // ✅ FIX 3: Correct payload (delivery-scoped)
      await submitPickup({
        deliveryId: delivery.id,
        dates,
      });

      toast.success("Pickup dates submitted");

      // UI lock — backend advances lifecycle
      setDates([]);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to submit pickup dates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-lg border bg-white">
      <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
        <Calendar className="w-4 h-4" />
        Propose Pickup Dates
      </h3>

      <input
        type="date"
        className="w-full border rounded px-3 py-2 text-sm"
        onChange={(e) => handleAddDate(e.target.value)}
        disabled={loading}
      />

      {dates.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {dates.map((d) => (
            <li
              key={d}
              className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded"
            >
              <span>{new Date(d).toLocaleDateString()}</span>
              <button
                type="button"
                className="text-red-500 text-xs"
                onClick={() => removeDate(d)}
                disabled={loading}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        disabled={loading}
        onClick={handleSubmit}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        <CheckCircle className="w-4 h-4" />
        Submit Pickup Options
      </button>
    </div>
  );
}
