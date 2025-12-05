// ================================================
// FILE: DeclineReasonModal.jsx
// FULL-SCREEN MODAL FOR DECLINE REASON ENTRY
// ================================================

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function DeclineReasonModal({
  open,
  item,
  onClose,
  onSubmit,
  loading
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

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
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Decline Award</h2>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-gray-700 text-sm mb-4 leading-relaxed">
            Please provide a reason for declining this item.  
            <span className="font-semibold text-gray-900">
              This helps us improve the experience.
            </span>
          </p>

          {/* TEXTAREA */}
          <textarea
            rows={5}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Optional: Enter your reason here..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              onClick={() => onSubmit(reason)}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Decline Award"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
