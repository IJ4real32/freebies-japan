// ✅ FILE: src/components/MyActivity/PickupModal.jsx (PHASE-2 VERIFIED)
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar } from "lucide-react";
import ActionButton from "./ActionButton";
import toast from "react-hot-toast";

const PickupModal = ({ open, onClose, donation, loading, onSchedule }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("09:00");

  if (!open || !donation) return null;

  /* -----------------------------------------------------------------------
   * 🔒 PHASE-2 VALIDATION RULES
   * --------------------------------------------------------------------- */

  const handleSchedule = () => {
    if (!selectedDate) {
      toast.error("Please select a pickup date");
      return;
    }

    // Combine into ISO format string
    const pickupDateTime = `${selectedDate}T${selectedTime}`;

    // PASS donation.id (request lookup happens inside MyActivity)
    onSchedule(donation.id, pickupDateTime);
  };

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-4"
          onClick={!loading ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Schedule Pickup
                </h3>
                <p className="text-gray-600 text-sm">
                  Select the date and time for pickup
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-6">
              {/* Item Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-medium text-gray-900 text-sm mb-1">
                  Item
                </p>
                <p className="text-gray-600 text-sm line-clamp-1">
                  {donation.title || donation.itemTitle || "Unknown Item"}
                </p>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>

              {/* Time Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        selectedTime === time
                          ? "bg-blue-600 text-white shadow"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <ActionButton
                  onClick={handleSchedule}
                  disabled={loading || !selectedDate}
                  loading={loading}
                  variant="primary"
                  icon={Calendar}
                  fullWidth
                  size="lg"
                >
                  {loading ? "Scheduling..." : "Schedule Pickup"}
                </ActionButton>

                <ActionButton
                  onClick={onClose}
                  disabled={loading}
                  variant="outline"
                  fullWidth
                  size="lg"
                >
                  Cancel
                </ActionButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PickupModal;
