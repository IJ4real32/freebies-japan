// FILE: src/components/MyActivity/ConfirmActionModal.jsx
import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmActionModal({
  open,
  message,
  loading,
  onClose,
  onConfirm
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Confirm Action</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* WARNING ICON */}
          <div className="flex justify-center mb-3">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>

          <p className="text-center text-gray-700 text-sm mb-6">{message}</p>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
