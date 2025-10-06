// Subscribe.jsx
import React from "react";
import Navbar from "../components/UI/Navbar";
import { useAuth } from "../contexts/AuthContext";
import SubscriptionDepositButton from "../components/Payments/SubscriptionDepositButton";

// Fixed subscription price (you asked for ¥1,000)
const SUBSCRIPTION_PRICE_YEN = 1000;

export default function Subscribe() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Subscribe</h1>
        <p className="text-gray-600 mb-6">
          Become a subscriber to request Premium items. Pay by bank deposit at JP Post
          and submit your deposit report here—an admin will review and activate your subscription.
        </p>

        {!currentUser && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
            Please sign in to start your subscription.
          </div>
        )}

        <div className="space-y-3">
          <SubscriptionDepositButton amountYen={SUBSCRIPTION_PRICE_YEN} />
        </div>

        <div className="mt-6 text-sm text-gray-600 space-y-2">
          <p>
            After you deposit, click <em>Submit</em> to send your deposit report
            (payer name, method, and optional reference number or receipt).
          </p>
          <p>
            Please include your unique code in the transfer name if we provided one on the form.
          </p>
        </div>
      </main>
    </div>
  );
}
