import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ✅ Embedded slides data
const slidesData = [
  {
    title: "Collect Gently Used Items",
    description:
      "Gather items you no longer need and give them a second life through donation.",
    image: require("../assets/slide1-collect.png"),
  },
  {
    title: "Move With Less, Give More",
    description:
      "Moving out? Let go of extra items to help someone starting fresh.",
    image: require("../assets/slide2-move.png"),
  },
  {
    title: "Share Feedback & Improve",
    description:
      "Your voice shapes our community — give feedback to build trust and safety.",
    image: require("../assets/slide3-feedback.png"),
  },
  {
    title: "Locate Items Easily",
    description:
      "Use delivery or pickup options with built-in location features for your convenience.",
    image: require("../assets/slide4-locate.png"),
  },
  {
    title: "Donate With Heart",
    description:
      "Make a difference by sharing love and support through everyday essentials.",
    image: require("../assets/slide5-donate.png"),
  },
];

export default function OnboardingSlides() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const navigate = useNavigate();

  // Auto-advance slides
  useEffect(() => {
    if (currentIndex === slidesData.length - 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) =>
          prev < slidesData.length - 1 ? prev + 1 : prev
        );
        setFade(true);
      }, 250);
    }, 3200);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const slide = slidesData[currentIndex];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[100dvh] text-center text-white overflow-hidden px-5">
      {/* 🌌 Aurora Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-700 via-indigo-900 to-transparent opacity-30 animate-[pulse_14s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,_transparent_1px)] bg-[length:22px_22px] opacity-10 animate-[ascend_50s_linear_infinite]" />
      </div>

      {/* 🔘 Skip link */}
      <button
        onClick={() => navigate("/items")}
        className="absolute top-4 right-4 text-xs sm:text-sm text-gray-300 hover:text-white bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20"
      >
        Skip →
      </button>

      {/* 🌠 Slide Content */}
      <div
        key={slide.title}
        className={`relative z-10 w-full max-w-md sm:max-w-xl transition-opacity duration-700 ease-in-out ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        <img
          src={slide.image}
          alt={slide.title}
          loading="lazy"
          className="w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 object-contain mx-auto mb-4 drop-shadow-2xl select-none"
          draggable="false"
        />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 drop-shadow-md leading-snug">
          {slide.title}
        </h1>
        <p className="text-sm sm:text-base text-gray-200 leading-relaxed max-w-sm mx-auto mt-1 mb-10">
          {slide.description}
        </p>
      </div>

      {/* 🟢 Progress Dots */}
      <div
        className="z-10 flex space-x-2 mb-16 sm:mb-20 md:mb-24"
        aria-label="Slide progress indicator"
      >
        {slidesData.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              i === currentIndex
                ? "bg-blue-400 scale-125 shadow-md"
                : "bg-gray-400 opacity-50"
            }`}
          />
        ))}
      </div>

      {/* 🔘 Sticky Bottom Buttons */}
      {currentIndex === slidesData.length - 1 && (
        <div
          className={`fixed bottom-0 left-0 w-full bg-gradient-to-t from-blue-950/70 to-transparent pb-safe flex justify-center space-x-3 py-3 sm:py-4 z-20 backdrop-blur-sm transition-opacity duration-700 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm bg-blue-500 text-white rounded-full shadow hover:bg-blue-600 transition transform hover:scale-105 active:scale-95"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm bg-white text-blue-600 rounded-full shadow hover:bg-gray-100 transition transform hover:scale-105 active:scale-95"
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Branding Footer */}
      <footer className="absolute bottom-1 left-0 w-full text-center text-[10px] sm:text-xs text-gray-300 opacity-80 z-10">
        © 2025 Freebies Japan — Building community through sharing
      </footer>

      {/* 🌠 Keyframes */}
      <style>{`
        @keyframes ascend {
          0% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </div>
  );
}
