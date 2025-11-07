import React, { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { createDeposit } from "../../services/functionsApi";

/**
 * Appears when user exhausts free trial requests.
 * Requires proof-of-payment upload before submitting.
 */
export default function SubscriptionModal({ open, onClose }) {
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receipt) {
      toast.error("Please upload your bank transfer receipt.");
      return;
    }
    try {
      setLoading(true);
      await createDeposit({
        amount: 1500,
        method: "bank_transfer",
        receiptUrl: receipt,
        note: message || "",
      });
      toast.success("Deposit submitted! We’ll verify and notify you.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to submit deposit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 relative shadow-xl animate-slideUp">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-sm"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold text-center text-gray-800 mb-1">
          ❤️ Support Freebies Japan
        </h2>
        <p className="text-sm text-center text-gray-600 mb-4">
          You’ve used your 5 free trial requests.<br />
          To continue requesting items, please make a one-time deposit of{" "}
          <b>¥1,500</b>.
        </p>

        {/* Deposit Instructions */}
        <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg mb-4 text-sm">
          <p className="font-medium mb-1">💳 Bank Transfer Instructions:</p>
          <p>Bank: MUFG</p>
          <p>Account Name: Freebies Japan</p>
          <p>Account Number: 1234567</p>
          <p>Include your registered email in the transfer note.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Leave a short note (optional)"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Proof of Deposit (required)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceipt(e.target.files[0])}
              required
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-1.5 file:px-3
                file:rounded-md file:border-0 file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Deposit Request"}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-3">
          Your deposit will be reviewed by an admin within 24 hours.
        </p>
      </div>
    </div>
  );
}

/* simple fade animations */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {from{opacity:0;}to{opacity:1;}}
@keyframes slideUp {from{transform:translateY(40px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.animate-fadeIn {animation: fadeIn .25s ease-out;}
.animate-slideUp {animation: slideUp .3s ease-out;}
`;
document.head.appendChild(style);
