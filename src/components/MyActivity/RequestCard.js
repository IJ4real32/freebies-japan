import React from 'react';
import { motion } from 'framer-motion';
import { Trash, Loader2, Calendar, Award, AlertCircle, Gift, Check, X } from 'lucide-react';
import StatusBadge from './StatusBadge';

const RequestCard = ({ item, onView, onDelete, onAwardAction, deleting }) => {
  // Enhanced status detection
  const isAwarded = item.status === 'awarded' && !item.deliveryStatus;
  const canDelete = ['pending', 'approved'].includes(item.status) || 
                   item.status === 'deleted' || 
                   ['expired', 'cancelled', 'rejected', 'awarded_to_other', 'delivered', 'completed'].includes(item.status);

  // Show award action buttons when item is awarded but not yet accepted/declined
  const showAwardAction = item.status === 'awarded' && !item.deliveryStatus;

  const getTitle = () => {
    return item.itemData?.title || item.itemTitle || 'Unknown Item';
  };

  const getImage = () => {
    return item.itemData?.images?.[0] || item.itemImages?.[0] || '/images/default-item.jpg';
  };

  const handleCardClick = (e) => {
    // If clicking action buttons, don't trigger view
    if (e.target.closest('.action-button')) {
      return;
    }
    onView();
  };

  const handleAcceptAward = (e) => {
    e.stopPropagation();
    onAwardAction(item, 'accept');
  };

  const handleDeclineAward = (e) => {
    e.stopPropagation();
    onAwardAction(item, 'decline');
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
      onClick={handleCardClick}
    >
      {/* Award Badge */}
      {isAwarded && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1 animate-pulse">
            <Award size={12} />
            AWARDED!
          </div>
        </div>
      )}

      {/* Legacy Item Badge */}
      {item.status === 'deleted' && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
            <AlertCircle size={12} />
            LEGACY
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {/* Award Action Buttons */}
        {showAwardAction && (
          <div className="flex gap-1 action-button">
            <button
              onClick={handleAcceptAward}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
              title="Accept Award"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleDeclineAward}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
              title="Decline Award"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="action-button bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 transform hover:scale-110"
            title="Delete"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash size={14} />
            )}
          </button>
        )}
      </div>

      {/* Item Image */}
      <div className="relative w-full h-48 rounded-t-xl overflow-hidden bg-gray-100">
        <img
          src={getImage()}
          alt={getTitle()}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = '/images/default-item.jpg';
          }}
        />
        
        {/* Delivery Estimate Overlay */}
        {item.itemData?.estimatedDelivery && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            ¥{item.itemData.estimatedDelivery.min?.toLocaleString()}–¥{item.itemData.estimatedDelivery.max?.toLocaleString()}
          </div>
        )}
        
        {/* Size Badge */}
        {item.itemData?.size && (
          <div className="absolute bottom-2 right-2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded font-medium">
            {item.itemData.size}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {getTitle()}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.itemData?.description || 'No description available.'}
        </p>

        {/* Status and Date Row */}
        <div className="flex items-center justify-between">
          <StatusBadge 
            status={item.status} 
            deliveryStatus={item.deliveryStatus}
          />
          
          <span className="text-xs text-gray-500">
            {item.updatedAt?.toDate?.().toLocaleDateString() || 
             new Date(item.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Award Action Section - Enhanced for better UX */}
        {showAwardAction && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-purple-600 font-medium text-center">
                You've been awarded this item!
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleAcceptAward}
                  className="action-button bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1"
                >
                  <Check size={12} />
                  Accept
                </button>
                <button
                  onClick={handleDeclineAward}
                  className="action-button bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1"
                >
                  <X size={12} />
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Status Progress (if in delivery process) */}
        {(item.deliveryStatus === 'accepted' || item.deliveryStatus === 'pickup_scheduled' || item.deliveryStatus === 'delivered') && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  item.deliveryStatus === 'accepted' 
                    ? 'bg-blue-500' 
                    : item.deliveryStatus === 'pickup_scheduled'
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }`} />
                <span className={
                  item.deliveryStatus === 'accepted' 
                    ? 'text-blue-600' 
                    : item.deliveryStatus === 'pickup_scheduled'
                    ? 'text-orange-600'
                    : 'text-green-600'
                }>
                  {item.deliveryStatus === 'accepted' 
                    ? 'Delivery Accepted' 
                    : item.deliveryStatus === 'pickup_scheduled'
                    ? 'Pickup Scheduled'
                    : 'Delivered'}
                </span>
              </div>
            </div>
            
            {/* Show delivery details if available */}
            {item.deliveryAddress && (
              <div className="mt-1 text-xs text-gray-500 truncate">
                📍 {item.deliveryAddress}
              </div>
            )}
            
            {/* Show pickup date if scheduled */}
            {item.pickupDate && (
              <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={10} />
                {new Date(item.pickupDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RequestCard;