// ✅ FILE: src/components/MyActivity/AddressConfirmationModal.jsx (PHASE-2 FINAL)
import React, { useState } from "react";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";        // ✅ FIXED PATH
import { useAuth } from "../../contexts/AuthContext";

import { 
  X, Loader2, MapPin, Phone, MessageSquare 
} from "lucide-react";

const AddressConfirmationModal = ({ open, onClose, request, onConfirm }) => {
  const { currentUser } = useAuth();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !request) return null;

  const handleSubmit = async () => {
    if (!address.trim() || !phone.trim()) {
      setError("Address and phone number are required.");
      return;
    }

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

    setLoading(true);
    setError("");

    try {
      const deliveryPayload = {
        requestId: request.id,
        userId: request.userId,
        userEmail: userEmailSafe,
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

        awardAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 🔵 Write deliveryDetails/{requestId}
      await setDoc(
        doc(db, "deliveryDetails", request.id),
        deliveryPayload,
        { merge: true }
      );

      // 🟢 Update request/{requestId}
      await updateDoc(doc(db, "requests", request.id), {
        status: "accepted",
        deliveryStatus: "accepted",
        awardAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Let MyActivity handle notifications via Cloud Functions
      onConfirm?.(request);

      window?.toast?.success?.("🎉 Delivery details confirmed!");

      // Reset UI
      setAddress("");
      setPhone("");
      setInstructions("");
      onClose();

    } catch (err) {
      console.error("❌ Address Confirm Error:", err);
      setError("Failed to save delivery details: " + err.message);
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
                {request.itemData?.title ||
                  request.itemName ||
                  request.itemTitle ||
                  "Unknown Item"}
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
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Delivery Address *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Full delivery address..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Courier contact number"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Landmarks, gate code, notes..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 bg-white border rounded-lg text-gray-700"
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
