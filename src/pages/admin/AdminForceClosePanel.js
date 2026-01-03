// ======================================================================
// AdminForceClosePanel.jsx
// Phase-2 • Admin-only • Callable-driven • Permanent lock
// ======================================================================

import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { AlertTriangle, Lock } from "lucide-react";

export default function AdminForceClosePanel({
  deliveryId,
  deliveryStatus,
  forceClosed,
  onCompleted, // optional callback to refresh parent
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  // ------------------------------------------------------------
  // Guard: already terminal
  // ------------------------------------------------------------
  if (
    forceClosed === true ||
    deliveryStatus === "completed" ||
    deliveryStatus === "force_closed"
  ) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 flex items-center gap-2">
        <Lock className="h-4 w-4" />
        Delivery is permanently closed.
      </div>
    );
  }

  // ------------------------------------------------------------
  // Action
  // ------------------------------------------------------------
  const handleForceClose = async () => {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const call = httpsCallable(functions, "adminForceCloseDelivery");
      await call({
        deliveryId,
        reason: reason.trim(),
      });

      setDone(true);
      if (onCompleted) onCompleted();
    } catch (err) {
      console.error("[AdminForceClosePanel]", err);
      setError(
        err?.message || "Failed to force-close delivery. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  // Success state (permanent lock)
  // ------------------------------------------------------------
  if (done) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
        <Lock className="h-4 w-4" />
        Delivery has been force-closed.
      </div>
    );
  }

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
      <div className="flex items-start gap-2 text-red-700">
        <AlertTriangle className="h-5 w-5 mt-0.5" />
        <div>
          <p className="font-semibold">Force Close Delivery</p>
          <p className="text-sm mt-1">
            This action is <b>permanent</b>. All buyer and seller actions will be
            locked.
          </p>
        </div>
      </div>

      <textarea
        className="mt-3 w-full rounded-md border border-red-300 p-2 text-sm"
        rows={3}
        placeholder="Reason for force-closing (required)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={submitting}
      />

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={handleForceClose}
        disabled={submitting}
        className={`mt-3 w-full rounded-md px-4 py-2 text-sm font-semibold text-white ${
          submitting
            ? "bg-red-300 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {submitting ? "Force Closing…" : "Force Close Delivery"}
      </button>
    </div>
  );
}
