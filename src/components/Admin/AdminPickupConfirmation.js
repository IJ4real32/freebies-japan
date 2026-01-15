// ===================================================================
// AdminPickupConfirmation.jsx
// PHASE-2 FINAL — Admin confirms seller pickup date (CANONICAL)
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { Calendar, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPickupConfirmation({ delivery, isAdmin }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // HARD GUARDS — PHASE-2 CANONICAL
  // --------------------------------------------------
  if (!isAdmin) return null;
  if (!delivery) return null;

  // Address must be submitted
  const addressReady =
    delivery.addressSubmitted === true ||
    (!!delivery.deliveryAddress && !!delivery.deliveryPhone);

  if (!addressReady) return null;

  // Seller must have proposed pickup dates
  if (
    !Array.isArray(delivery.sellerPickupOptions) ||
    delivery.sellerPickupOptions.length === 0
  ) {
    return null;
  }

  // Only allow during pickup_requested phase
  if (delivery.deliveryStatus !== "pickup_requested") {
    return null;
  }

  // Do not show if already confirmed or terminal
  if (
    delivery.pickupStatus === "pickup_confirmed" ||
    delivery.deliveryStatus === "completed" ||
    delivery.deliveryStatus === "force_closed"
  ) {
    return null;
  }

  // --------------------------------------------------
  // CONFIRM PICKUP DATE
  // --------------------------------------------------
  const handleConfirm = async () => {
    if (!selectedDate) {
      toast.error("Please select a pickup date");
      return;
    }

    setLoading(true);

    try {
      const confirmPickup = httpsCallable(
        functions,
        "confirmPickupDate"
      );

      await confirmPickup({
        requestId: delivery.requestId,
        selectedDate,
      });

      toast.success("Pickup date confirmed");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message || "Failed to confirm pickup date"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="mt-4 p-4 rounded-lg border bg-white">
      <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Calendar className="w-4 h-4 text-blue-600" />
        Confirm Seller Pickup Date
      </h4>

      <div className="space-y-2">
        {delivery.sellerPickupOptions.map((dateValue, idx) => {
          const date =
            typeof dateValue === "string"
              ? new Date(dateValue)
              : dateValue?.seconds
              ? new Date(dateValue.seconds * 1000)
              : new Date(dateValue);

          const value = date.toISOString();

          return (
            <label
              key={idx}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                selectedDate === value
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="pickupDate"
                value={value}
                checked={selectedDate === value}
                onChange={() => setSelectedDate(value)}
                disabled={loading}
              />
              <span className="text-sm">
                {date.toLocaleDateString()}
              </span>
            </label>
          );
        })}
      </div>

      <button
        disabled={loading}
        onClick={handleConfirm}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        <CheckCircle size={16} />
        Confirm Pickup Date
      </button>
    </div>
  );
}
