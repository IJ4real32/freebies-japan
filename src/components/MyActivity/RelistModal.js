// ✅ FILE: src/components/MyActivity/RelistModal.jsx (FINAL PHASE-2)
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock } from "lucide-react";
import { Timestamp } from "firebase/firestore";

const REQUEST_WINDOWS = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "72 hours", hours: 72 },
  { label: "7 days", hours: 168 },
];

export default function RelistModal({
  open,
  item,
  onClose,
  onRelist,
  loading,
}) {
  const [windowHours, setWindowHours] = useState(48);

  if (!open || !item) return null;

  const isPremium = item?.type === "premium" || item?.isPremium;

  const handleSubmit = () => {
    const windowEnd = Timestamp.fromDate(
      new Date(Date.now() + windowHours * 60 * 60 * 1000)
    );

    onRelist(item, {
      requestWindowEnd: windowEnd,
      windowHours,
    });
  };

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
          transition={{ type: "spring", damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6"
        >
          {/* HEADER */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900">Relist Item</h2>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            Relisting:{" "}
            <span className="font-semibold text-gray-900">{item.title}</span>
          </p>

          {/* FREE ITEM — CHOOSE REQUEST WINDOW */}
          {!isPremium && (
            <div className="mb-7">
              <label className="block mb-2 font-medium text-gray-800 text-sm">
                Request Window Duration
              </label>

              <select
                value={windowHours}
                onChange={(e) => setWindowHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {REQUEST_WINDOWS.map((w) => (
                  <option
                    key={w.hours}
                    value={w.hours}
                    className="text-gray-800"
                  >
                    {w.label}
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                <Clock size={12} />
                Users can request the item during this period.
              </p>
            </div>
          )}

          {/* PREMIUM ITEM — AUTO RELIST MESSAGE */}
          {isPremium && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700 mb-7">
              Premium items relist immediately with the same price and
              conditions.
            </div>
          )}

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50"
            >
              {loading ? "Relisting..." : "Relist Item"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
