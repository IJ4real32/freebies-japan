// ✅ FILE: src/components/MyActivity/RecipientConfirmDelivery.js
// PHASE-2 FINAL — Backend-authoritative recipient confirmation

import React, { useState } from "react";
import { recipientConfirmDelivery } from "../../services/functionsApi";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const RecipientConfirmDelivery = ({ request, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!request) return null;

  const handleConfirm = async (accepted) => {
    setLoading(true);
    setError("");

    try {
      await recipientConfirmDelivery({
        requestId: request.id,   // 🔥 MUST be requestId
        accepted,
      });

      if (accepted) {
        window?.toast?.success?.("✅ Delivery confirmed!");
      } else {
        window?.toast?.success?.("❌ Item declined.");
      }

      onDone?.(request);

    } catch (err) {
      console.error("❌ RecipientConfirmDelivery error:", err);
      setError(
        err?.message ||
        "Failed to confirm delivery. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <p className="text-sm text-gray-700 mb-3">
        Please confirm whether you accept this item and want delivery to proceed.
      </p>

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={() => handleConfirm(true)}
          className="flex-1 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Accept & Proceed
        </button>

        <button
          disabled={loading}
          onClick={() => handleConfirm(false)}
          className="flex-1 py-2 bg-red-600 text-white rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          Decline
        </button>
      </div>
    </div>
  );
};

export default RecipientConfirmDelivery;
