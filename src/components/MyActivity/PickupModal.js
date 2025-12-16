// ============================================================================
// FILE: src/components/MyActivity/PickupModal.jsx
// UPDATED VERSION: Supports both FREE and PREMIUM items
// ============================================================================

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock } from "lucide-react";
import toast from "react-hot-toast";

const PickupModal = ({ 
  open, 
  donation, 
  loading, 
  onClose, 
  onSchedule,
  mode = "free", // NEW prop: "free" or "premium" 
  requestId = null // NEW prop: for FREE items
}) => {
  const [pickupDate, setPickupDate] = useState("");
  const [pickupWindow, setPickupWindow] = useState("9-12");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setPickupDate("");
      setPickupWindow("9-12");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
  if (!pickupDate) {
    toast.error("Please select a pickup date");
    return;
  }

  if (mode === "free" && !requestId) {
    toast.error("Pickup cannot be scheduled yet.");
    return;
  }

  const scheduleData = {
    pickupDate: new Date(pickupDate),
    pickupWindow,
  };

  if (mode === "free") {
    scheduleData.requestId = requestId;
  } else if (donation?.id) {
    scheduleData.donationId = donation.id;
  }

  onSchedule(scheduleData);
};

  // Dynamic text based on mode
  const isFreeMode = mode === "free";
  const modalTitle = isFreeMode ? "Schedule Pickup (FREE Item)" : "Schedule Pickup";
  const modalDescription = isFreeMode 
    ? "Propose a pickup date for your FREE item. The buyer will be notified."
    : "Schedule a pickup for your item.";
  const submitButtonText = loading 
    ? "Scheduling..." 
    : (isFreeMode ? "Propose Pickup Date" : "Schedule Pickup");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{modalTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">{modalDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Item Info */}
          {donation && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Item:</p>
              <p className="text-sm text-gray-600 truncate">
                {donation.title || donation.donation?.title || "Untitled Item"}
              </p>
            </div>
          )}

          {/* Pickup Date */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} />
              Pickup Date
            </label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={new Date().toISOString().split("T")[0]}
              disabled={loading}
              required
            />
          </div>

          {/* Time Window */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock size={16} />
              Preferred Time Window
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["9-12", "12-3", "3-6", "6-9"].map((window) => (
                <button
                  key={window}
                  type="button"
                  onClick={() => !loading && setPickupWindow(window)}
                  disabled={loading}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                    pickupWindow === window
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300 text-gray-700 hover:border-gray-400 disabled:opacity-50"
                  } ${!loading ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {window}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select the 3-hour window when you prefer pickup
            </p>
          </div>

          {/* Current Selection Display */}
          {pickupDate && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-700">Selected pickup:</p>
              <p className="text-sm text-blue-600">
                {new Date(pickupDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                between {pickupWindow}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !pickupDate}
            className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PickupModal;