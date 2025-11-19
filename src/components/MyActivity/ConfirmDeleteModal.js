import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash, X } from 'lucide-react';
import ActionButton from './ActionButton';

const ConfirmDeleteModal = ({ open, onClose, item, onConfirm, loading }) => {
  if (!open || !item) return null;

  const getMessage = () => {
    if (item.status === 'deleted') {
      return 'This is a legacy item that can be removed from your list.';
    }
    
    if (item.userId && !item.itemId) {
      return 'This is a legacy request with missing data. Remove it from your list?';
    }
    
    if (item.donorId && !item.title) {
      return 'This is a legacy donation with missing data. Remove it from your list?';
    }
    
    return 'Are you sure you want to remove this item? This action cannot be undone.';
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash className="w-8 h-8 text-red-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirm Removal
            </h3>

            <p className="text-gray-600 text-sm mb-6">
              {getMessage()}
            </p>

            <div className="flex gap-3">
              <ActionButton
                onClick={onConfirm}
                loading={loading}
                variant="danger"
                icon={Trash}
                fullWidth
              >
                {loading ? 'Removing...' : 'Yes, Remove'}
              </ActionButton>
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