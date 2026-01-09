// =============================================================
// ItemDepositButton.jsx - WITH FIXED RECEIPT PREVIEW
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
  getDoc
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
 *  MAIN COMPONENT - FETCHES donorId FROM ITEM
 * --------------------------------------------------------- */
export default function ItemDepositButton({
  itemId,
  title,
  amountJPY,
  addressInfo,
  userProfile,
  onSuccess,
}) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState(null);
  const [fetching, setFetching] = useState(false);

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
   * FETCH ITEM DATA TO GET donorId
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchItemData = async () => {
      if (!itemId) return;
      
      setFetching(true);
      try {
        const itemDoc = await getDoc(doc(db, "donations", itemId));
        if (itemDoc.exists()) {
          const data = itemDoc.data();
          setItemData({
            id: itemDoc.id,
            ...data,
            // Use donorId as ownerId/sellerId
            ownerId: data.donorId,
            sellerId: data.donorId
          });
        } else {
          toast.error("Item not found");
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        toast.error("Failed to load item details");
      } finally {
        setFetching(false);
      }
    };

    fetchItemData();
  }, [itemId]);

  /* ---------------------------------------------------------
   * AUTOSAVE DELIVERY (localStorage)
   * --------------------------------------------------------- */
  useEffect(() => {
    if (deliveryData) {
      localStorage.setItem("fj_delivery_autosave", JSON.stringify(deliveryData));
    }
  }, [deliveryData]);

  /* ---------------------------------------------------------
   * ZIPCLOUD AUTOFILL
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
    
    if (fetching) {
      toast.error("Still loading item details...");
      return;
    }
    
    if (!itemData) {
      toast.error("Item details not loaded");
      return;
    }
    
    // Check if we have donorId
    if (!itemData.donorId) {
      toast.error("Unable to process payment: Seller information is missing.");
      return;
    }
    
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
   * FINAL SUBMISSION - PRODUCTION VERSION
   * --------------------------------------------------------- */
  const submitDeposit = async () => {
    try {
      setLoading(true);
      setShowConfirm(false);

      // Double-check donorId before proceeding
      if (!itemData?.donorId) {
        throw new Error("Seller information is required but not found.");
      }

      const finalDelivery = normalizeClientDelivery(
        deliveryData || addressInfo || userProfile?.defaultAddress
      );

      // Upload proof
      let receiptUrl = await uploadReceiptIfNeeded();

      // Use props as they come from parent
      const safeItemTitle = title || null;
      const safeItemPrice = amountJPY ?? null;

      /* ------------------------------
       * 1) Create main payment record
       * ------------------------------ */
      const paymentData = {
        // Use donorId as ownerId/sellerId for Firestore rules
        userId: currentUser.uid,
        buyerId: currentUser.uid,
        ownerId: itemData.donorId,
        sellerId: itemData.donorId,
        
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
      };

      const paymentRef = await addDoc(collection(db, "payments"), paymentData);
      const paymentId = paymentRef.id;

      /* ------------------------------
       * 2) Write deliveryDetails (optional - can fail silently)
       * ------------------------------ */
      if (finalDelivery && finalDelivery.address && finalDelivery.phone) {
        try {
          await addDoc(collection(db, "deliveryDetails"), {
            userId: currentUser.uid,
            paymentId,
            itemId,
            addressInfo: finalDelivery,
            createdAt: serverTimestamp(),
          });
        } catch (deliveryError) {
          // Silent fail - delivery info is already in payment document
        }
      }

      /* ------------------------------
       * 3) Save to profile (toggle ON)
       * ------------------------------ */
      if (saveToProfile && finalDelivery) {
        try {
          // Save to localStorage as fallback if Firestore write fails
          localStorage.setItem("fj_default_delivery", JSON.stringify(finalDelivery));
          
          // Optional: Try to save to Firestore user profile
          await setDoc(
            doc(db, "users", currentUser.uid),
            { defaultAddress: finalDelivery, updatedAt: serverTimestamp() },
            { merge: true }
          );
        } catch (profileError) {
          // Silent fail - address saved to localStorage as backup
        }
      }

      toast.success("Deposit submitted successfully!");
      
      // Call onSuccess callback if provided by parent
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err) {
      console.error("Deposit submit error:", err);
      
      // User-friendly error messages
      if (err.code === 'invalid-argument') {
        if (err.message.includes('ownerId')) {
          toast.error("Payment failed: Missing seller information. Please contact support.");
        } else {
          toast.error("Invalid payment data. Please check your information and try again.");
        }
      } else if (err.code === 'permission-denied') {
        toast.error("Permission denied. Please ensure you're logged in and try again.");
      } else {
        toast.error(err.message || "Submission failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
   * RENDER WITH LOADING STATES
   * --------------------------------------------------------- */
  if (fetching) {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-600 mt-2">Loading item details...</p>
      </div>
    );
  }

  if (!itemData) {
    return (
      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error: Could not load item details</p>
        <p className="text-red-600 text-sm mt-1">Please try again or contact support</p>
      </div>
    );
  }

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
          {receiptFile && (
            <p className="text-sm text-green-600 mt-2">
              ✓ File selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
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
        disabled={loading || !itemData?.donorId}
        onClick={validateBeforeConfirm}
        className={`w-full py-4 rounded-xl font-semibold transition ${
          loading || !itemData?.donorId
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {loading ? "Processing..." : 
         !itemData?.donorId ? "Missing Seller Info" : "Submit Deposit"}
      </button>

      {/* ---------------------------------------------------------
       * CONFIRMATION MODAL
       * --------------------------------------------------------- */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold text-center text-gray-900">
              Confirm Your Deposit
            </h2>

            {/* ITEM DETAILS */}
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

            {/* FIXED RECEIPT PREVIEW (only for bank transfer) */}
            {method === "bank_transfer" && receiptFile && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900">Receipt Preview</h3>
                  <button
                    onClick={() => setReceiptFile(null)}
                    className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="flex flex-col items-center">
                  {/* Small preview image */}
                  <div className="relative w-full max-w-[280px] h-[140px] bg-white rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden">
                    <img
                      src={URL.createObjectURL(receiptFile)}
                      className="max-h-[130px] max-w-full object-contain"
                      alt="Receipt preview"
                      onLoad={(e) => {
                        const img = e.target;
                        // Auto-scale based on orientation
                        const isVertical = img.naturalHeight > img.naturalWidth;
                        if (isVertical) {
                          img.style.maxHeight = '130px';
                          img.style.maxWidth = 'auto';
                        } else {
                          img.style.maxHeight = '120px';
                          img.style.maxWidth = '260px';
                        }
                      }}
                    />
                  </div>
                  
                  {/* File info */}
                  <div className="mt-2 text-center">
                    <div className="text-xs text-gray-700 font-medium truncate max-w-[250px]">
                      {receiptFile.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(receiptFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                
                {/* Success message */}
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 text-center">
                  ✓ Receipt uploaded successfully
                </div>
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
                disabled={!itemId || !title || !amountJPY || !itemData?.donorId}
                className={`flex-1 p-3 rounded-xl border-2 font-semibold transition
                  ${!itemId || !title || !amountJPY || !itemData?.donorId
                    ? "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
                  }`}
              >
                {!itemId || !title || !amountJPY ? "Missing Item Info" : 
                 !itemData?.donorId ? "Missing Seller Info" : "Confirm"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}