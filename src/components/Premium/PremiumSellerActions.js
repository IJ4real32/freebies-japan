import React, { useState } from "react";
import toast from "react-hot-toast";

export default function PremiumSellerActions({ item, updateFn, refresh }) {
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  const doUpdate = async (nextStatus, extra = {}) => {
    try {
      setLoading(true);

      await updateFn({
        itemId: item.id,
        status: nextStatus, // ✅ FIX: must be `status` not `nextStatus`
        ...extra,
      });

      toast.success("Status updated!");
      refresh(); // refresh parent drawer
    } catch (err) {
      console.error(err);
      toast.error("Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  /* *****************************************************************
   *                     PREMIUM SELLER WORKFLOW (PHASE 2)
   ********************************************************************

      depositPaid → buyerAccepted → preparingDelivery → inTransit → delivered → sold
                               ↓
                       buyerDeclined (terminal)

  ******************************************************************** */

  switch (item.premiumStatus) {
    /* -------------------------------------------------------------
     * 1) Buyer paid deposit — seller is waiting for buyer acceptance
     * ------------------------------------------------------------- */
    case "depositPaid":
      return (
        <p className="text-center text-gray-600 py-2">
          Waiting for buyer to accept delivery…
        </p>
      );

    /* -------------------------------------------------------------
     * 2) Buyer Declined — terminal state
     * ------------------------------------------------------------- */
    case "buyerDeclined":
      return (
        <p className="text-center text-red-500 py-2 font-medium">
          ❌ Buyer declined the purchase.
          <br />
          Please relist or contact support.
        </p>
      );

    /* -------------------------------------------------------------
     * 3) Buyer Accepted — seller now prepares the delivery
     * ------------------------------------------------------------- */
    case "buyerAccepted":
      return (
        <button
          disabled={loading}
          onClick={() => doUpdate("preparingDelivery")}
          className="w-full bg-blue-600 text-white px-6 py-2 rounded font-medium"
        >
          {loading ? "Processing…" : "Start Preparing Delivery"}
        </button>
      );

    /* -------------------------------------------------------------
     * 4) Preparing Delivery — next: inTransit
     * ------------------------------------------------------------- */
    case "preparingDelivery":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-600">
              Tracking Number (optional)
            </label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <button
            disabled={loading}
            onClick={() => doUpdate("inTransit", { trackingNumber })}
            className="w-full bg-purple-600 text-white px-6 py-2 rounded font-medium"
          >
            {loading ? "Processing…" : "Mark as In Transit"}
          </button>
        </div>
      );

    /* -------------------------------------------------------------
     * 5) In Transit — next: delivered
     * ------------------------------------------------------------- */
    case "inTransit":
      return (
        <button
          disabled={loading}
          onClick={() => doUpdate("delivered")}
          className="w-full bg-indigo-600 text-white px-6 py-2 rounded font-medium"
        >
          {loading ? "Processing…" : "Mark as Delivered"}
        </button>
      );

    /* -------------------------------------------------------------
     * 6) Delivered — next: sold (final)
     * ------------------------------------------------------------- */
    case "delivered":
      return (
        <button
          disabled={loading}
          onClick={() => doUpdate("sold")}
          className="w-full bg-green-600 text-white px-6 py-2 rounded font-medium"
        >
          {loading ? "Processing…" : "Mark as Completed / Sold"}
        </button>
      );

    /* -------------------------------------------------------------
     * 7) Sold — terminal
     * ------------------------------------------------------------- */
    case "sold":
      return (
        <p className="text-center text-gray-600 py-2">
          🎉 Order Completed.
        </p>
      );

    default:
      return null;
  }
}
