// ✅ FILE: src/components/MyActivity/DonationCard.js (PHASE-2 FINAL)
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trash, Loader2, Calendar, Users, AlertCircle, 
  Crown, Truck, Package, CheckCircle 
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const DonationCard = ({ item, onView, onSchedule, onDelete, deleting }) => {

  /* -----------------------------------------------------------
   * 1️⃣  DELIVERY PIPELINE (FULL PHASE-2)
   * ----------------------------------------------------------- */
  const DELIVERY_FLOW = [
    'accepted',
    'pickup_scheduled',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'completed'
  ];

  /* -----------------------------------------------------------
   * 2️⃣  CAN SCHEDULE PICKUP (ADMIN)
   * ----------------------------------------------------------- */
  const canSchedule =
    item.deliveryStatus === 'accepted' ||
    item.deliveryStatus === 'pickup_scheduled';

  /* -----------------------------------------------------------
   * 3️⃣  DELETE RULES (BLOCK ACTIVE DELIVERY)
   * ----------------------------------------------------------- */
  const canDelete =
    !DELIVERY_FLOW.includes(item.deliveryStatus) &&
    item.status !== 'active'; // admins can't delete "active" donations

  /* -----------------------------------------------------------
   * 4️⃣  SPONSORED / PREMIUM IDENTIFICATION
   * ----------------------------------------------------------- */
  const isSponsored = item.sponsoredBy === 'admin' || item.isSponsored;
  const isPremium = item.type === 'premium';

  /* -----------------------------------------------------------
   * Click Logic
   * ----------------------------------------------------------- */
  const handleCardClick = (e) => {
    if (e.target.closest('.action-button')) return;
    onView(item);
  };

  const handleScheduleClick = (e) => {
    e.stopPropagation();
    onSchedule(item);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(item);
  };

  /* -----------------------------------------------------------
   * Render
   * ----------------------------------------------------------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative ${
        isSponsored ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
      }`}
      onClick={handleCardClick}
    >

      {/* SPONSORED BADGE */}
      {isSponsored && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1">
            <Crown size={12} />
            SPONSORED
          </div>
        </div>
      )}

      {/* LEGACY BADGE */}
      {item.status === 'deleted' && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1">
            <AlertCircle size={12} />
            LEGACY
          </div>
        </div>
      )}

      {/* PREMIUM BADGE */}
      {isPremium && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-md">
            PREMIUM
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="absolute top-14 right-3 z-10 flex gap-2">

        {/* SCHEDULE PICKUP */}
        {canSchedule && (
          <button
            onClick={handleScheduleClick}
            className="action-button bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 rounded-full shadow-md hover:scale-110 transition"
            title="Schedule Pickup"
          >
            <Calendar size={14} />
          </button>
        )}

        {/* DELETE */}
        {canDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="action-button bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md transition disabled:opacity-50 hover:scale-110"
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

      {/* IMAGE */}
      <div className="relative w-full h-48 rounded-t-xl overflow-hidden bg-gray-100">
        <img
          src={item.images?.[0] || '/images/default-item.jpg'}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>

      {/* BODY */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {item.title}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description || 'No description available.'}
        </p>

        {/* Price (premium only) */}
        {isPremium && (
          <div className="text-indigo-600 font-bold text-lg mb-2">
            ¥{item.price?.toLocaleString()}
          </div>
        )}

        {/* SPONSORED LABEL */}
        {isSponsored && (
          <div className="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-900 font-medium">
              🎉 Sponsored by Freebies Japan
            </p>
          </div>
        )}

        {/* STATUS + DATE */}
        <div className="flex justify-between items-center">
          <StatusBadge status={item.status} deliveryStatus={item.deliveryStatus} />

          <span className="text-xs text-gray-500">
            {item.updatedAt?.toDate
              ? item.updatedAt.toDate().toLocaleDateString()
              : item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString()
              : '—'}
          </span>
        </div>

        {/* DELIVERY PROGRESS */}
        {DELIVERY_FLOW.includes(item.deliveryStatus) && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs">

            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                item.deliveryStatus === 'accepted'
                  ? 'bg-blue-500'
                  : item.deliveryStatus === 'pickup_scheduled'
                  ? 'bg-orange-500'
                  : item.deliveryStatus === 'in_transit'
                  ? 'bg-purple-500'
                  : item.deliveryStatus === 'out_for_delivery'
                  ? 'bg-yellow-500'
                  : item.deliveryStatus === 'delivered'
                  ? 'bg-green-600'
                  : 'bg-green-800'
              }`} />

              <span>
                {item.deliveryStatus === 'accepted'
                  ? 'Delivery Accepted'
                  : item.deliveryStatus === 'pickup_scheduled'
                  ? 'Pickup Scheduled'
                  : item.deliveryStatus === 'in_transit'
                  ? 'In Transit'
                  : item.deliveryStatus === 'out_for_delivery'
                  ? 'Out for Delivery'
                  : item.deliveryStatus === 'delivered'
                  ? 'Delivered'
                  : 'Completed'}
              </span>
            </div>

            {item.pickupDate && (
              <div className="mt-1 flex gap-1 text-gray-500">
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

export default DonationCard;
