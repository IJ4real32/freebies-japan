import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import BackToDashboardButton from "../components/Admin/BackToDashboardButton";
import toast from "react-hot-toast";
import { checkAdminStatus } from "../utils/adminUtils";



export default function DepositInstructions() {
  const location = useLocation();
  const navigate = useNavigate();
  const { donationId } = location.state || {};

  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [admin, setAdmin] = useState(false);

  const storage = getStorage();

  const bankInfo = {
    bankName: "Japan Post Bank (ゆうちょ銀行)",
    branchName: "018 店 (ゼロイチハチ)",
    accountType: "Savings (普通)",
    accountNumber: "1234567",
    accountHolder: "Freebies Japan",
  };

  // 🔹 Detect admin + load donation
  useEffect(() => {
    (async () => setAdmin(await checkAdminStatus()))();

    if (!donationId) {
      setError("Donation ID missing.");
      setLoading(false);
      return;
    }

    const refDoc = doc(db, "moneyDonations", donationId);
    const unsub = onSnapshot(
      refDoc,
      (snap) => {
        if (!snap.exists()) {
          setError("Donation record not found.");
          setLoading(false);
          return;
        }
        setDonation({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      (err) => {
        console.error("Donation load error:", err);
        setError("Failed to load donation details.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [donationId]);

  // 🔹 File upload helper
  const handleFileUpload = async () => {
    if (!file) return null;
    return new Promise((resolve, reject) => {
      const path = `moneyDonations/${donationId}/receipt_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  // 🔹 Confirm payment
  const handleConfirmPayment = async () => {
    if (!donationId) return;
    try {
      setConfirming(true);
      toast.loading("Submitting your payment confirmation…", { id: "confirm" });

      let proofUrl = donation?.proofUrl || null;
      if (file) proofUrl = await handleFileUpload();

      const callable = httpsCallable(functions, "reportMoneyDonation_User");
      const res = await callable({ donationId, proofUrl });

      toast.dismiss("confirm");
      if (res?.data?.ok) {
        toast.success("✅ Donation reported successfully!");
      } else {
        toast.success("Donation reported — awaiting verification.");
      }

      setTimeout(() => navigate("/myrequests"), 1000);
    } catch (err) {
      console.error("Confirm payment error:", err);
      toast.dismiss("confirm");
      toast.error("❌ Failed to confirm donation. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-600">
        Loading donation details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link
          to="/donate"
          className="text-indigo-600 underline hover:text-indigo-700"
        >
          Go back to Donations
        </Link>
      </div>
    );
  }

  if (!donation) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-16 px-4 sm:px-6">
      <main className="max-w-2xl mx-auto">
        {admin && (
          <div className="mb-5">
            <BackToDashboardButton />
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Bank Transfer Instructions
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200">
          <p className="mb-4">
            Thank you for supporting{" "}
            <strong className="text-indigo-600">Freebies Japan</strong>! Please
            complete your donation of{" "}
            <strong>
              ¥{donation.amountJPY?.toLocaleString() || "—"}
            </strong>{" "}
            using the bank details below.
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-1">
            <p>
              <strong>🏦 Bank:</strong> {bankInfo.bankName}
            </p>
            <p>
              <strong>🏢 Branch:</strong> {bankInfo.branchName}
            </p>
            <p>
              <strong>💳 Type:</strong> {bankInfo.accountType}
            </p>
            <p>
              <strong>🔢 Account:</strong> {bankInfo.accountNumber}
            </p>
            <p>
              <strong>👤 Holder:</strong> {bankInfo.accountHolder}
            </p>
          </div>

          {donation.status === "pending" && (
            <>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Upload Receipt (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {file && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <button
                onClick={handleConfirmPayment}
                disabled={confirming}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-full shadow transition disabled:opacity-50"
              >
                {confirming ? "Processing…" : "I’ve Sent the Payment"}
              </button>
            </>
          )}

          <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-xs">
            💚 Your donation keeps Freebies Japan running for everyone.
          </div>
        </div>
      </main>
    </div>
  );
}
