// ✅ FILE: src/components/MyActivity/DepositCard.js (PHASE-2 — FIXED DELETE LOGIC)

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trash, Loader2, CreditCard, Calendar, 
  CheckCircle, Clock, XCircle 
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const DepositCard = ({ item, onDelete, deleting }) => {

  // ✅ NEW RULE: Allow soft delete for ALL non-pending statuses
  const canDelete = item.status !== "pending";

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!canDelete || deleting) return;
    onDelete(item);
  };

  const formatAmount = (amount) =>
    `¥${Number(amount).toLocaleString()}`;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-blue-600" />;
    }
  };

  const createdDate =
    item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString()
      : new Date(item.createdAt).toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-4"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 block">Deposit</span>
            <span className="text-sm text-gray-500">Payment Record</span>
          </div>
        </div>

        {/* DELETE BUTTON */}
        <button
          onClick={handleDelete}
          disabled={!canDelete || deleting}
          className={`
            p-2 rounded-full transition-all duration-200
            ${canDelete
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"}
            disabled:opacity-50 transform hover:scale-110 active:scale-95
          `}
          title={
            canDelete
              ? "Delete this deposit record"
              : "Cannot delete pending deposits"
          }
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash size={16} />
          )}
        </button>
      </div>

      {/* AMOUNT PANEL */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Amount:</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatAmount(item.amount)}
            </p>
            {item.fee && (
              <p className="text-xs text-gray-500 mt-1">
                Fee: ¥{Number(item.fee).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* STATUS / DATE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(item.status)}
            <StatusBadge status={item.status} size="sm" />
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{createdDate}</span>
          </div>
        </div>

        {/* METADATA */}
        {(item.transactionId || item.paymentMethod) && (
          <div className="pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {item.transactionId && (
                <div>
                  <span className="text-gray-500">Transaction ID:</span>
                  <p className="text-gray-700 font-medium truncate">
                    {item.transactionId}
                  </p>
                </div>
              )}
              {item.paymentMethod && (
                <div>
                  <span className="text-gray-500">Method:</span>
                  <p className="text-gray-700 font-medium">
                    {item.paymentMethod}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATUS NOTES */}
        {item.status === "processing" && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              ⏳ Processing — usually completes within 24 hours
            </p>
          </div>
        )}

        {item.status === "verified" && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800 text-center">
              ✅ Deposit verified and added to your balance
            </p>
          </div>
        )}

        {item.status === "rejected" && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 text-center">
              ❌ Deposit rejected — please reupload or contact support
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DepositCard;
