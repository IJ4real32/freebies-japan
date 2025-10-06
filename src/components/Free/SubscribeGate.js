// ✅ FILE: src/components/Free/SubscribeGate.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function SubscribeGate({ children, className = "" }) {
  const navigate = useNavigate();
  const { currentUser, profile } = useAuth() || {};

  const isSubscribed = !!profile?.isSubscribed;
  const isTest = !!profile?.testSubscriber;
  const trialCredits = Number(profile?.trialCredits ?? 0);

  const allowed = isSubscribed || isTest || trialCredits > 0;

  // Not signed in → ask to login
  if (!currentUser) {
    return (
      <div className={`text-sm text-gray-700 ${className}`}>
        <span>Sign in to request free items. </span>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-indigo-600 hover:underline"
        >
          Log in
        </button>
        .
      </div>
    );
  }

  // Signed in but not eligible → ask to subscribe
  if (!allowed) {
    return (
      <div className={`text-sm text-gray-700 ${className}`}>
        <span>Subscribers only. </span>
        <button
          type="button"
          onClick={() => navigate("/subscribe")}
          className="text-indigo-600 hover:underline"
        >
          Subscribe
        </button>
        <span> to request free items.</span>
      </div>
    );
  }

  // Eligible → render children
  return <>{children}</>;
}

export default SubscribeGate;
