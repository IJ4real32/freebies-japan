// ========================================================================
// FILE: src/components/MyActivity/RecipientConfirmDelivery.jsx
// PHASE-2 FINAL — Buyer confirms item receipt (FREE ITEMS)
// ========================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { CheckCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const RecipientConfirmDelivery = ({ delivery, currentUserId, onDone }) => {
  const [loading, setLoading] = useState(false);

  if (!delivery) return null;

  // --------------------------------------------------
  // HARD GUARDS — PHASE-2 CANONICAL
  // --------------------------------------------------

  // Buyer only
  if (delivery.buyerId !== currentUserId) return null;

  // Only during transit
  if (delivery.deliveryStatus !== "in_transit") return null;

  // Already confirmed
  if (delivery.buyerConfirmed === true) return null;

  const handleConfirm = async () => {
    if (!delivery.requestId) {
      toast.error("Invalid delivery reference");
      return;
    }

    setLoading(true);

    try {
      const confirmFn = httpsCallable(
        functions,
        "recipientConfirmDelivery"
      );

      await confirmFn({
        requestId: delivery.requestId,
      });

      toast.success("✅ Item marked as received");

      onDone?.(delivery);
    } catch (err) {
      console.error("recipientConfirmDelivery error:", err);
      toast.error(
        err?.message || "Failed to confirm item receipt"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-green-50">
      <p className="text-sm text-green-800 mb-3">
        Please confirm once you have received this item from the seller.
      </p>

      <button
        disabled={loading}
        onClick={handleConfirm}
        className="w-full py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        I have received the item
      </button>
    </div>
  );
};

export default RecipientConfirmDelivery;
