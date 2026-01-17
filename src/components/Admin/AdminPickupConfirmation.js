// ===================================================================
// AdminPickupConfirmation.jsx
// PHASE-2 FINAL — Admin confirms seller pickup option (CANONICAL)
// BACKWARD COMPATIBLE (legacy date-only support)
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_TIME_SLOT = "08:00-12:00";

export default function AdminPickupConfirmation({ delivery, isAdmin }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading] = useState(false);

  /* --------------------------------------------------
   * HARD GUARDS — PHASE-2 CANONICAL
   * -------------------------------------------------- */
  if (!isAdmin || !delivery) return null;

  const addressReady =
    delivery.addressSubmitted === true ||
    (!!delivery.deliveryAddress && !!delivery.deliveryPhone);

  if (!addressReady) return null;

  if (
    !Array.isArray(delivery.sellerPickupOptions) ||
    delivery.sellerPickupOptions.length === 0
  ) {
    return null;
  }

  if (delivery.deliveryStatus !== "pickup_requested") return null;

  if (
    delivery.pickupStatus === "pickup_confirmed" ||
    delivery.deliveryStatus === "completed" ||
    delivery.deliveryStatus === "force_closed"
  ) {
    return null;
  }

  /* --------------------------------------------------
   * CONFIRM PICKUP
   * -------------------------------------------------- */
  const handleConfirm = async () => {
    if (selectedIdx === null) {
      toast.error("Please select a pickup option");
      return;
    }

    const rawOption = delivery.sellerPickupOptions[selectedIdx];

    // 🔑 BACKWARD-COMPAT NORMALIZATION
    const date =
      rawOption?.date?.seconds
        ? new Date(rawOption.date.seconds * 1000)
        : rawOption?.date
        ? new Date(rawOption.date)
        : new Date(rawOption);

    if (Number.isNaN(date.getTime())) {
      toast.error("Invalid pickup date");
      return;
    }

    const selectedOption = {
      date: date.toISOString().split("T")[0], // yyyy-mm-dd
      timeSlot: rawOption?.timeSlot || DEFAULT_TIME_SLOT,
    };

    try {
      setLoading(true);

      const confirmPickup = httpsCallable(
        functions,
        "confirmPickupDate"
      );

      await confirmPickup({
        requestId: delivery.requestId,
        selectedOption,
      });

      toast.success("Pickup confirmed");
    } catch (err) {
      console.error("confirmPickupDate error:", err);
      toast.error(
        err?.message || "Failed to confirm pickup"
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */
  return (
    <div className="mt-4 p-4 rounded-lg border bg-white">
      <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Calendar className="w-4 h-4 text-blue-600" />
        Confirm Seller Pickup
      </h4>

      <div className="space-y-2">
        {delivery.sellerPickupOptions.map((opt, idx) => {
          const date =
            opt?.date?.seconds
              ? new Date(opt.date.seconds * 1000)
              : opt?.date
              ? new Date(opt.date)
              : new Date(opt);

          const dateLabel = date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          const timeSlot = opt?.timeSlot || DEFAULT_TIME_SLOT;

          return (
            <label
              key={idx}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                selectedIdx === idx
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="pickupOption"
                checked={selectedIdx === idx}
                onChange={() => setSelectedIdx(idx)}
                disabled={loading}
              />

              <div className="flex flex-col text-sm">
                <span>{dateLabel}</span>
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Clock size={12} />
                  {timeSlot}
                  {!opt?.timeSlot && (
                    <span className="text-amber-600 ml-1">
                      (legacy)
                    </span>
                  )}
                </span>
              </div>
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
        Confirm Pickup
      </button>
    </div>
  );
}
