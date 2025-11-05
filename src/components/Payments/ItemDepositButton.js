// ✅ FILE: src/components/Payments/ItemDepositButton.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import toast from "react-hot-toast";

export default function ItemDepositButton({ itemId, title, amountJPY }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("bank_transfer");
  const [hasAddress, setHasAddress] = useState(false);
  const [addressInfo, setAddressInfo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------
   * Load user’s latest approved delivery info
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
    if (!/^image\//.test(f.type)) return toast.error("Only image files allowed.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Max file size 5MB.");
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
   * Handle Deposit Submission
   * ------------------------------------------------------------------ */
  const handleSubmit = async (deliveryData = null) => {
    try {
      setLoading(true);
      if (!currentUser) throw new Error("Please sign in first.");
      if (!itemId) throw new Error("Missing item ID.");

      if (method === "bank_transfer" && !receiptFile)
        throw new Error("Please upload a transfer receipt.");
      if (method === "cash_on_delivery" && !(deliveryData || addressInfo))
        throw new Error("Delivery address required.");

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
        toast.success(
          `Deposit created successfully (${method === "cash_on_delivery" ? "COD" : "Bank Transfer"})`
        );
        resetModal();
        navigate("/my-activity?tab=premium"); // ✅ Redirect to My Activity premium tab
      } else throw new Error("Failed to create payment record.");
    } catch (err) {
      console.error("Deposit error:", err);
      toast.error(err?.message || "Failed to create deposit.");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setShowForm(false);
    setReceiptFile(null);
    setOpen(false);
    setLoading(false);
  };

  /* ------------------------------------------------------------------
   * UI RENDER
   * ------------------------------------------------------------------ */
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition"
      >
        Pay by Deposit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto relative p-6 sm:p-8 transition-all duration-300 ease-in-out">
            {/* ❌ Close */}
            <button
              onClick={resetModal}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
            >
              ×
            </button>

            {/* 🔹 Step Progress */}
            <div className="flex justify-center items-center gap-2 mb-5">
              {[1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    (method === "cash_on_delivery" && i === 1 && step === 2) ||
                    step === i
                      ? "bg-indigo-600 scale-110"
                      : "bg-gray-300"
                  }`}
                ></span>
              ))}
            </div>

            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800">
                {method === "bank_transfer"
                  ? step === 1
                    ? "Bank Transfer Instructions"
                    : "Delivery Information"
                  : "Delivery Information"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {method === "bank_transfer"
                  ? `Step ${step} of 2`
                  : "Cash on Delivery"}
              </p>
            </div>

            {/* Step 1: Select Payment Method */}
            {step === 1 && (
              <div className="space-y-4 mb-6 animate-slideUp">
                <div className="space-y-3">
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
                      onChange={(e) => {
                        setMethod(e.target.value);
                        setStep(2); // skip instructions for COD
                      }}
                    />
                    <span className="text-gray-700 font-medium">💵 Cash on Delivery</span>
                  </label>
                </div>

                {/* Bank Transfer Instructions */}
                {method === "bank_transfer" && (
                  <div className="space-y-4 text-gray-700 leading-relaxed animate-fadeIn">
                    <p>
                      Please transfer <strong>¥{amountJPY?.toLocaleString()}</strong> to:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p><strong>Account Name:</strong> Freebies Japan K.K.</p>
                      <p><strong>Bank:</strong> MUFG Bank, Misato Branch</p>
                      <p><strong>Account No:</strong> 1234567</p>
                      <p><strong>Type:</strong> Ordinary (普通)</p>
                    </div>
                    <p className="text-sm text-gray-600">
                      After sending your transfer, click <strong>Next</strong> to upload your
                      receipt and provide delivery info.
                    </p>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    onClick={resetModal}
                    disabled={loading}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Delivery Info + Upload */}
            {step === 2 && (
              <div className="animate-slideUp">
                {hasAddress && !showForm ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
                    <h4 className="font-semibold text-gray-700 mb-1">
                      Delivery Address
                    </h4>
                    <p>{addressInfo.address}</p>
                    {addressInfo.roomNumber && <p>Room: {addressInfo.roomNumber}</p>}
                    <p>📞 {addressInfo.phone}</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="text-indigo-600 text-sm underline font-medium mt-2"
                    >
                      Use different address
                    </button>
                  </div>
                ) : (
                  <DeliveryForm
                    request={{ id: itemId }}
                    onSubmit={(addr) => handleSubmit(addr)}
                    onCancel={() => setShowForm(false)}
                    existingData={addressInfo || {}}
                  />
                )}

                {/* Receipt Upload */}
                <div className="mb-5">
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

                <div className="flex justify-between items-center mt-6">
                  {method === "bank_transfer" ? (
                    <button
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      ← Previous
                    </button>
                  ) : (
                    <div></div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={resetModal}
                      disabled={loading}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmit()}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {loading ? "Submitting…" : "Submit Deposit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* -----------------------------
   Animations for smoother flow
----------------------------- */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-fadeIn { animation: fadeIn 0.25s ease-out; }
.animate-slideUp { animation: slideUp 0.35s ease-out; }
`;
document.head.appendChild(style);
