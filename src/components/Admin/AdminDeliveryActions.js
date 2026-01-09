// ===================================================================
// AdminDeliveryActions.jsx
// PHASE-2 FINAL — Admin delivery lifecycle controls
// ===================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";
import { Truck, XCircle } from "lucide-react";

export default function AdminDeliveryActions({ delivery, isAdmin }) {
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // HARD GUARDS — PHASE-2 CORRECT
  // --------------------------------------------------
  if (!isAdmin) return null;
  if (!delivery) return null;

  const isTerminal =
    delivery.deliveryStatus === "completed" ||
    delivery.deliveryStatus === "force_closed";

  // Only allow marking in transit AFTER pickup confirmed
  const canMarkInTransit =
    delivery.pickupStatus === "confirmed" &&
    delivery.deliveryStatus !== "in_transit";

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
  // FORCE CLOSE
  // --------------------------------------------------
  const handleForceClose = async () => {
    const reason = prompt(
      "Enter reason for force closing this delivery:"
    );

    if (!reason) return;

    setLoading(true);

    try {
      const forceClose = httpsCallable(
        functions,
        "adminForceCloseDelivery"
      );

      await forceClose({
        requestId: delivery.requestId,
        reason,
      });

      toast.success("Delivery force closed");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message || "Failed to force close delivery"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white">
      <h4 className="text-sm font-semibold mb-3">
        Admin Delivery Actions
      </h4>

      <div className="flex flex-col gap-2">
        {canMarkInTransit && (
          <button
            disabled={loading}
            onClick={handleMarkInTransit}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            <Truck size={16} />
            Mark In Transit
          </button>
        )}

        {!isTerminal && (
          <button
            disabled={loading}
            onClick={handleForceClose}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            <XCircle size={16} />
            Force Close Delivery
          </button>
        )}
      </div>
    </div>
  );
}
