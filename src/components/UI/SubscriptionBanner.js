// ✅ FILE: src/components/UI/SubscriptionBanner.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Gift, Heart } from "lucide-react";
import DonationModal from "../Payments/DonationModal";

/**
 * Subscription banner
 * - Shows 3 modes: Trial, Expired, Subscribed
 * - Auto hides on scroll down, reappears on scroll up
 * - Opens donation modal (with proof upload + cancel)
 */
export default function SubscriptionBanner() {
  const { currentUser, isSubscribed, isTrialExpired, trialCreditsLeft } = useAuth();

  const [hidden, setHidden] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const lastScroll = useRef(0);

  /* ------------------------------------------------------------------
   * 🧭 Scroll hide / show logic
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > lastScroll.current && current > 120) {
        setHidden(true); // scrolling down
      } else {
        setHidden(false); // scrolling up
      }
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🛑 Only render when user is logged in
  if (!currentUser) return null;

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-800 font-medium">
            <div className="flex items-center justify-center sm:justify-start">
              <Gift className="w-4 h-4 text-emerald-600 mr-2" />
              You have{" "}
              <span className="font-bold text-emerald-700 mx-1">
                {trialCreditsLeft}
              </span>{" "}
              of 5 free requests remaining 🎁
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg shadow transition"
            >
              Donate ¥1,500
            </button>
          </div>
        )}

        {/* 🔴 Trial Expired */}
        {!isSubscribed && isTrialExpired && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-800 font-medium">
            <div className="flex-1 text-sm text-rose-700 font-medium leading-snug">
              ⚠️ Your free trial has ended — donate ¥1,500 to continue requesting free items.
              <p className="mt-1 text-gray-600 text-xs font-normal">
                Don’t worry — your current requests will still process.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-sm px-4 py-2 rounded-lg shadow transition"
            >
              Donate ¥1,500
            </button>
          </div>
        )}

        {/* 💖 Subscribed (Show appreciation + option to donate again) */}
        {isSubscribed && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm font-medium text-gray-800">
            <div className="flex items-center justify-center sm:justify-start">
              <Heart className="w-4 h-4 text-pink-600 mr-2" />
              <span className="text-pink-700">
                Thank you for supporting <b>Freebies Japan!</b> 💕
              </span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white text-sm px-4 py-2 rounded-lg shadow transition"
            >
              Donate Again
            </button>
          </div>
        )}
      </div>

      {/* 💳 Donation Modal */}
      <DonationModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
