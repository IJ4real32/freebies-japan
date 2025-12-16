// ======================================================================
// DrawerWrapper.jsx — Universal Mobile Drawer
// Fullscreen, swipe-down to close, scroll-locked background
// ======================================================================

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DrawerWrapper({ open, onClose, children }) {
  const startY = useRef(0);
  const currentY = useRef(0);
  const threshold = 80; // pull-down distance to close

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Touch handlers for swipe-down gesture
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    currentY.current = e.touches[0].clientY - startY.current;
  };

  const handleTouchEnd = () =>    {
    if (currentY.current > threshold) {
      onClose();
    }
    startY.current = 0;
    currentY.current = 0;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Drawer Container */}
          <motion.div
            className="bg-white w-full h-full rounded-t-2xl overflow-hidden shadow-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
