import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle, XCircle } from 'lucide-react';
import ActionButton from './ActionButton';

const AwardModal = ({ open, onClose, item, onAccept, onDecline, loading }) => {
  if (!open || !item) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center text-white relative overflow-hidden"
          >
            {/* Confetti Background */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(25)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                  initial={{ y: -20, x: Math.random() * 100, opacity: 0 }}
                  animate={{ 
                    y: ['0%', '-100%', '0%'],
                    x: [Math.random() * 100, Math.random() * 100],
                    opacity: [0, 1, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white/30"
              >
                <Award className="w-12 h-12 text-yellow-300" />
              </motion.div>
              
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-3"
              >
                Congratulations! 🎉
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/90 text-lg mb-2"
              >
                You've been awarded:
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-xl font-semibold mb-2 bg-white/10 rounded-lg py-2 px-4"
              >
                {item.itemData?.title || item.itemTitle || 'Unknown Item'}
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-white/80 text-sm mb-8"
              >
                Please confirm delivery acceptance to proceed with pickup
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-3"
              >
                <ActionButton
                  variant="success"
                  icon={CheckCircle}
                  onClick={() => onAccept(item)}
                  loading={loading}
                  size="lg"
                  fullWidth
                >
                  Accept Delivery
                </ActionButton>
                <ActionButton
                  variant="outline"
                  icon={XCircle}
                  onClick={() => onDecline(item)}
                  loading={loading}
                  size="lg"
                  fullWidth
                >
                  Decline Offer
                </ActionButton>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AwardModal;