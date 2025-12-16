// ======================================================================
// FILE: DetailDrawerPremium.jsx
// PREMIUM ITEMS ONLY — Buyer & Seller DUAL Delivery Confirmations
// Mobile-first drawer — Option A architecture
// ======================================================================

import React from "react";
import {
  X,
  CreditCard,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
} from "lucide-react";

export default function DetailDrawerPremium({
  open,
  item,
  currentUser,
  onClose,

  // PREMIUM ACTIONS
  onCancelPurchase,      // buyer cancellation (before pickup)
  onBuyerConfirm,        // buyer delivery confirm
  onSellerConfirmDelivery, // seller delivery confirm (NEW for BACKLOG #3)
  onSchedulePickup,
  onDelete,
  showDeliveryDetails = false,
}) {
  if (!open || !item) return null;

  const donation = item.donation || {};
  const deliveryDetails = item.deliveryDetails || {};
  const images = donation.images || [];
  const mainImage = images[0] || "/images/default-item.jpg";

  const premiumStatus = item.premiumStatus || item.status;
  const deliveryStatus = deliveryDetails.deliveryStatus || item.deliveryStatus;

  // Determine viewer role
  const isBuyer = currentUser?.uid === item.userId;
  const isSeller = currentUser?.uid === donation.donorId;

  const hasDeliveryDetails = deliveryDetails && Object.keys(deliveryDetails).length > 0;

  /* ---------------------------------------------------
     PREMIUM FLOW LOGIC
     --------------------------------------------------- */

  // Buyer can cancel before pickup scheduling
  const canBuyerCancel = isBuyer && [
    "depositPaid",
    "preparingDelivery",
    "sellerScheduledPickup"
  ].includes(premiumStatus);

  // Buyer delivery confirmation allowed when delivered
  const canBuyerConfirmDelivery =
    isBuyer &&
    deliveryStatus === "delivered" &&
    !deliveryDetails.buyerConfirmedAt;

  // Seller delivery confirmation allowed when delivered
  const canSellerConfirmDelivery =
    isSeller &&
    deliveryStatus === "delivered" &&
    !deliveryDetails.sellerConfirmedAt;

  // Check if both have confirmed (for UI display)
  const bothConfirmed = 
    deliveryDetails.buyerConfirmedAt && 
    deliveryDetails.sellerConfirmedAt;

  // Check if delivery is completed
  const isDeliveryCompleted = deliveryStatus === "completed";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full sm:w-96 bg-white h-full overflow-y-auto rounded-l-xl shadow-xl p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Premium Item Details</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* IMAGE */}
        <div className="w-full h-56 rounded-lg overflow-hidden bg-gray-100 mb-4">
          <img
            src={mainImage}
            alt={donation.title}
            className="w-full h-full object-cover"
            onError={(e) => (e.target.src = "/images/default-item.jpg")}
          />
        </div>

        {/* TITLE */}
        <h3 className="text-xl font-semibold mb-1">{donation.title}</h3>
        <p className="text-gray-600 text-sm mb-4">
          {donation.description || "No description available"}
        </p>

        {/* PRICE */}
        <div className="bg-indigo-50 border-l-4 border-indigo-600 p-3 rounded mb-4">
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-indigo-700">Price</span>
            <span className="text-lg font-bold text-indigo-700">
              ¥{(donation.price || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-gray-50 border rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-500">Premium Status</p>
          <p className="font-semibold text-gray-900">{premiumStatus || "—"}</p>

          {hasDeliveryDetails && (
            <>
              <p className="text-xs text-gray-500 mt-2">Delivery Status</p>
              <p className="font-semibold text-gray-900">
                {deliveryStatus || "—"}
                {bothConfirmed && " ✅"}
              </p>

              {/* Confirmation Status */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Confirmations:</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <UserCheck size={12} className={deliveryDetails.buyerConfirmedAt ? "text-green-600" : "text-gray-400"} />
                    <span className="text-xs">Buyer</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck size={12} className={deliveryDetails.sellerConfirmedAt ? "text-green-600" : "text-gray-400"} />
                    <span className="text-xs">Seller</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================== */}
        {/*   DELIVERY COMPLETED VIEW (DUAL CONFIRMATION)              */}
        {/* ========================================================== */}
        {isDeliveryCompleted && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle size={16} />
              <span className="font-semibold">Delivery Completed</span>
            </div>
            <p className="text-green-600 text-sm">
              Both buyer and seller have confirmed delivery.
            </p>
          </div>
        )}

        {/* ========================================================== */}
        {/*   BUYER ACTION — CANCEL PURCHASE (ONLY BEFORE PICKUP)      */}
        {/* ========================================================== */}
        {canBuyerCancel && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
              <XCircle size={16} /> Cancel Purchase
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              You may cancel before the seller hands over the item for delivery.
            </p>

            <button
              onClick={() => onCancelPurchase?.(item)}
              className="w-full bg-red-600 text-white py-3 rounded-lg shadow hover:bg-red-700"
            >
              Cancel Purchase
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/*   BUYER CONFIRM DELIVERY                                   */}
        {/* ========================================================== */}
        {canBuyerConfirmDelivery && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Package size={16} className="text-indigo-600" />
              Confirm Delivery Received
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              Confirm that you have received the item.
            </p>

            <button
              onClick={() => onBuyerConfirm?.(item)}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm Delivery (Buyer)
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/*   SELLER CONFIRM DELIVERY (BACKLOG #3)                     */
        /* ========================================================== */}
        {canSellerConfirmDelivery && !bothConfirmed && 
 (
          <div className="mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Truck size={16} className="text-green-600" />
              Confirm Delivery Completed
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              Confirm that you have successfully delivered the item.
            </p>

            <button
              onClick={() => onSellerConfirmDelivery?.(item.deliveryId || deliveryDetails.id)
}
              className="w-full py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm Delivery (Seller)
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/*   SCHEDULE PICKUP (SELLER ONLY)                            */
        /* ========================================================== */}
        {isSeller && !isDeliveryCompleted && onSchedulePickup && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Truck size={16} className="text-blue-600" />
              Schedule Pickup
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              Schedule a pickup for this item.
            </p>

            <button
              onClick={() => onSchedulePickup(item)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Clock size={18} />
              Schedule Pickup
            </button>
          </div>
        )}

        {/* ========================================================== */}
        /*   DELIVERY DETAILS (if available and showDeliveryDetails)  */
        /* ========================================================== */
        {showDeliveryDetails && hasDeliveryDetails && deliveryDetails.addressInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold mb-2 text-blue-700">Delivery Address</h4>
            <div className="space-y-1">
              {deliveryDetails.addressInfo.address && (
                <p className="text-sm text-gray-700">{deliveryDetails.addressInfo.address}</p>
              )}
              {deliveryDetails.addressInfo.phone && (
                <p className="text-sm text-gray-700">{deliveryDetails.addressInfo.phone}</p>
              )}
              {deliveryDetails.addressInfo.instructions && (
                <p className="text-sm text-gray-500">{deliveryDetails.addressInfo.instructions}</p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        /*   SELLER READ-ONLY VIEW (when no actions)                  */
        /* ========================================================== */
        {isSeller && !canSellerConfirmDelivery && !onSchedulePickup && !bothConfirmed && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Clock size={16} className="text-gray-600" />
              Seller Summary
            </h4>
            <p className="text-gray-600 text-sm">
              {deliveryStatus === "delivered" 
                ? "Waiting for buyer to confirm delivery."
                : "Delivery is not yet marked as delivered."}
            </p>
          </div>
        )}

        {/* DELETE OPTION */}
        <button
          onClick={() => onDelete?.(item)}
          className="w-full py-3 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 mt-4"
        >
          Delete Entry
        </button>

        <div className="h-20" />
      </div>
    </div>
  );
}