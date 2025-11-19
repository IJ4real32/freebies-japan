// ✅ FILE: src/components/MyActivity/DonationCard.js (PATCHED - Admin Sponsored + Delivery Flow)
import React from 'react';
import { motion } from 'framer-motion';
import { Trash, Loader2, Calendar, Users, AlertCircle, Crown, Truck } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DonationCard = ({ item, onView, onSchedule, onDelete, deleting }) => {
  // Enhanced scheduling logic for admin delivery flow
  const canSchedule = (item.deliveryStatus === 'accepted' && !item.pickupDate) || 
                     (item.status === 'awarded' && item.deliveryStatus === 'accepted');
  
  const canDelete = item.status === 'deleted' || 
                   ['expired', 'cancelled', 'closed', 'delivered', 'completed'].includes(item.status);

  // Check if this is an admin-sponsored item
  const isSponsored = item.sponsoredBy === 'admin' || item.isSponsored;
  
  // Delivery estimate display
  const deliveryEstimate = item.estimatedDelivery;
  const itemSize = item.size;

  const handleCardClick = (e) => {
    // Don't trigger view if clicking action buttons
    if (e.target.closest('.action-button')) {
      return;
    }
    onView();
  };

  const handleSchedule = (e) => {
    e.stopPropagation();
    onSchedule(item);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative ${
        isSponsored 
          ? 'border-purple-200 bg-gradient-to-br from-white to-purple-50' 
          : 'border-gray-200'
      }`}
      onClick={handleCardClick}
    >
      {/* Admin Sponsored Badge */}
      {isSponsored && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
            <Crown size={12} />
            SPONSORED
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

      {/* Delivery Status Badge */}
      {item.deliveryStatus === 'pickup_scheduled' && (
        <div className="absolute top-12 left-3 z-10">
          <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
            <Truck size={10} />
            PICKUP SCHEDULED
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {/* Schedule Pickup Button - Enhanced visibility */}
        {canSchedule && (
          <button
            onClick={handleSchedule}
            className="action-button bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            title="Schedule Pickup"
          >
            <Calendar size={14} />
          </button>
        )}
        
        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="action-button bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50"
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
          src={item.images?.[0] || '/images/default-item.jpg'}
          alt={item.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = '/images/default-item.jpg';
          }}
        />
        
        {/* Request Count */}
        {item.requestCount > 0 && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Users size={10} />
            {item.requestCount}
          </div>
        )}
        
        {/* Delivery Estimate Overlay */}
        {deliveryEstimate && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            ¥{deliveryEstimate.min?.toLocaleString()}–¥{deliveryEstimate.max?.toLocaleString()}
          </div>
        )}
        
        {/* Size Badge */}
        {itemSize && (
          <div className="absolute bottom-2 right-2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded font-medium">
            {itemSize}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {item.title || 'Untitled Donation'}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description || 'No description available.'}
        </p>

        {/* Admin Sponsor Attribution */}
        {isSponsored && (
          <div className="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-800 font-medium">
              🎉 Sponsored by Freebies Japan
            </p>
          </div>
        )}

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

        {/* Delivery Progress Indicator */}
        {(item.deliveryStatus === 'accepted' || item.deliveryStatus === 'pickup_scheduled') && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  item.deliveryStatus === 'accepted' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                <span className="text-gray-700">
                  {item.deliveryStatus === 'accepted' 
                    ? 'Delivery Accepted - Awaiting Pickup' 
                    : `Pickup: ${item.pickupDate?.toDate?.().toLocaleDateString() || 'Scheduled'}`}
                </span>
              </div>
              
              {item.deliveryStatus === 'accepted' && (
                <button
                  onClick={handleSchedule}
                  className="action-button text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  Schedule
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DonationCard;