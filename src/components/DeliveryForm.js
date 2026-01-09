// ✅ FILE: src/components/DeliveryForm.jsx
// PHASE-2 FINAL — UI-only address collector (backend handled by parent)

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const DeliveryForm = ({
  request = null,
  onSubmit,
  onCancel,
  existingData = {},
}) => {
  const { currentUser } = useAuth();

  const fallbackData = currentUser?.defaultAddress || {};

  const [formData, setFormData] = useState({
    zipCode: existingData.zipCode || fallbackData.zipCode || "",
    address: existingData.address || fallbackData.address || "",
    roomNumber: existingData.roomNumber || fallbackData.roomNumber || "",
    phone: existingData.phone || fallbackData.phone || "",
    instructions: existingData.instructions || "",
  });

  const [loadingZip, setLoadingZip] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* --------------------------------------------------
   * ZIP AUTO LOOKUP (Japan)
   * -------------------------------------------------- */
  useEffect(() => {
    if (formData.zipCode.length !== 7 || !/^\d+$/.test(formData.zipCode)) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingZip(true);
        setError("");

        const res = await axios.get(
          `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formData.zipCode}`
        );

        if (res.data?.results?.length) {
          setSuggestions(res.data.results);

          if (res.data.results.length === 1) {
            const r = res.data.results[0];
            setFormData((prev) => ({
              ...prev,
              address: `${r.address1} ${r.address2} ${r.address3}`,
            }));
          }
        } else {
          setError("No address found for this ZIP code.");
        }
      } catch (err) {
        console.error("ZIP lookup error:", err);
        setError("ZIP lookup failed. Enter address manually.");
      } finally {
        setLoadingZip(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.zipCode]);

  /* --------------------------------------------------
   * CHANGE HANDLER
   * -------------------------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* --------------------------------------------------
   * SUBMIT (UI → PARENT ONLY)
   * -------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.zipCode || !formData.address || !formData.phone) {
      setError("ZIP code, address, and phone are required.");
      return;
    }

    if (!/^\d{7}$/.test(formData.zipCode)) {
      setError("ZIP code must be 7 digits.");
      return;
    }

    if (!/^\d{10,15}$/.test(formData.phone)) {
      setError("Enter a valid phone number (10–15 digits).");
      return;
    }

    try {
      setSubmitting(true);

      // 🔑 PHASE-2 CANONICAL PAYLOAD
      const payload = {
        deliveryAddress: `${formData.zipCode} ${formData.address}${
          formData.roomNumber ? ` ${formData.roomNumber}` : ""
        }`.trim(),
        deliveryPhone: formData.phone.trim(),
        deliveryInstructions: formData.instructions?.trim() || "",
      };

      if (typeof onSubmit === "function") {
        if (request?.id) {
          await onSubmit(request.id, payload);
        } else {
          await onSubmit(payload);
        }
      }
    } catch (err) {
      console.error("DeliveryForm submit failed:", err);
      setError("Failed to save address. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      <h3 className="font-medium mb-3 text-gray-800 text-sm">
        Delivery Information
      </h3>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">ZIP Code *</label>
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            maxLength="7"
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="1234567"
          />
          {loadingZip && (
            <p className="text-xs text-gray-500 mt-1">
              Looking up address…
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="08012345678"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">Address *</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />

        {suggestions.length > 1 && (
          <ul className="border rounded mt-1 divide-y text-xs">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    address: `${s.address1} ${s.address2} ${s.address3}`,
                  }))
                }
              >
                {s.address1} {s.address2} {s.address3}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">
          Room / Building
        </label>
        <input
          type="text"
          name="roomNumber"
          value={formData.roomNumber}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">
          Instructions (Optional)
        </label>
        <input
          type="text"
          name="instructions"
          value={formData.instructions}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Gate code, landmark, etc."
        />
      </div>

      <div className="flex justify-end gap-3 mt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Address"}
        </button>
      </div>
    </form>
  );
};

export default DeliveryForm;
