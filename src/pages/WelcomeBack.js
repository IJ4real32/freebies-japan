import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Short animated splash screen for returning users after login.
 * Auto-redirects to /items after 2.5 seconds.
 */
export default function WelcomeBack() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/items", { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white text-center overflow-hidden">
      {/* Animated logo */}
      <motion.img
        src="/LogoX.png"
        alt="Freebies Japan Logo"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-36 sm:w-48 mb-8 drop-shadow-2xl"
      />

      {/* Text animation */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-3xl sm:text-4xl font-extrabold mb-2"
      >
        Welcome back! 👋
      </motion.h1>

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-gray-200 text-sm sm:text-base max-w-xs sm:max-w-md mx-auto"
      >
        Glad to see you again. Redirecting to your dashboard...
      </motion.p>

      {/* Subtle animated background dots */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#ffffff33_1px,_transparent_1px)] bg-[length:22px_22px] opacity-10 animate-[ascend_60s_linear_infinite]" />

      <style>{`
        @keyframes ascend {
          0% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </div>
  );
}
