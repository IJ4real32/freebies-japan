// ✅ FILE: src/components/MyActivity/ConfirmDeleteModal.jsx (PHASE-2 FINAL)
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash, X, ShieldAlert } from 'lucide-react';
import ActionButton from './ActionButton';

const ConfirmDeleteModal = ({ 
  open, 
  onClose, 
  item, 
  itemType,       // ⭐ REQUIRED FOR PHASE-2 DELETE LOGIC
  onConfirm, 
  loading 
}) => {
  if (!open || !item) return null;

  /* ------------------------------------------------------------
   * 🧠 PHASE-2 DELETE VALIDATION LOGIC
   * ------------------------------------------------------------ */

  // Premium purchases CANNOT be deleted
  const isPremiumPurchase =
    itemType === "purchase" &&
    item?.isPremium &&
    item?.buyerId;

  // Free requests inside delivery pipeline CANNOT be deleted
  const requestFrozenStatuses = [
    "accepted",
    "pickup_scheduled",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "completed"
  ];

  const isFrozenRequest =
    itemType === "request" &&
    requestFrozenStatuses.includes(item?.deliveryStatus);

  const isLegacy =
    !item?.title && !item?.itemData?.title && !item?.category;

  /* ------------------------------------------------------------
   * 📄 MESSAGE BUILDER
   * ------------------------------------------------------------ */
  const getMessage = () => {

    if (isPremiumPurchase) {
      return "Premium purchases cannot be deleted. They remain as part of your transaction history.";
    }

    if (isFrozenRequest) {
      return "This request is already in the delivery pipeline and cannot be deleted.";
    }

    if (isLegacy) {
      return "This record has incomplete or legacy data. You may safely remove it from your activity list.";
    }

    switch (itemType) {
      case "request":
        return "Are you sure you want to delete this request? This action cannot be undone.";

      case "listing":
        return "Are you sure you want to delete this listing? Once removed, it cannot be recovered.";

      case "deposit":
        if (item.status !== "pending") {
          return "Only pending deposits can be deleted. This deposit record cannot be removed.";
        }
        return "Delete this pending deposit request?";

      case "purchase":
        return "Are you sure you want to remove this purchase record from your view?";

      default:
        return "Are you sure you want to remove this item?";
    }
  };

  const showDangerButton =
    !isPremiumPurchase && !isFrozenRequest;

  /* ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------ */
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-4"
          onClick={!loading ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative"
          >
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {isPremiumPurchase || isFrozenRequest ? (
                <ShieldAlert className="w-8 h-8 text-red-600" />
              ) : (
                <Trash className="w-8 h-8 text-red-600" />
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isPremiumPurchase || isFrozenRequest ? "Action Restricted" : "Confirm Removal"}
            </h3>

            <p className="text-gray-600 text-sm mb-6">
              {getMessage()}
            </p>

            {/* --------------------------------------------------------
             * BUTTONS
             * ------------------------------------------------------ */}
            <div className="flex gap-3">

              {showDangerButton ? (
                <ActionButton
                  onClick={onConfirm}
                  loading={loading}
                  variant="danger"
                  icon={Trash}
                  fullWidth
                >
                  {loading ? "Removing..." : "Yes, Remove"}
                </ActionButton>
              ) : (
                <ActionButton
                  disabled
                  variant="outline"
                  fullWidth
                >
                  Not Allowed
                </ActionButton>
              )}

              <ActionButton
                onClick={onClose}
                disabled={loading}
                variant="outline"
                fullWidth
              >
                Cancel
              </ActionButton>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDeleteModal;
