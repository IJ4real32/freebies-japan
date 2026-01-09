// ✅ FILE: src/components/UI/SubscriptionBanner.jsx
// Subscription Banner — Option C (MOBILE STICKY + INFO SHEET + ANIMATION SAFE)

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { X, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import DonationModal from "../Payments/DonationModal";
import toast from "react-hot-toast";

export default function SubscriptionBanner() {
  const { currentUser, isSubscribed, trialCreditsLeft } = useAuth();
  const location = useLocation();

  const [temporarilyClosed, setTemporarilyClosed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  /* ---------------------------------------------------
   * Animate once per session
   * --------------------------------------------------- */
  useEffect(() => {
    const seen = sessionStorage.getItem("subscriptionBannerSeen");
    if (!seen) {
      setAnimateIn(true);
      sessionStorage.setItem("subscriptionBannerSeen", "true");
    }
  }, []);

  /* ---------------------------------------------------
   * Reset dismissal when visiting /items
   * --------------------------------------------------- */
  useEffect(() => {
    if (location.pathname === "/items") {
      setTemporarilyClosed(false);
    }
  }, [location.pathname]);

  /* ---------------------------------------------------
   * Soft success toast after subscribing (once/session)
   * --------------------------------------------------- */
  useEffect(() => {
    if (isSubscribed) {
      const done = sessionStorage.getItem("subscriptionToastShown");
      if (!done) {
        toast.success("🎉 Subscription active! You can keep requesting items.");
        sessionStorage.setItem("subscriptionToastShown", "true");
      }
    }
  }, [isSubscribed]);

  if (!currentUser || temporarilyClosed) return null;

  // 🔒 OPTION C CORE RULE
  if (isSubscribed || trialCreditsLeft > 0) return null;

  return (
    <>
      {/* ================= MOBILE (BOTTOM STICKY) ================= */}
      <div
        className={`
          fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:hidden
          transition-transform duration-500
          ${animateIn ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <div className="bg-white border border-amber-200 rounded-t-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-amber-500 mt-1" size={18} />

            <div className="flex-1">
              <div className="font-semibold text-amber-800 text-sm">
                Free requests used up
              </div>

              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Subscribe to keep requesting items.  
                Credits are only used if you’re awarded.
              </p>

              {/* Why subscribe */}
              <button
                onClick={() => setShowWhy((v) => !v)}
                className="mt-2 text-xs text-indigo-600 flex items-center gap-1"
              >
                Why subscribe?
                {showWhy ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>

              {showWhy && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <p>• Unlimited item requests</p>
                  <p>• Pay only when you’re selected</p>
                  <p>• Supports platform operations</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setTemporarilyClosed(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700
                       text-white font-semibold py-3 rounded-xl transition"
          >
            Subscribe
          </button>
        </div>
      </div>

      {/* ================= DESKTOP (TOP BANNER) ================= */}
      <div
        className={`
          hidden sm:block fixed top-0 inset-x-0 z-40 px-4 pt-safe
          transition-transform duration-500
          ${animateIn ? "translate-y-0" : "-translate-y-full"}
        `}
      >
        <div className="bg-white border border-amber-200 rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2 text-sm">
              <Sparkles className="text-amber-500 mt-0.5" size={16} />
              <div>
                <div className="font-semibold text-amber-800">
                  Free requests used up
                </div>
                <p className="text-gray-600 text-xs mt-1">
                  Subscribe to continue requesting items — credits apply only if awarded.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white
                           px-5 py-2 rounded-lg font-semibold"
              >
                Subscribe
              </button>

              <button
                onClick={() => setTemporarilyClosed(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center
                           text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 💳 Subscription / Donation Modal */}
      <DonationModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
