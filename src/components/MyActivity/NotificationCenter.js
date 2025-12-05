// ✅ FILE: src/components/MyActivity/NotificationCenter.jsx (FINAL)
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Award,
  Truck,
  AlertCircle,
} from "lucide-react";

const NotificationCenter = ({
  notifications = [],
  onClearNotification,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!notifications || notifications.length === 0) return null;

  /* -----------------------------------------------------------------------
   * PHASE-2 RULE:
   * Notification timestamp may come as:
   *   - Firestore Timestamp
   *   - string
   *   - number (ms)
   *   - missing => fallback to "now"
   * --------------------------------------------------------------------- */
  const parseTime = (ts) => {
    try {
      if (!ts) return new Date().toLocaleTimeString();
      if (ts.toDate) return ts.toDate().toLocaleTimeString(); // Firestore TS
      return new Date(ts).toLocaleTimeString(); // string/number
    } catch {
      return "—";
    }
  };

  return (
    <div className="relative">
      {/* BUTTON */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <MessageCircle size={20} />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {notifications.length}
        </span>
      </button>

      {/* DROPDOWN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notify-panel"
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-[999]"
          >
            {/* HEADER */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Notifications
              </h3>

              {notifications.length > 1 && (
                <button
                  onClick={onClearAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* BODY */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification, index) => {
                const type = notification.type || "system";
                const iconMap = {
                  award: Award,
                  delivery: Truck,
                  system: AlertCircle,
                };

                const Icon = iconMap[type] || AlertCircle;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* ICON */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center 
                          ${
                            type === "award"
                              ? "bg-purple-100 text-purple-600"
                              : type === "delivery"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }
                        `}
                      >
                        <Icon size={16} />
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                          {notification.message}
                        </p>

                        <p className="text-xs text-gray-400">
                          {parseTime(notification.timestamp)}
                        </p>
                      </div>

                      {/* CLEAR SINGLE */}
                      <button
                        onClick={() => onClearNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
