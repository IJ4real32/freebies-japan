// ✅ FINAL CLEAN AddressConfirmationModal.js
import React, { useState } from "react";
import {
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext"; // ⭐ NEW
import { X, Loader2, MapPin, Phone, MessageSquare } from "lucide-react";

const AddressConfirmationModal = ({ open, onClose, request }) => {
  const { currentUser } = useAuth(); // ⭐ Required for email fallback

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!request) {
      setError("No request data provided.");
      return;
    }

    // ⭐ FINAL EMAIL FALLBACK LOGIC
    const userEmailSafe =
      request.userEmail ||
      request.email ||
      request.itemData?.recipientEmail ||
      currentUser?.email ||
      null;

    if (!userEmailSafe) {
      setError("Unable to determine your email address.");
      return;
    }

    if (!address.trim() || !phone.trim()) {
      setError("Address and phone number are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ⭐ Correct deliveryDetails payload
      const deliveryDetailsData = {
        requestId: request.id,
        userId: request.userId,
        userEmail: userEmailSafe, // ⭐ ALWAYS POPULATED
        itemId: request.itemId,
        itemTitle:
          request.itemData?.title ||
          request.itemName ||
          request.itemTitle ||
          "Unknown Item",

        deliveryAddress: address.trim(),
        deliveryPhone: phone.trim(),
        deliveryInstructions: instructions.trim() || "",

        status: "accepted",
        deliveryStatus: "accepted",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // ⭐ Write deliveryDetails/{requestId}
      await setDoc(doc(db, "deliveryDetails", request.id), deliveryDetailsData);

      // ⭐ Update original request
      await updateDoc(doc(db, "requests", request.id), {
        status: "accepted",
        deliveryStatus: "accepted",
        awardAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // UI feedback
      setTimeout(() => {
        window?.toast?.success?.(
          "🎉 Delivery details confirmed! Admin will contact you for pickup."
        );
      }, 0);

      // Reset UI state
      onClose();
      setAddress("");
      setPhone("");
      setInstructions("");
    } catch (err) {
      console.error("❌ Address confirmation error:", err);
      setError("Failed to confirm delivery: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError("");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Confirm Delivery Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Provide delivery information for:{" "}
              <strong>
                {request?.itemName ||
                  request?.itemData?.title ||
                  request?.itemTitle ||
                  "Unknown Item"}
              </strong>
            </p>
          </div>

          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Address Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Enter your full address..."
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="Phone number for courier contact"
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Instructions Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Delivery Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                placeholder="Landmarks, gate code, preferred time…"
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-white border rounded-lg text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !address.trim() || !phone.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming…
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
