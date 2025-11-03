// ✅ FILE: src/components/Payments/ItemDepositButton.js
import React, { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { createDeposit } from "../../services/functionsApi";
import DeliveryForm from "../DeliveryForm";

export default function ItemDepositButton({ itemId, title, amountJPY }) {
  const { currentUser } = useAuth();

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("bank_transfer");
  const [hasAddress, setHasAddress] = useState(false);
  const [addressInfo, setAddressInfo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------
   * Load user’s existing address from latest approved request
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchAddress = async () => {
      if (!currentUser?.uid) return;
      try {
        const q = query(
          collection(db, "requests"),
          where("userId", "==", currentUser.uid),
          where("status", "in", ["approved", "selected"]),
          orderBy("updatedAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data.deliveryInfo) {
            setHasAddress(true);
            setAddressInfo(data.deliveryInfo);
            return;
          }
        }
        setHasAddress(false);
      } catch (err) {
        console.error("Error fetching address:", err);
      }
    };
    fetchAddress();
  }, [currentUser?.uid]);

  /* ------------------------------------------------------------------
   * File Upload Logic
   * ------------------------------------------------------------------ */
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      alert("Please upload an image file (JPEG/PNG).");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB.");
      return;
    }
    setReceiptFile(f);
  };

  const uploadReceipt = async (paymentId) => {
    if (!receiptFile) return null;
    const path = `payments/${paymentId}/${Date.now()}_${receiptFile.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, receiptFile, { contentType: receiptFile.type });
    return await getDownloadURL(fileRef);
  };

  /* ------------------------------------------------------------------
   * Submit Deposit
   * ------------------------------------------------------------------ */
  const handleSubmit = async (deliveryData = null) => {
    try {
      setLoading(true);
      if (!currentUser) throw new Error("Please sign in first.");
      if (!itemId) throw new Error("Missing item ID.");

      if (method === "bank_transfer" && !receiptFile)
        throw new Error("Please upload a receipt for bank transfer.");
      if (method === "cash_on_delivery" && !(deliveryData || addressInfo))
        throw new Error("Delivery address required for Cash on Delivery.");

      const payload = {
        itemId,
        amount: amountJPY,
        method,
        deliveryInfo: deliveryData || addressInfo || null,
      };

      if (receiptFile) {
        const receiptUrl = await uploadReceipt("temp");
        payload.receiptUrl = receiptUrl;
      }

      const res = await createDeposit(payload);
      if (res?.paymentId) {
        alert(
          `Payment created successfully!\n\nPayment ID: ${res.paymentId}\nMethod: ${
            method === "cash_on_delivery" ? "Cash on Delivery" : "Bank Transfer"
          }`
        );
        setOpen(false);
      } else {
        throw new Error("Failed to create payment record.");
      }
    } catch (err) {
      console.error("Deposit error:", err);
      alert(err?.message || "Failed to create deposit.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------ */
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium"
      >
        Pay by Deposit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto relative p-6 sm:p-8"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
            >
              ×
            </button>

            <h3 className="text-xl sm:text-2xl font-semibold mb-5 text-gray-800 text-center">
              Select Payment Method
            </h3>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="bank_transfer"
                  checked={method === "bank_transfer"}
                  onChange={(e) => setMethod(e.target.value)}
                />
                <span className="text-gray-700 font-medium">🏦 Bank Transfer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="cash_on_delivery"
                  checked={method === "cash_on_delivery"}
                  onChange={(e) => setMethod(e.target.value)}
                />
                <span className="text-gray-700 font-medium">
                  💵 Cash on Delivery
                </span>
              </label>
            </div>

            {/* Delivery Info Section */}
            <div className="mb-6">
              {hasAddress && !showForm ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-1">
                    Delivery Address
                  </h4>
                  <p>{addressInfo.address}</p>
                  {addressInfo.roomNumber && (
                    <p>Room: {addressInfo.roomNumber}</p>
                  )}
                  <p>📞 {addressInfo.phone}</p>
                  <div className="flex justify-between mt-3">
                    <button
                      onClick={() => handleSubmit()}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? "Processing…" : "Confirm & Pay"}
                    </button>
                    <button
                      onClick={() => setShowForm(true)}
                      className="text-indigo-600 text-sm underline font-medium"
                    >
                      Use different address
                    </button>
                  </div>
                </div>
              ) : (
                <DeliveryForm
                  request={{ id: itemId }}
                  onSubmit={(addr) => handleSubmit(addr)}
                  onCancel={() => setShowForm(false)}
                  existingData={addressInfo || {}}
                />
              )}
            </div>

            {/* Receipt Upload Section */}
            {!showForm && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {method === "bank_transfer"
                    ? "Upload Transfer Receipt *"
                    : "Upload Delivery Proof (optional)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required={method === "bank_transfer"}
                />
                {receiptFile && (
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    {receiptFile.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
