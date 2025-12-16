// ======================================================================
// FILE: DetailDrawerFree.jsx
// FREE ITEMS ONLY — Buyer Award Actions + DUAL Delivery Confirmation
// Mobile-first drawer (Option A rules)
// ======================================================================

import React from "react";
import {
  X,
  Award,
  Check,
  XCircle,
  Package,
  Clock,
  CheckCircle,
  Truck,
  UserCheck,
} from "lucide-react";

export default function DetailDrawerFree({
  open,
  item,
  currentUser,
  onClose,

  // Award actions
  onAcceptAward,
  onDeclineAward,

  // Delivery confirmations
  onBuyerConfirm,
  onSellerConfirmDelivery,
  
  // Delete if needed
  onDelete,
}) {
  if (!open || !item) return null;

  const donation = item.donation || {};
  const deliveryDetails = item.deliveryDetails || {};
  const images = donation.images || [];
  const mainImage = images[0] || "/images/default-item.jpg";

  // Determine viewer role
  const isBuyer = currentUser?.uid === item.userId;
  const isSeller = currentUser?.uid === donation.donorId;

  const awardStage = item.status === "awarded";
  const deliveryStatus = deliveryDetails.deliveryStatus || item.deliveryStatus;
  
  const hasDeliveryDetails = deliveryDetails && Object.keys(deliveryDetails).length > 0;

  // Buyer can confirm delivery when status is "delivered" and not already confirmed
  const canBuyerConfirmDelivery =
    isBuyer &&
    deliveryStatus === "delivered" &&
    !deliveryDetails.buyerConfirmedAt;

  // Seller can confirm delivery when status is "delivered" and not already confirmed
  const canSellerConfirmDelivery =
    isSeller &&
    deliveryStatus === "delivered" &&
    !deliveryDetails.sellerConfirmedAt;

  // Check if both have confirmed (for UI display)
  const bothConfirmed = 
    deliveryDetails.buyerConfirmedAt && 
    deliveryDetails.sellerConfirmedAt;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full sm:w-96 bg-white h-full overflow-y-auto rounded-l-xl shadow-xl p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Free Item Details</h2>
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

        {/* STATUS BLOCK */}
        <div className="bg-gray-50 border rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500">Request Status</p>
          <p className="font-semibold text-gray-900">{item.status || "—"}</p>

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

        {/* =============================================== */}
        {/*         AWARD ACTIONS (BUYER ONLY)               */}
        {/* =============================================== */}
        {awardStage && isBuyer && (
          <div className="mb-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Award size={16} className="text-purple-600" />
              Congratulations — You Were Awarded!
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              Accept or decline your free item.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => onAcceptAward(item)}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Accept
              </button>

              <button
                onClick={() => onDeclineAward(item)}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <XCircle size={16} /> Decline
              </button>
            </div>
          </div>
        )}

        {/* =============================================== */}
        {/*         BUYER DELIVERY CONFIRMATION             */}
        {/* =============================================== */}
        {canBuyerConfirmDelivery && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Package size={16} className="text-indigo-600" />
              Confirm Delivery Received
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              Confirm that you have received the item.
            </p>

            <button
              onClick={() => onBuyerConfirm(item)}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm Delivery (Buyer)
            </button>
          </div>
        )}

        {/* =============================================== */}
        {/*         SELLER DELIVERY CONFIRMATION            */}
        {/* =============================================== */}
        {canSellerConfirmDelivery && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Truck size={16} className="text-green-600" />
              Confirm Delivery Completed
            </h4>

            <p className="text-gray-600 text-sm mb-3">
              Confirm that you have successfully delivered the item.
            </p>

            <button
              onClick={() => onSellerConfirmDelivery(item.deliveryId || deliveryDetails.id)}

              className="w-full py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm Delivery (Seller)
            </button>
          </div>
        )}

        {/* =============================================== */}
        {/*         DELIVERY COMPLETED VIEW                 */
        /* =============================================== */}
        {bothConfirmed && deliveryStatus === "completed" && (
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

        {/* =============================================== */}
        {/*         SELLER READ-ONLY VIEW (when no actions) */
        /* =============================================== */}
        {isSeller && !canSellerConfirmDelivery && !bothConfirmed && (
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

        {/* =============================================== */}
        {/*         DELIVERY DETAILS (if available)         */
        /* =============================================== */}
        {hasDeliveryDetails && deliveryDetails.addressInfo && (
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

        {/* DELETE BUTTON */}
        <button
          onClick={() => onDelete(item)}
          className="w-full py-3 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 mt-4"
        >
          Delete Request
        </button>

        <div className="h-20" /> {/* Bottom padding */}
      </div>
    </div>
  );
}