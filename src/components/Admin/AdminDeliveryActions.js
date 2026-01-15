// ===================================================================
// AdminDeliveryActions.jsx
// PHASE-2 FINAL — Admin delivery lifecycle controls (CANONICAL)
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";
import { Truck } from "lucide-react";

export default function AdminDeliveryActions({ delivery, isAdmin }) {
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // HARD GUARDS — PHASE-2 CORRECT
  // --------------------------------------------------
  if (!isAdmin) return null;
  if (!delivery) return null;

  const isTerminal = ["completed", "force_closed", "cancelled"].includes(
    delivery.deliveryStatus
  );

  // pickup_confirmed → in_transit ONLY
  const canMarkInTransit =
    delivery.pickupStatus === "pickup_confirmed" &&
    delivery.deliveryStatus === "pickup_requested";

  // --------------------------------------------------
  // MARK IN TRANSIT
  // --------------------------------------------------
  const handleMarkInTransit = async () => {
    setLoading(true);

    try {
      const markTransit = httpsCallable(
        functions,
        "markDeliveryInTransit"
      );

      await markTransit({
        requestId: delivery.requestId,
      });

      toast.success("Delivery marked as in transit");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message || "Failed to mark delivery in transit"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
// UI
// --------------------------------------------------
if (isTerminal) return null;

return (
  <div className="mt-4 p-4 border rounded-lg bg-slate-50">
    <h4 className="text-sm font-semibold mb-3 text-slate-700">
      Admin Delivery Actions
    </h4>

    {canMarkInTransit ? (
      <button
        disabled={loading}
        onClick={handleMarkInTransit}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
      >
        <Truck size={16} />
        Mark In Transit
      </button>
    ) : (
      <p className="text-xs text-slate-500">
        ⏳ Waiting for seller pickup confirmation before transit
      </p>
    )}
  </div>
);
}