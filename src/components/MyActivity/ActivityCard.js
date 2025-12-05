// ✅ FILE: src/components/MyActivity/ActivityCard.js (PHASE-2 FINAL)
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trash, Loader2, Calendar, Check, X, Gift, AlertCircle 
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const ActivityCard = ({
  item,
  onView,
  onDelete,
  onSchedule,
  onAwardAction,     // accept/decline (requester)
  deleting,
  type = 'request',   // "request" | "donation"
  currentUser
}) => {

  /* -------------------------------------------------------
   * 1️⃣ Who is the user?
   * ----------------------------------------------------- */
  const isRequester = item.userId === currentUser?.uid;
  const isDonor = item.donorId === currentUser?.uid;

  /* -------------------------------------------------------
   * 2️⃣ Full Delivery Pipeline (Phase-2)
   * ----------------------------------------------------- */
  const DELIVERY_FLOW = [
    'accepted',
    'pickup_scheduled',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'completed'
  ];

  /* -------------------------------------------------------
   * 3️⃣ Delete Rules (Block active delivery)
   * ----------------------------------------------------- */
  const canDelete =
    item.status === 'deleted' ||
    (
      !DELIVERY_FLOW.includes(item.deliveryStatus) &&
      (
        (isRequester && ['expired','cancelled','rejected','awarded_to_other','completed','delivered'].includes(item.status)) ||
        (isDonor && ['expired','cancelled','closed','completed','delivered'].includes(item.status))
      )
    );

  /* -------------------------------------------------------
   * 4️⃣ Award Accept / Decline Visibility (Requests only)
   * ----------------------------------------------------- */
  const showAwardButtons =
    type === 'request' &&
    item.status === 'awarded' &&
    !item.deliveryStatus;    // delivery has not started yet

  /* -------------------------------------------------------
   * 5️⃣ Schedule Pickup Visibility (Donor side)
   * ----------------------------------------------------- */
  const canSchedule =
    type === 'donation' &&
    (item.deliveryStatus === 'accepted' || item.deliveryStatus === 'pickup_scheduled');

  /* -------------------------------------------------------
   * 6️⃣ Helpers
   * ----------------------------------------------------- */
  const getTitle = () => {
    if (type === 'request') {
      return item.itemData?.title || item.itemTitle || 'Unknown Item';
    }
    return item.title || 'Untitled Donation';
  };

  const getImage = () => {
    if (type === 'request') {
      return item.itemData?.images?.[0] || item.itemImages?.[0] || '/images/default-item.jpg';
    }
    return item.images?.[0] || '/images/default-item.jpg';
  };

  const safeDate = (ts) => {
    if (!ts) return '—';
    if (ts.toDate) {
      return ts.toDate().toLocaleDateString();
    }
    return new Date(ts).toLocaleDateString();
  };

  /* -------------------------------------------------------
   * 7️⃣ Click Logic
   * ----------------------------------------------------- */
  const handleCardClick = (e) => {
    if (e.target.closest('.action-button')) return;
    onView(item);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(item);
  };

  const handleScheduleClick = (e) => {
    e.stopPropagation();
    onSchedule(item);
  };

  const handleAccept = (e) => {
    e.stopPropagation();
    onAwardAction(item, 'accept');
  };

  const handleDecline = (e) => {
    e.stopPropagation();
    onAwardAction(item, 'decline');
  };

  /* -------------------------------------------------------
   * 8️⃣ Render
   * ----------------------------------------------------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer relative"
      onClick={handleCardClick}
    >

      {/* AWARDED BADGE (Requests) */}
      {item.status === 'awarded' && type === 'request' && (
        <div className="absolute top-3 left-3 z-10 bg-purple-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1">
          <Gift size={12} />
          AWARDED
        </div>
      )}

      {/* LEGACY BADGE */}
      {item.status === 'deleted' && (
        <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-bold flex items-center gap-1">
          <AlertCircle size={12} />
          LEGACY
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">

        {/* ACCEPT / DECLINE (Request side only) */}
        {showAwardButtons && (
          <>
            <button
              onClick={handleAccept}
              className="action-button bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-md hover:scale-110 transition"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleDecline}
              className="action-button bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md hover:scale-110 transition"
            >
              <X size={14} />
            </button>
          </>
        )}

        {/* SCHEDULE PICKUP (Donor only) */}
        {canSchedule && (
          <button
            onClick={handleScheduleClick}
            className="action-button bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-md hover:scale-110 transition"
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
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
          </button>
        )}
      </div>

      {/* IMAGE */}
      <div className="relative w-full h-48 bg-gray-100 rounded-t-xl overflow-hidden">
        <img
          src={getImage()}
          alt={getTitle()}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => (e.target.src = '/images/default-item.jpg')}
        />
      </div>

      {/* BODY */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{getTitle()}</h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description || item.itemData?.description || 'No description available.'}
        </p>

        <div className="flex items-center justify-between">
          <StatusBadge status={item.status} deliveryStatus={item.deliveryStatus} />

          <span className="text-xs text-gray-500">
            {safeDate(item.updatedAt)}
          </span>
        </div>

        {/* DELIVERY PROGRESS */}
        {DELIVERY_FLOW.includes(item.deliveryStatus) && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
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
                  : 'bg-green-600'
              }`} />
              <span className="text-gray-700 capitalize">
                {item.deliveryStatus.replace(/_/g, ' ')}
              </span>
            </div>

            {item.pickupDate && (
              <div className="mt-1 text-gray-500">
                <Calendar size={10} className="inline mr-1" />
                {safeDate(item.pickupDate)}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ActivityCard;
