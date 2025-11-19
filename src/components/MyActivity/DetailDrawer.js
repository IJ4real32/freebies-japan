import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar, Truck, Package } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ActionButton from './ActionButton';
import DeliveryTimeline from './DeliveryTimeline';

const DetailDrawer = ({ 
  open, 
  onClose, 
  data, 
  currentUser, 
  loadingStates,
  onDelete,
  onSchedulePickup,
  onAcceptAward,
  onDeclineAward,
  onConfirmDelivery
}) => {
  const [imageIndex, setImageIndex] = useState(0);

  if (!open || !data) return null;

  const isDonor = data.donorId === currentUser?.uid;
  const isRequester = data.userId === currentUser?.uid;
  
  const isAwardedRequester = isRequester && data.status === 'awarded';
  const canAcceptAward = isAwardedRequester && !data.deliveryStatus;
  const canSchedulePickup = isDonor && data.deliveryStatus === 'accepted' && !data.pickupDate;
  const canConfirmDelivery = isRequester && data.deliveryStatus === 'delivery_processing';
  
  const canDelete = data.status === 'deleted' || 
                   (isRequester && ['expired', 'cancelled', 'rejected', 'awarded_to_other', 'delivered', 'completed'].includes(data.status)) ||
                   (isDonor && ['expired', 'cancelled', 'closed', 'delivered'].includes(data.status));

  const images = data.images || data.itemData?.images || [data.itemImage || '/images/default-item.jpg'];
  const title = data.title || data.itemData?.title || data.itemTitle || 'Untitled';
  const description = data.description || data.itemData?.description || 'No description available.';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end z-50 md:items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
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
                className="flex-shrink-0 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Image Carousel */}
            {images.length > 1 && (
              <div className="relative bg-gray-50 border-b border-gray-200">
                <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                  <img
                    src={images[imageIndex]}
                    alt={title}
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex((i) => (i - 1 + images.length) % images.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex((i) => (i + 1) % images.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Status Overview */}
              <div className="flex items-center justify-between mb-6">
                <StatusBadge 
                  status={data.status} 
                  deliveryStatus={data.deliveryStatus}
                  size="lg"
                />
              </div>

              {/* Delivery Timeline */}
              <DeliveryTimeline 
                status={data.status}
                deliveryStatus={data.deliveryStatus}
                pickupDate={data.pickupDate}
              />

              {/* Action Sections */}
              <div className="space-y-4">
                {/* Award Acceptance */}
                {canAcceptAward && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                    <h4 className="font-semibold text-yellow-800 text-lg mb-3">
                      Action Required - Accept Your Award!
                    </h4>
                    <p className="text-yellow-700 text-sm mb-4">
                      Congratulations! You've been awarded this item. Please accept delivery to proceed.
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

                {/* Pickup Scheduling */}
                {canSchedulePickup && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h4 className="font-semibold text-blue-800 text-lg mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Schedule Pickup
                    </h4>
                    <p className="text-blue-700 text-sm mb-4">
                      The recipient has accepted delivery. Please schedule a pickup date.
                    </p>
                    <ActionButton
                      variant="primary"
                      onClick={() => onSchedulePickup(data)}
                      loading={loadingStates.schedule === data.id}
                    >
                      Schedule Pickup
                    </ActionButton>
                  </div>
                )}

                {/* Delivery Confirmation */}
                {canConfirmDelivery && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <h4 className="font-semibold text-green-800 text-lg mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Confirm Delivery
                    </h4>
                    <p className="text-green-700 text-sm mb-4">
                      Your item is out for delivery. Please confirm when you receive it.
                    </p>
                    <ActionButton
                      variant="success"
                      onClick={() => onConfirmDelivery(data)}
                      loading={loadingStates.confirm === data.id}
                    >
                      Confirm Receipt
                    </ActionButton>
                  </div>
                )}

                {/* Delete Option */}
                {canDelete && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <h4 className="font-semibold text-red-800 text-lg mb-3">
                      Clean Up
                    </h4>
                    <p className="text-red-700 text-sm mb-4">
                      This item is no longer active. You can remove it from your list.
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