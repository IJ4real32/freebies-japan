// ✅ FILE: src/components/MyActivity/AddressConfirmationModal.jsx
// PHASE-2 FINAL — Backend-authoritative payload

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  X,
  Loader2,
  MapPin,
  Phone,
  MessageSquare,
} from "lucide-react";

const AddressConfirmationModal = ({ open, onClose, request, onConfirm }) => {
  const { currentUser } = useAuth();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // HARD GUARD — WRITE ONCE
  // --------------------------------------------------
  const addressAlreadySubmitted =
    request?.addressSubmitted === true ||
    (!!request?.deliveryAddress && !!request?.deliveryPhone);

  useEffect(() => {
    if (!open) {
      setAddress("");
      setPhone("");
      setInstructions("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open || !request || addressAlreadySubmitted) return null;

  const handleSubmit = async () => {
    if (!address.trim() || !phone.trim()) {
      setError("Address and phone number are required.");
      return;
    }

    if (!currentUser) {
      setError("You must be logged in.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 🔑 PHASE-2 CANONICAL PAYLOAD
      onConfirm?.({
        requestId: request.requestId || request.id,
        deliveryAddress: address.trim(),
        deliveryPhone: phone.trim(),
        deliveryInstructions: instructions.trim(),
      });

      window?.toast?.success?.("🎉 Delivery details submitted!");
      onClose();
    } catch (err) {
      console.error("AddressConfirmationModal error:", err);
      setError("Failed to submit delivery details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[999]">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Confirm Delivery Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              For item:{" "}
              <strong>
                {request.itemTitle || "Unknown Item"}
              </strong>
            </p>
          </div>

          <button
            onClick={!loading ? onClose : undefined}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Delivery Address *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 bg-white border rounded-lg"
          >
            Cancel
          </button>

          <button
            disabled={loading || !address.trim() || !phone.trim()}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              "Confirm Delivery"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressConfirmationModal;
