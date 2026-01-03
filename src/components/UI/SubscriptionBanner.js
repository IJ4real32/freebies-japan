// ✅ FILE: src/components/UI/SubscriptionBanner.jsx
// Subscription Banner — Option C compliant (credits-based rendering)

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Heart, X } from "lucide-react";
import DonationModal from "../Payments/DonationModal";

/**
 * SubscriptionBanner (Phase-2 / Option C)
 * - Render ONLY when user has 0 credits left
 * - No progress bar
 * - No "trial expired" language
 * - Button = Subscribe
 */
export default function SubscriptionBanner() {
  const { currentUser, isSubscribed, trialCreditsLeft } = useAuth();
  const location = useLocation();

  const [temporarilyClosed, setTemporarilyClosed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  /* ------------------------------------------------------------------
   * ♻️ Reset banner when navigating to /items
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (location.pathname === "/items") {
      setTemporarilyClosed(false);
    }
  }, [location.pathname]);

  if (!currentUser || temporarilyClosed) return null;

  // ✅ CORE RULE: show banner ONLY when credits === 0 and not subscribed
  if (isSubscribed || trialCreditsLeft > 0) return null;

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-40 bg-white border-b border-gray-200 shadow-sm py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm font-medium text-gray-800 relative">
          <div className="flex-1 leading-snug text-amber-700">
            <span className="font-semibold">
              You've used all your free credits.
            </span>
            <p className="mt-1 text-xs text-gray-600 font-normal">
              Subscribe to continue receiving free items. Requests remain free —
              credits are only used when you're awarded an item.
            </p>
          </div>

          <div className="relative inline-block">
            <button
              onClick={() => setShowModal(true)}
              className="relative bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg shadow transition flex items-center gap-2 pr-8"
            >
              Subscribe
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setTemporarilyClosed(true);
                }}
                className="absolute right-2 top-1.5 bg-white/90 text-indigo-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm hover:bg-white transition-all"
                title="Close banner"
              >
                <X size={10} strokeWidth={3} />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 💳 Subscription / Donation Modal (kept as-is for now) */}
      <DonationModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}