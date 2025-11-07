// ✅ FILE: src/components/UI/SubscriptionBanner.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Gift, Heart, X } from "lucide-react";
import DonationModal from "../Payments/DonationModal";

/**
 * Subscription banner
 * - Shows 3 modes: Trial, Expired, Subscribed
 * - Auto hides on scroll down, reappears on scroll up
 * - Can be closed temporarily (X inside donate button)
 * - Reappears automatically when user returns to /items
 */
export default function SubscriptionBanner() {
  const { currentUser, isSubscribed, isTrialExpired, trialCreditsLeft } = useAuth();
  const location = useLocation();

  const [hidden, setHidden] = useState(false);
  const [temporarilyClosed, setTemporarilyClosed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const lastScroll = useRef(0);

  /* ------------------------------------------------------------------
   * 🧭 Scroll hide / show logic
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > lastScroll.current && current > 120) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ------------------------------------------------------------------
   * ♻️ Reset banner when user navigates to /items
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (location.pathname === "/items") {
      setTemporarilyClosed(false);
    }
  }, [location.pathname]);

  // 🛑 Only render when user is logged in
  if (!currentUser || temporarilyClosed) return null;

  /* ------------------------------------------------------------------
   * 🎨 UI Layout
   * ------------------------------------------------------------------ */
  return (
    <>
      <div
        className={`fixed top-0 left-0 w-full z-40 transform transition-transform duration-300 ease-in-out ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } bg-white border-t border-gray-200 shadow-sm py-3 px-4`}
      >
        {/* 🟢 Active Trial */}
        {!isSubscribed && !isTrialExpired && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-800 font-medium relative">
            <div className="flex items-center justify-center sm:justify-start">
              <Gift className="w-4 h-4 text-emerald-600 mr-2" />
              You have{" "}
              <span className="font-bold text-emerald-700 mx-1">
                {trialCreditsLeft}
              </span>{" "}
              of 5 free requests remaining 🎁
            </div>
            <div className="relative inline-block">
              <button
                onClick={() => setShowModal(true)}
                className="relative bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg shadow transition flex items-center gap-2 pr-8"
              >
                Donate ¥1,500
                {/* ❌ Contained close button */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemporarilyClosed(true);
                  }}
                  className="absolute right-2 top-1.5 bg-white/90 text-emerald-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm hover:bg-white transition-all"
                  title="Close banner"
                >
                  <X size={10} strokeWidth={3} />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 🔴 Trial Expired */}
        {!isSubscribed && isTrialExpired && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-800 font-medium relative">
            <div className="flex-1 text-sm text-rose-700 font-medium leading-snug">
              ⚠️ Your free trial has ended — donate ¥1,500 to continue requesting free items.
              <p className="mt-1 text-gray-600 text-xs font-normal">
                Don’t worry — your current requests will still process.
              </p>
            </div>
            <div className="relative inline-block">
              <button
                onClick={() => setShowModal(true)}
                className="relative bg-rose-600 hover:bg-rose-700 text-white text-sm px-5 py-2 rounded-lg shadow transition flex items-center gap-2 pr-8"
              >
                Donate ¥1,500
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemporarilyClosed(true);
                  }}
                  className="absolute right-2 top-1.5 bg-white/90 text-rose-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm hover:bg-white transition-all"
                >
                  <X size={10} strokeWidth={3} />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 💖 Subscribed */}
        {isSubscribed && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm font-medium text-gray-800">
            <div className="flex items-center justify-center sm:justify-start">
              <Heart className="w-4 h-4 text-pink-600 mr-2" />
              <span className="text-pink-700">
                Thank you for supporting <b>Freebies Japan!</b> 💕
              </span>
            </div>
            <div className="relative inline-block">
              <button
                onClick={() => setShowModal(true)}
                className="relative bg-pink-600 hover:bg-pink-700 text-white text-sm px-5 py-2 rounded-lg shadow transition flex items-center gap-2 pr-8"
              >
                Donate Again
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemporarilyClosed(true);
                  }}
                  className="absolute right-2 top-1.5 bg-white/90 text-pink-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm hover:bg-white transition-all"
                >
                  <X size={10} strokeWidth={3} />
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 💳 Donation Modal */}
      <DonationModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
