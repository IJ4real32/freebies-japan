// ✅ FILE: src/components/UI/SubscriptionBanner.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, Gift, Crown, X } from "lucide-react";
import { createMoneyDonation } from "../../services/functionsApi";
import toast from "react-hot-toast";

/**
 * ✅ Subscription banner
 * - Auto hides on scroll down
 * - Reappears on scroll up
 * - Includes visible (×) button above Donate button
 */
export default function SubscriptionBanner() {
  const { currentUser, isSubscribed, isTrialExpired, trialCreditsLeft } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScroll = useRef(0);
  const [showAd, setShowAd] = useState(false);

  /* ------------------------------------------------------------------
   * 💰 Donation handler
   * ------------------------------------------------------------------ */
  const handleDonateClick = async () => {
    try {
      setIsProcessing(true);
      toast.loading("Creating donation record…", { id: "donate" });

      const res = await createMoneyDonation({
        amountJPY: 1500,
        message: "Platform maintenance donation",
      });

      toast.dismiss("donate");

      if (res?.id || res?.donationId) {
        toast.success("Donation created! Please complete your bank transfer.");
        navigate("/deposit-instructions", {
          state: { donationId: res.id || res.donationId },
        });
      } else {
        toast("Donation recorded — please check your dashboard.", { icon: "💌" });
      }
    } catch (err) {
      toast.dismiss("donate");
      console.error("Money donation error:", err);
      toast.error(err?.message || "Failed to initiate donation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /* ------------------------------------------------------------------
   * 🧭 Scroll hide / show logic
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > lastScroll.current && current > 120) {
        // scrolling down
        setHidden(true);
      } else {
        // scrolling up
        setHidden(false);
      }
      lastScroll.current = current;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!currentUser || isSubscribed) return null;

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
            <button
              onClick={() => navigate("/subscribe")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg shadow transition"
            >
              Donate ¥1,500
            </button>
          </div>
        )}

        {/* 🔴 Trial Expired */}
        {!isSubscribed && isTrialExpired && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-800 font-medium relative">
            <div className="flex-1 text-sm text-rose-700 font-medium leading-snug">
              ⚠️ Your free trial has ended — make a one-time donation of ¥1,500 to continue requesting free items, this helps us keep freebies running.
              <p className="mt-1 text-gray-600 text-xs font-normal">
                Don’t worry — your current requests will still process, you will be notified if selected for any free items requested.
              </p>
            </div>

            <div className="relative">
              {/* ❌ Close button slightly above Donate button */}
      <button
    onClick={() => setHidden(true)}
    className="absolute -top-4 right-0 text-white text-lg font-bold hover:opacity-90"
    aria-label="Close banner"
  >
    ×
  </button>
  <button
    onClick={handleDonateClick}
    disabled={isProcessing}
    className="bg-rose-600 hover:bg-rose-700 text-white text-sm px-4 py-2 rounded-lg shadow disabled:opacity-50 transition"
  >
    {isProcessing ? "Processing…" : "Donate ¥1,500"}
  </button>
            </div>
          </div>
        )}
      </div>

      {/* 📰 Ad Space (optional future use) */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          showAd ? "h-auto mt-3" : "h-0 overflow-hidden"
        }`}
      >
        {showAd && (
          <div className="max-w-screen-lg mx-auto bg-gray-100 text-center p-3 rounded-md shadow-inner">
            <p className="text-sm text-gray-600">Sponsored Ad — Coming Soon</p>
          </div>
        )}
      </div>
    </>
  );
}
