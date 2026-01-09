// ✅ FILE: src/pages/LandingPage.js
// Onboarding with swipe, transitions, persistence & language toggle

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import onboardingSlides from "../pages/OnboardingSlides";
import { useTranslation } from "../hooks/useTranslation";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, setLanguage, language } = useTranslation();

  /* --------------------------------------------------
   * Slide state
   * -------------------------------------------------- */
  const query = new URLSearchParams(window.location.search);
  const initialIndex = parseInt(query.get("slide"), 10) || 0;
  const [slideIndex, setSlideIndex] = useState(initialIndex);
  const slide = onboardingSlides[slideIndex];

  /* --------------------------------------------------
   * Persist onboarding completion
   * -------------------------------------------------- */
  useEffect(() => {
    const completed = localStorage.getItem("onboardingCompleted");
    if (completed === "true") {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const completeOnboarding = () => {
    localStorage.setItem("onboardingCompleted", "true");
    navigate("/login");
  };

  /* --------------------------------------------------
   * Navigation
   * -------------------------------------------------- */
  const handleNext = () => {
    if (slideIndex < onboardingSlides.length - 1) {
      const next = slideIndex + 1;
      setSlideIndex(next);
      navigate(`/?slide=${next}`);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (slideIndex > 0) {
      const prev = slideIndex - 1;
      setSlideIndex(prev);
      navigate(`/?slide=${prev}`);
    }
  };

  /* --------------------------------------------------
   * Swipe gestures (mobile)
   * -------------------------------------------------- */
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > 60) {
      diff > 0 ? handleNext() : handleBack();
    }
  };

  /* --------------------------------------------------
   * Language toggle
   * -------------------------------------------------- */
  const toggleLanguage = () => {
    const next = language === "en" ? "ja" : "en";
    setLanguage(next);
    localStorage.setItem("lang", next);
  };

  /* --------------------------------------------------
   * Render
   * -------------------------------------------------- */
  return (
    <div
      className="min-h-screen flex flex-col justify-between items-center px-4 py-6 sm:py-10
                 text-center bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900
                 text-white relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.25),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,_transparent_1px)] bg-[length:24px_24px] opacity-10" />
      </div>

      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 z-20 text-xs bg-white/20 hover:bg-white/30
                   px-3 py-1 rounded-full transition"
      >
        {language === "en" ? "日本語" : "EN"}
      </button>

      {/* Slide content */}
      <div
        key={slideIndex}
        className="z-10 flex flex-col items-center w-full max-w-md
                   transition-all duration-500 ease-out
                   opacity-100 translate-y-0 animate-fadeIn"
      >
        <img
          src={slide.image}
          alt="Onboarding illustration"
          className="w-full max-w-sm object-contain mb-6 rounded-2xl shadow-xl"
        />

        <h2 className="text-2xl sm:text-3xl font-bold mb-3 drop-shadow">
          {t(slide.title)}
        </h2>

        <p className="text-sm sm:text-base text-gray-100 leading-relaxed mb-6">
          {t(slide.description)}
        </p>

        {/* Final CTA */}
        {slideIndex === onboardingSlides.length - 1 && (
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={completeOnboarding}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold"
            >
              {t("login")}
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="flex-1 bg-white/90 text-indigo-700 py-3 rounded-xl font-semibold
                         border border-indigo-600 hover:bg-white"
            >
              {t("signup")}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="z-10 w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {onboardingSlides.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition ${
                i === slideIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-between text-sm">
          {slideIndex > 0 ? (
            <button onClick={handleBack} className="text-blue-200 hover:text-white">
              ← {t("back")}
            </button>
          ) : (
            <span />
          )}

          <button onClick={handleNext} className="text-blue-200 hover:text-white font-medium">
            {slideIndex < onboardingSlides.length - 1 ? `${t("next")} →` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
