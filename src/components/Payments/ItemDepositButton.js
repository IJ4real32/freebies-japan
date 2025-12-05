// =============================================================
// ItemDepositButton.jsx (FINAL v10 — ZipCloud + Save Profile)
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
 *  MAIN COMPONENT
 * --------------------------------------------------------- */
export default function ItemDepositButton({
  itemId,
  itemTitle,
  itemPriceJPY,
  addressInfo,
  userProfile,
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

      // Safe fields
      const safeItemTitle = itemTitle || null;
      const safeItemPrice = itemPriceJPY ?? null;

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
    } catch (err) {
      console.error("Deposit submit error:", err);
      toast.error(err.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
   * UI COMPONENT
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
                ? "bg-green-600 text-white border-green-700"
                : "bg-gray-300 text-black border-gray-500"
            }`}
        >
          Bank Transfer
        </button>

        <button
          onClick={() => setMethod("cash_on_delivery")}
          className={`flex-1 p-3 rounded-xl border-2 text-center font-semibold transition
            ${
              method === "cash_on_delivery"
                ? "bg-green-600 text-white border-green-700"
                : "bg-gray-300 text-black border-gray-500"
            }`}
        >
          Cash on Delivery
        </button>
      </div>

      {/* BANK TRANSFER RECEIPT */}
      {method === "bank_transfer" && (
        <div>
          <label className="font-medium">Upload Receipt</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReceiptFile(e.target.files[0])}
            className="w-full p-2 border rounded-lg mt-1"
          />
        </div>
      )}

      {/* COD FIELDS */}
      {method === "cash_on_delivery" && (
        <div className="space-y-4">

          {/* ZIP */}
          <div>
            <label className="font-medium">ZIP Code</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={deliveryData.zipCode || ""}
                onChange={(e) =>
                  setDeliveryData({ ...deliveryData, zipCode: e.target.value })
                }
                className="flex-1 p-2 border rounded-lg"
                placeholder="1234567"
                maxLength={7}
              />
              <button
                onClick={handleZipLookup}
                className="px-3 py-2 bg-green-600 text-white rounded-lg"
              >
                Autofill
              </button>
            </div>
          </div>

          {/* ADDRESS */}
          <div>
            <label className="font-medium">Address</label>
            <input
              type="text"
              value={deliveryData.address || ""}
              onChange={(e) =>
                setDeliveryData({ ...deliveryData, address: e.target.value })
              }
              className="w-full p-2 border rounded-lg mt-1"
              placeholder="Full delivery address"
            />
          </div>

          {/* PHONE */}
          <div>
            <label className="font-medium">Phone Number</label>
            <input
              type="text"
              value={deliveryData.phone || ""}
              onChange={(e) =>
                setDeliveryData({ ...deliveryData, phone: e.target.value })
              }
              className="w-full p-2 border rounded-lg mt-1"
              placeholder="Phone number"
            />
          </div>

          {/* SAVE TO PROFILE TOGGLE */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-medium">Save to profile</span>

            <label className="relative inline-block w-12 h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={() => setSaveToProfile(!saveToProfile)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 bg-gray-300 rounded-full peer-checked:bg-green-600 transition"></span>
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-6"></span>
            </label>
          </div>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        disabled={loading}
        onClick={validateBeforeConfirm}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold"
      >
        {loading ? "Processing..." : "Submit Deposit"}
      </button>

      {/* ---------------------------------------------------------
       * CONFIRMATION MODAL
       * --------------------------------------------------------- */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[90%] max-w-md space-y-4 shadow-xl">

            <h2 className="text-lg font-bold text-center">
              Confirm Your Deposit
            </h2>

            <div className="space-y-1 text-sm">
              <p><strong>Item:</strong> {itemTitle}</p>
              <p><strong>Amount:</strong> ¥{itemPriceJPY?.toLocaleString()}</p>
              <p><strong>Method:</strong> {method === "cash_on_delivery" ? "Cash on Delivery" : "Bank Transfer"}</p>
            </div>

            {method === "cash_on_delivery" && (
              <div className="text-sm space-y-1">
                <p><strong>ZIP:</strong> {deliveryData.zipCode}</p>
                <p><strong>Address:</strong> {deliveryData.address}</p>
                <p><strong>Phone:</strong> {deliveryData.phone}</p>
              </div>
            )}

            {method === "bank_transfer" && receiptFile && (
              <div>
                <strong>Receipt Preview:</strong>
                <img
                  src={URL.createObjectURL(receiptFile)}
                  className="w-full mt-2 rounded-lg border"
                />
              </div>
            )}

            {/* ACTION BUTTONS (same UI as toggle buttons) */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 p-3 rounded-xl border-2 bg-gray-300 text-black border-gray-500 font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={submitDeposit}
                className="flex-1 p-3 rounded-xl border-2 bg-green-600 text-white border-green-700 font-semibold"
              >
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
