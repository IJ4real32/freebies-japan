import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
} from "lucide-react";

import StatusBadge from "./StatusBadge";
import ActionButton from "./ActionButton";
import DeliveryTimeline from "./DeliveryTimeline";

const DetailDrawer = ({
  open,
  onClose,
  data,
  currentUser,
  loadingStates,
  onDelete,
  onAcceptAward,
  onDeclineAward,
  onConfirmDelivery,
}) => {
  const [imageIndex, setImageIndex] = useState(0);

  if (!open || !data) return null;

  /* ------------------------------------------------------------------
   * USER-ONLY LOGIC (No donor/admin actions allowed)
   * ------------------------------------------------------------------ */

  const isRequester = data.userId === currentUser?.uid;

  // Award acceptance: awarded but NO deliveryStatus yet
  const isAwardedRequester =
    isRequester && data.status === "awarded" && !data.deliveryStatus;

  // User can confirm delivery ONLY when admin marks "out_for_delivery" 
  const canConfirmDelivery =
    isRequester && data.deliveryStatus === "out_for_delivery";

  // Deletable when item lifecycle is over or ended
  const canDelete =
    [
      "expired",
      "cancelled",
      "rejected",
      "awarded_to_other",
      "delivered",
      "completed",
      "deleted",
    ].includes(data.status) ||
    data.deliveryStatus === "delivered" ||
    data.deliveryStatus === "completed";

  /* ------------------------------------------------------------------
   * IMAGE / DISPLAY CONTENT
   * ------------------------------------------------------------------ */

  const images =
    data.images ||
    data.itemData?.images ||
    [data.itemImage || "/images/default-item.jpg"];

  const title =
    data.title || data.itemData?.title || data.itemTitle || "Untitled";

  const description =
    data.description ||
    data.itemData?.description ||
    "No description available.";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end md:items-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* ------------------------------------------------------------------
             * HEADER
             * ------------------------------------------------------------------ */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-16 h-16 rounded-xl bg-gray-100 overflow-hidden">
                  <img
                    src={images[imageIndex]}
                    alt={title}
                    className="object-cover w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-600 truncate">
                    {description}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* ------------------------------------------------------------------
             * IMAGE CAROUSEL
             * ------------------------------------------------------------------ */}
            {images.length > 1 && (
              <div className="relative border-b border-gray-200 bg-gray-50">
                <div className="relative h-48 flex items-center justify-center bg-gray-100">
                  <img
                    src={images[imageIndex]}
                    alt={title}
                    className="max-w-full max-h-full object-contain"
                  />

                  <button
                    onClick={() =>
                      setImageIndex((i) => (i - 1 + images.length) % images.length)
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    onClick={() =>
                      setImageIndex((i) => (i + 1) % images.length)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------
             * CONTENT (Status + Timeline + Actions)
             * ------------------------------------------------------------------ */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Status Badge */}
              <div className="mb-6">
                <StatusBadge
                  status={data.status}
                  deliveryStatus={data.deliveryStatus}
                  size="lg"
                />
              </div>

              {/* Delivery Progress Timeline */}
              <DeliveryTimeline
                status={data.deliveryStatus || data.status}
                deliveryStatus={data.deliveryStatus}
                pickupDate={data.pickupDate}
              />

              {/* ------------------------------------------------------------------
               * ACTION SECTIONS
               * ------------------------------------------------------------------ */}
              <div className="space-y-4">

                {/* User Accept/Decline Award */}
                {isAwardedRequester && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-yellow-800 mb-3">
                      Accept Your Award
                    </h4>
                    <p className="text-sm text-yellow-700 mb-4">
                      Congratulations! Please accept and provide delivery details.
                    </p>

                    <div className="flex gap-3">
                      <ActionButton
                        variant="success"
                        onClick={() => onAcceptAward(data)}
                        loading={loadingStates.accept === data.id}
                      >
                        Accept Delivery
                      </ActionButton>

                      <ActionButton
                        variant="outline"
                        onClick={() => onDeclineAward(data)}
                        loading={loadingStates.accept === data.id}
                      >
                        Decline Offer
                      </ActionButton>
                    </div>
                  </div>
                )}

                {/* Confirm Delivery (User only, last step) */}
                {canConfirmDelivery && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-green-800 mb-3">
                      <Package className="w-5 h-5" />
                      Confirm Delivery
                    </h4>

                    <p className="text-green-700 text-sm mb-4">
                      Your item has been marked as out for delivery.  
                      Please confirm once received.
                    </p>

                    <ActionButton
                      variant="success"
                      onClick={() => onConfirmDelivery(data)}
                      loading={loadingStates.confirm === data.id}
                    >
                      Confirm Received
                    </ActionButton>
                  </div>
                )}

                {/* Delete Request (when lifecycle is completed or invalid) */}
                {canDelete && (
                  <div className="bg-red-50 border border-red-200 p-5 rounded-xl">
                    <h4 className="text-lg font-semibold text-red-800 mb-3">
                      Remove Item
                    </h4>

                    <p className="text-red-700 text-sm mb-4">
                      This item is no longer active. You may remove it.
                    </p>

                    <ActionButton
                      variant="danger"
                      onClick={() => onDelete(data)}
                      loading={loadingStates.delete === data.id}
                    >
                      Remove from List
                    </ActionButton>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DetailDrawer;
