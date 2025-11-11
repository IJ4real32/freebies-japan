// ✅ FILE: src/components/Logistics/DeliveryConfirmModal.jsx
import React, { useState } from "react";
import { X, Truck, AlertTriangle } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import toast from "react-hot-toast";

/**
 * DeliveryConfirmModal
 * ---------------------
 * Shown when a recipient is awarded an item and must confirm
 * delivery fee before shipment is triggered.
 */
export default function DeliveryConfirmModal({
  open,
  onClose,
  item,
  onConfirmed,
}) {
  const [loading, setLoading] = useState(false);
  if (!open || !item) return null;

  const estMin = item.estimatedDelivery?.min || 700;
  const estMax = item.estimatedDelivery?.max || 1200;
  const estimated = Math.round((estMin + estMax) / 2);

  const handleDecision = async (accepted) => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, "recipientConfirmDelivery");
      await fn({
        donationId: item.id,
        accepted,
        estimatedCost: estimated,
      });
      toast.success(
        accepted
          ? "Delivery confirmed. Courier will be scheduled soon!"
          : "Delivery declined."
      );
      onConfirmed?.(accepted);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update delivery status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full p-1.5 shadow transition"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <Truck className="text-indigo-600 w-10 h-10 mb-2" />
          <h2 className="text-lg font-semibold mb-2">
            Confirm Delivery for "{item.title}"
          </h2>
          <p className="text-sm text-gray-600 mb-3 leading-snug">
            Estimated delivery fee:
            <br />
            <span className="font-bold text-gray-900 text-base">
              ¥{estMin.toLocaleString()} – ¥{estMax.toLocaleString()}
            </span>
            <br />
            (charged to recipient on delivery)
          </p>

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-2 mb-4 text-xs flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>
              Please confirm within 24h. Declining will reopen the item to
              others.
            </span>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => handleDecision(true)}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium text-sm shadow"
            >
              {loading ? "Confirming..." : "Confirm Delivery"}
            </button>
            <button
              onClick={() => handleDecision(false)}
              disabled={loading}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg font-medium text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
