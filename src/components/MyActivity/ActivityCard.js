import React from 'react';
import { motion } from 'framer-motion';
import { Trash, Loader2, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';

const ActivityCard = ({ 
  item, 
  onView, 
  onDelete, 
  onSchedule,
  deleting,
  type = 'request' 
}) => {
  const isDonor = item.donorId === item.currentUser?.uid;
  const isRequester = item.userId === item.currentUser?.uid;
  
  const canDelete = item.status === 'deleted' || 
                   (isRequester && ['expired', 'cancelled', 'rejected', 'awarded_to_other', 'delivered', 'completed'].includes(item.status)) ||
                   (isDonor && ['expired', 'cancelled', 'closed', 'delivered'].includes(item.status));

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <div className="relative">
        <img
          src={getImage()}
          alt={getTitle()}
          className="w-full h-48 object-cover rounded-t-xl"
          onError={(e) => {
            e.target.src = '/images/default-item.jpg';
          }}
        />
        
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {onSchedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(item);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-lg transition-colors"
              title="Schedule Pickup"
            >
              <Calendar size={14} />
            </button>
          )}
          
          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50"
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
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {getTitle()}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description || item.itemData?.description || 'No description available.'}
        </p>

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
      </div>
    </motion.div>
  );
};

export default ActivityCard;