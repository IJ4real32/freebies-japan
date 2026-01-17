// ===================================================================
// FILE: SellerConfirmHandoff.jsx
// PHASE-2 FINAL — FREE ITEM seller confirms item handoff to buyer
// ===================================================================

import React, { useState } from "react";
import { sellerConfirmDelivery } from "../../services/functionsApi";
import { PackageCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

export default function SellerConfirmHandoff({ delivery, onDone }) {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  if (!delivery || !currentUser) return null;

  /* --------------------------------------------------
   * HARD GUARDS — FREE ITEM CANONICAL
   * -------------------------------------------------- */

  // Seller only (AUTHORITATIVE)
  if (delivery.sellerId !== currentUser.uid) return null;

  // Only during transit phase
  if (delivery.deliveryStatus !== "in_transit") return null;

  // Already confirmed by seller
  if (delivery.sellerConfirmed === true) {
    return (
      <div className="text-sm text-green-700 flex items-center gap-2">
        <PackageCheck size={16} />
        You have confirmed the handoff
      </div>
    );
  }

  /* --------------------------------------------------
   * HANDLER
   * -------------------------------------------------- */
  const handleConfirm = async () => {
    if (!delivery.requestId) {
      toast.error("Delivery reference missing");
      return;
    }

    try {
      setLoading(true);

      await sellerConfirmDelivery({
        requestId: delivery.requestId,
      });

      toast.success("✅ Handoff confirmed. Waiting for buyer receipt.");
      onDone?.(delivery);
    } catch (err) {
      console.error("sellerConfirmDelivery error:", err);
      toast.error(
        err?.message || "Failed to confirm handoff. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */
  return (
    <div className="mt-4 p-4 border rounded-lg bg-blue-50">
      <p className="text-sm text-gray-800 mb-3">
        Please confirm once you have handed over the item to the buyer.
      </p>

      <button
        disabled={loading}
        onClick={handleConfirm}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PackageCheck className="w-4 h-4" />
        )}
        I handed over the item
      </button>
    </div>
  );
}
