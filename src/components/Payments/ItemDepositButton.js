// =============================================================
// ItemDepositButton.jsx (PATCHED v11 — Match parent component props)
// =============================================================

import React, { useState, useEffect } from "react";
import { db, storage } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import toast from "react-hot-toast";

/* ---------------------------------------------------------
 *  NORMALIZE DELIVERY (client-side)
 * --------------------------------------------------------- */
function normalizeClientDelivery(raw) {
  if (!raw) return null;

  if (raw.deliveryInfo?.addressInfo) raw = raw.deliveryInfo.addressInfo;
  if (raw.deliveryInfo) raw = raw.deliveryInfo;
  if (raw.addressInfo) raw = raw.addressInfo;
  if (raw.shippingAddress) raw = raw.shippingAddress;

  return {
    zipCode: raw.zipCode || "",
    address: raw.address || "",
    phone: raw.phone || "",
  };
}

/* ---------------------------------------------------------
 *  MAIN COMPONENT - UPDATED PROPS TO MATCH PARENT
 * --------------------------------------------------------- */
export default function ItemDepositButton({
  itemId,
  title,           // CHANGED: Parent sends 'title' not 'itemTitle'
  amountJPY,       // CHANGED: Parent sends 'amountJPY' not 'itemPriceJPY'
  addressInfo,
  userProfile,
  onSuccess,       // NEW: Parent sends onSuccess callback
}) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [method, setMethod] = useState("bank_transfer");
  const [receiptFile, setReceiptFile] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);

  // Autofill + autosave
  const [deliveryData, setDeliveryData] = useState(
    addressInfo ||
      userProfile?.defaultAddress ||
      JSON.parse(localStorage.getItem("fj_delivery_autosave") || "{}")
  );

  // Save to profile toggle
  const [saveToProfile, setSaveToProfile] = useState(false);

  /* ---------------------------------------------------------
   * AUTOSAVE DELIVERY (localStorage)
   * --------------------------------------------------------- */
  useEffect(() => {
    if (deliveryData) {
      localStorage.setItem("fj_delivery_autosave", JSON.stringify(deliveryData));
    }
  }, [deliveryData]);

  /* ---------------------------------------------------------
   * ZIPCLOUD AUTOFILL — simple format A
   * --------------------------------------------------------- */
  const handleZipLookup = async () => {
    try {
      if (!deliveryData.zipCode || deliveryData.zipCode.length < 7) {
        toast.error("Enter a valid 7-digit ZIP code");
        return;
      }

      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${deliveryData.zipCode}`
      );
      const json = await res.json();

      if (!json.results || json.results.length === 0) {
        toast.error("No address found for this ZIP");
        return;
      }

      const r = json.results[0];
      const fullAddress = `${r.address1}${r.address2}${r.address3}`;

      setDeliveryData({
        ...deliveryData,
        address: fullAddress,
      });

      toast.success("Address autofilled!");
    } catch (e) {
      console.error(e);
      toast.error("ZIP lookup failed");
    }
  };

  /* ---------------------------------------------------------
   * VALIDATE BEFORE CONFIRMATION
   * --------------------------------------------------------- */
  const validateBeforeConfirm = () => {
    if (!currentUser) {
      toast.error("Please sign in first.");
      return;
    }
    if (!itemId) {
      toast.error("Missing item ID");
      return;
    }
    
    // Use the props as they come from parent (title, amountJPY)
    if (!title || title.trim() === "") {
      toast.error("Item title is missing. Please refresh the page.");
      return;
    }
    
    if (!amountJPY || amountJPY <= 0) {
      toast.error("Item price is invalid. Please refresh the page.");
      return;
    }

    const finalDelivery = normalizeClientDelivery(
      deliveryData || addressInfo || userProfile?.defaultAddress
    );

    if (method === "cash_on_delivery") {
      if (!finalDelivery?.address?.trim()) {
        toast.error("Enter a valid delivery address.");
        return;
      }
      if (!finalDelivery?.phone?.trim()) {
        toast.error("Enter a valid phone number.");
        return;
      }
    }

    if (method === "bank_transfer" && !receiptFile) {
      toast.error("Upload bank transfer receipt.");
      return;
    }

    setShowConfirm(true);
  };

  /* ---------------------------------------------------------
   * RECEIPT UPLOAD
   * --------------------------------------------------------- */
  const uploadReceiptIfNeeded = async () => {
    if (!receiptFile) return null;

    return new Promise((resolve, reject) => {
      const path = `paymentReceipts/${currentUser.uid}/${Date.now()}_${receiptFile.name}`;
      const fileRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(fileRef, receiptFile);

      uploadTask.on(
        "state_changed",
        () => {},
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  /* ---------------------------------------------------------
   * FINAL SUBMISSION
   * --------------------------------------------------------- */
  const submitDeposit = async () => {
    try {
      setLoading(true);
      setShowConfirm(false);

      const finalDelivery = normalizeClientDelivery(
        deliveryData || addressInfo || userProfile?.defaultAddress
      );

      // Upload proof
      let receiptUrl = await uploadReceiptIfNeeded();

      // Use props as they come from parent
      const safeItemTitle = title || null;          // CHANGED: Use 'title' not 'itemTitle'
      const safeItemPrice = amountJPY ?? null;      // CHANGED: Use 'amountJPY' not 'itemPriceJPY'

      /* ------------------------------
       * 1) Create main payment record
       * ------------------------------ */
      const paymentRef = await addDoc(collection(db, "payments"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || "User",

        type: "item",
        itemId,
        itemTitle: safeItemTitle,
        itemPriceJPY: safeItemPrice,

        amount: safeItemPrice || 0,
        currency: "JPY",
        method,
        receiptUrl: receiptUrl || null,

        deliveryInfo: finalDelivery || null,

        status: method === "cash_on_delivery"
          ? "pending_cod_confirmation"
          : "pending_deposit",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const paymentId = paymentRef.id;

      /* ------------------------------
       * 2) Write deliveryDetails
       * ------------------------------ */
      await addDoc(collection(db, "deliveryDetails"), {
        userId: currentUser.uid,
        paymentId,
        itemId,
        addressInfo: finalDelivery,
        createdAt: serverTimestamp(),
      });

      /* ------------------------------
       * 3) Save to profile (toggle ON)
       * ------------------------------ */
      if (saveToProfile) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          { defaultAddress: finalDelivery, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }

      toast.success("Deposit submitted successfully!");
      
      // Call onSuccess callback if provided by parent
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err) {
      console.error("Deposit submit error:", err);
      toast.error(err.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
   * UI COMPONENT - Updated to use correct prop names
   * --------------------------------------------------------- */
  return (
    <div className="w-full space-y-4">

      {/* PAYMENT METHOD SWITCH */}
      <div className="flex gap-3">
        <button
          onClick={() => setMethod("bank_transfer")}
          className={`flex-1 p-3 rounded-xl border-2 text-center font-semibold transition
            ${
              method === "bank_transfer"
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-gray-100 text-gray-800 border-gray-300"
            }`}
        >
          Bank Transfer
        </button>

        <button
          onClick={() => setMethod("cash_on_delivery")}
          className={`flex-1 p-3 rounded-xl border-2 text-center font-semibold transition
            ${
              method === "cash_on_delivery"
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-gray-100 text-gray-800 border-gray-300"
            }`}
        >
          Cash on Delivery
        </button>
      </div>

      {/* BANK TRANSFER RECEIPT */}
      {method === "bank_transfer" && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <label className="font-medium text-gray-800">Upload Receipt</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReceiptFile(e.target.files[0])}
            className="w-full p-3 border border-gray-300 rounded-lg mt-2 bg-gray-50 text-gray-900"
          />
        </div>
      )}

      {/* COD FIELDS */}
      {method === "cash_on_delivery" && (
        <div className="space-y-4">

          {/* ZIP */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <label className="font-medium text-gray-800">ZIP Code</label>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={deliveryData.zipCode || ""}
                onChange={(e) =>
                  setDeliveryData({ ...deliveryData, zipCode: e.target.value })
                }
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                placeholder="1234567"
                maxLength={7}
              />
              <button
                onClick={handleZipLookup}
                className="px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Autofill
              </button>
            </div>
          </div>

          {/* ADDRESS */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <label className="font-medium text-gray-800">Address</label>
            <input
              type="text"
              value={deliveryData.address || ""}
              onChange={(e) =>
                setDeliveryData({ ...deliveryData, address: e.target.value })
              }
              className="w-full p-3 border border-gray-300 rounded-lg mt-2 bg-gray-50 text-gray-900"
              placeholder="Full delivery address"
            />
          </div>

          {/* PHONE */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <label className="font-medium text-gray-800">Phone Number</label>
            <input
              type="text"
              value={deliveryData.phone || ""}
              onChange={(e) =>
                setDeliveryData({ ...deliveryData, phone: e.target.value })
              }
              className="w-full p-3 border border-gray-300 rounded-lg mt-2 bg-gray-50 text-gray-900"
              placeholder="Phone number"
            />
          </div>

          {/* SAVE TO PROFILE TOGGLE */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-800">Save as default address</span>
                <p className="text-sm text-gray-600 mt-1">
                  Use this address automatically for future deliveries
                </p>
              </div>

              <label className="relative inline-block w-12 h-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToProfile}
                  onChange={() => setSaveToProfile(!saveToProfile)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full peer-checked:bg-indigo-600 transition"></span>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-6"></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        disabled={loading}
        onClick={validateBeforeConfirm}
        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
      >
        {loading ? "Processing..." : "Submit Deposit"}
      </button>

      {/* ---------------------------------------------------------
       * CONFIRMATION MODAL - Updated to use correct prop names
       * --------------------------------------------------------- */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[90%] max-w-md space-y-6 shadow-xl">

            <h2 className="text-xl font-bold text-center text-gray-900">
              Confirm Your Deposit
            </h2>

            {/* ITEM DETAILS - Using props from parent */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">Item:</span>
                <span className="font-semibold text-gray-900 text-right max-w-[60%] break-words">
                  {title || "Unknown Item"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">Amount:</span>
                <span className="font-bold text-indigo-700">
                  ¥{(amountJPY || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">Payment Method:</span>
                <span className="font-medium text-gray-900">
                  {method === "cash_on_delivery" ? "Cash on Delivery" : "Bank Transfer"}
                </span>
              </div>
            </div>

            {/* DELIVERY ADDRESS DETAILS (only for COD) */}
            {method === "cash_on_delivery" && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Delivery Address</h3>
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-800">ZIP Code:</span>
                  <span className="text-gray-900">{deliveryData.zipCode || "Not provided"}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-800">Address:</span>
                  <span className="text-gray-900 text-right max-w-[60%]">{deliveryData.address || "Not provided"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">Phone:</span>
                  <span className="text-gray-900">{deliveryData.phone || "Not provided"}</span>
                </div>
              </div>
            )}

            {/* RECEIPT PREVIEW (only for bank transfer) */}
            {method === "bank_transfer" && receiptFile && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Receipt Preview</h3>
                <img
                  src={URL.createObjectURL(receiptFile)}
                  className="w-full rounded-lg border border-gray-300"
                  alt="Receipt preview"
                />
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 p-3 rounded-xl border-2 bg-gray-100 text-gray-800 border-gray-300 font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>

              <button
                onClick={submitDeposit}
                disabled={!itemId || !title || !amountJPY}
                className={`flex-1 p-3 rounded-xl border-2 font-semibold transition
                  ${!itemId || !title || !amountJPY
                    ? "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
                  }`}
              >
                {!itemId || !title || !amountJPY ? "Missing Item Info" : "Confirm"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}