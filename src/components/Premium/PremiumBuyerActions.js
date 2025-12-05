import React, { useState } from "react";
import toast from "react-hot-toast";
import ItemDepositButton from "../Payments/ItemDepositButton";
import DeliveryForm from "../DeliveryForm"; 
import { X } from "lucide-react";

export default function PremiumBuyerActions({ item, updateFn, refresh }) {
  const [loading, setLoading] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  /* ---------------------------------------------
   * Unified update handler (FIXED)
   * --------------------------------------------- */
  const doUpdate = async (nextStatus, deliveryInfo = null) => {
    try {
      setLoading(true);

      await updateFn({
        itemId: item.id,
        status: nextStatus,       // ✅ MUST be status not nextStatus
        deliveryInfo,
      });

      toast.success("Updated successfully!");
      refresh();
      setShowDeliveryModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------
   * Render buttons based on premiumStatus
   * --------------------------------------------- */
  switch (item.premiumStatus) {
    /* -------------------------------------------------------
     * 1) AVAILABLE — Buyer must pay deposit
     * ------------------------------------------------------- */
    case "available":
      return (
        <ItemDepositButton
          itemId={item.id}
          title={item.title}
          amountJPY={item.price || item.priceJPY}
        />
      );

    /* -------------------------------------------------------
     * 2) DEPOSIT PAID — Buyer accepts or declines
     * ------------------------------------------------------- */
    case "depositPaid":
      return (
        <div className="space-y-3">

          <button
            onClick={() => setShowDeliveryModal(true)}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-6 py-2 rounded font-medium"
          >
            Provide Delivery Info & Accept
          </button>

          <button
            onClick={() => doUpdate("buyerDeclined")}
            disabled={loading}
            className="w-full bg-gray-300 text-gray-700 px-6 py-2 rounded font-medium"
          >
            Decline Delivery
          </button>

          {/* Delivery Info Modal */}
          {showDeliveryModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-5 relative">

                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>

                <h2 className="text-lg font-semibold mb-3">
                  Enter Delivery Information
                </h2>

                <DeliveryForm
                  request={{ id: item.id }}
                  existingData={item.deliveryInfo || {}}
                  onSubmit={(deliveryInfo) =>
                    doUpdate("buyerAccepted", deliveryInfo)
                  }
                  onCancel={() => setShowDeliveryModal(false)}
                />
              </div>
            </div>
          )}
        </div>
      );

    /* -------------------------------------------------------
     * 3) PREPARING DELIVERY — Seller is packing the item
     * ------------------------------------------------------- */
    case "preparingDelivery":
      return (
        <p className="text-center text-gray-600 py-2">
          Seller is preparing your shipment…
        </p>
      );

    /* -------------------------------------------------------
     * 4) IN TRANSIT — Buyer confirms final delivery
     * ------------------------------------------------------- */
    case "inTransit":
      return (
        <button
          disabled={loading}
          onClick={() => doUpdate("delivered")}
          className="w-full bg-green-600 text-white px-6 py-2 rounded font-medium"
        >
          {loading ? "Processing…" : "Confirm Delivery Received"}
        </button>
      );

    /* -------------------------------------------------------
     * 5) DELIVERED — Buyer completes transaction
     * ------------------------------------------------------- */
    case "delivered":
      return (
        <button
          disabled={loading}
          onClick={() => doUpdate("sold")}
          className="w-full bg-indigo-600 text-white px-6 py-2 rounded font-medium"
        >
          {loading ? "Processing…" : "Mark as Completed"}
        </button>
      );

    /* -------------------------------------------------------
     * 6) SOLD — Final state
     * ------------------------------------------------------- */
    case "sold":
      return (
        <p className="text-center text-gray-600">
          🎉 This order has been completed.
        </p>
      );

    default:
      return null;
  }
}
