import React from 'react';
import { 
  Clock, UserCheck, XCircle, Award, Users, 
  CheckCircle, Calendar, Truck, Package, Star 
} from 'lucide-react';

const StatusBadge = ({ status, deliveryStatus, size = 'sm' }) => {
  const statusConfig = {
    // Request Statuses
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' },
    approved: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: UserCheck, label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Rejected' },
    cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: 'Cancelled' },
    
    // Award Statuses  
    awarded: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Award, label: 'Awarded!' },
    awarded_to_other: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: Users, label: 'Awarded to Another' },
    
    // Delivery Statuses
    accepted: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Accepted' },
    declined: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Declined' },
    pickup_scheduled: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Calendar, label: 'Pickup Scheduled' },
    delivery_processing: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck, label: 'In Transit' },
    delivered: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Package, label: 'Delivered' },
    completed: { color: 'bg-teal-100 text-teal-800 border-teal-200', icon: CheckCircle, label: 'Completed' },
    
    // Donation Statuses
    active: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Star, label: 'Active' },
    expired: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: Clock, label: 'Expired' },
    closed: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: XCircle, label: 'Closed' },
    
    // Deposit Statuses
    verified: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Verified' },
    processing: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Processing' }
  };

  const currentStatus = deliveryStatus || status;
  const config = statusConfig[currentStatus] || statusConfig.pending;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm', 
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border ${sizeClasses[size]} font-medium ${config.color}`}>
      <IconComponent size={size === 'lg' ? 16 : 12} />
      <span>{config.label}</span>
    </div>
  );
};

export default StatusBadge;