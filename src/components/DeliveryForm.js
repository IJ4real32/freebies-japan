// ✅ FILE: src/components/DeliveryForm.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const DeliveryForm = ({ request = null, onSubmit, onCancel, existingData = {} }) => {
  const { currentUser } = useAuth();

  const fallbackData = currentUser?.defaultAddress || {};
  const [formData, setFormData] = useState({
    zipCode: existingData.zipCode || fallbackData.zipCode || "",
    address: existingData.address || fallbackData.address || "",
    roomNumber: existingData.roomNumber || fallbackData.roomNumber || "",
    phone: existingData.phone || fallbackData.phone || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Auto-fetch address from zipcloud when ZIP is 7 digits
  useEffect(() => {
    if (formData.zipCode.length === 7 && /^\d+$/.test(formData.zipCode)) {
      const timer = setTimeout(async () => {
        try {
          setLoading(true);
          setError("");
          const res = await axios.get(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formData.zipCode}`
          );

          if (res.data?.results) {
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
          setError("ZIP code lookup failed. Please enter manually.");
        } finally {
          setLoading(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [formData.zipCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Unified submit handler (supports both MyRequests + Payment modal)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.zipCode || !formData.address || !formData.phone) {
      setError("ZIP Code, Address, and Phone are required.");
      return;
    }

    if (formData.zipCode.length !== 7 || !/^\d{7}$/.test(formData.zipCode)) {
      setError("ZIP code must be 7 digits.");
      return;
    }

    if (!/^\d{10,15}$/.test(formData.phone)) {
      setError("Enter a valid phone number (10–15 digits, numbers only).");
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        zipCode: formData.zipCode.trim(),
        address: formData.address.trim(),
        roomNumber: formData.roomNumber?.trim() || null,
        phone: formData.phone.trim(),
        submittedAt: new Date().toISOString(),
      };

      // ✅ Handle both use cases
      if (typeof onSubmit === "function") {
        if (request?.id) {
          await onSubmit(request.id, data); // MyRequests page
        } else {
          await onSubmit(data); // Deposit modal
        }
      }
    } catch (err) {
      console.error("DeliveryForm submission failed:", err);
      setError("Failed to save address. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
            pattern="\d{7}"
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. 1234567"
          />
          {loading && (
            <p className="text-xs text-gray-500 mt-1">
              Looking up address...
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
          placeholder="Tokyo-to, Chiyoda-ku..."
        />
        {suggestions.length > 1 && (
          <div className="mt-1 text-xs">
            <p>Select an address:</p>
            <ul className="border rounded mt-1 divide-y">
              {suggestions.map((item, i) => (
                <li
                  key={i}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      address: `${item.address1} ${item.address2} ${item.address3}`,
                    }))
                  }
                >
                  {item.address1} {item.address2} {item.address3}
                </li>
              ))}
            </ul>
          </div>
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
          placeholder="Room 201"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Address"}
        </button>
      </div>
    </form>
  );
};

export default DeliveryForm;
