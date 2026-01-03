import React, { useEffect, useRef, useState } from "react";
import { storage, functions } from "../../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import toast from "react-hot-toast";

export default function DonationModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [donationId, setDonationId] = useState(null);
  const modalRef = useRef();

  // Bank details
  const bankInfo = {
    bankName: "Japan Post Bank (ゆうちょ銀行)",
    branchName: "018 店 (ゼロイチハチ)",
    accountType: "Savings (普通)",
    accountNumber: "1234567",
    accountHolder: "Freebies Japan",
  };

  /* --------------------------------------------------
   * Prevent background scroll
   * -------------------------------------------------- */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  /* --------------------------------------------------
   * Close on ESC
   * -------------------------------------------------- */
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  /* ---------------------- helpers ---------------------- */
  const createDonationRecord = async () => {
    const callable = httpsCallable(functions, "createMoneyDonation");
    const res = await callable({
      amountJPY: 1500,
      message: "Subscription access payment",
    });
    if (res?.data?.donationId) {
      setDonationId(res.data.donationId);
      return res.data.donationId;
    }
    throw new Error("Failed to create subscription record");
  };

  const uploadProof = async (file, id) => {
    const path = `moneyDonations/${id}/receipt_${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snap) =>
          setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        (err) => reject(err),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload your transfer receipt.");
      return;
    }
    try {
      setUploading(true);
      toast.loading("Uploading receipt…", { id: "subscribe" });

      const id = donationId || (await createDonationRecord());
      const proofUrl = await uploadProof(file, id);

      toast.loading("Submitting subscription…", { id: "subscribe" });
      const callable = httpsCallable(functions, "reportMoneyDonation_User");
      const res = await callable({ donationId: id, proofUrl });

      toast.dismiss("subscribe");

      if (res?.data?.ok) {
        toast.success("✅ Subscription submitted successfully!");
      } else {
        toast("Subscription submitted — pending verification.", {
          icon: "🧾",
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.dismiss("subscribe");
      toast.error(err.message || "Failed to submit subscription.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------------- UI ---------------------- */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 transform animate-scaleIn"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 text-center">
          🔓 Subscription via Bank Transfer
        </h2>

        <p className="text-sm text-gray-700 mb-4 text-center">
          Transfer <strong>¥1,500</strong> to activate subscription access on{" "}
          <b>Freebies Japan</b>, then upload your payment receipt below.
        </p>

        <div className="bg-white/90 border border-gray-300 rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">
            🏦 Bank Transfer Details
          </h3>
          <div className="space-y-1 text-sm text-gray-800 leading-relaxed">
            <p><b>🏦 Bank:</b> {bankInfo.bankName}</p>
            <p><b>🏢 Branch:</b> {bankInfo.branchName}</p>
            <p><b>💳 Type:</b> {bankInfo.accountType}</p>
            <p><b>🔢 Account:</b> {bankInfo.accountNumber}</p>
            <p><b>👤 Holder:</b> {bankInfo.accountHolder}</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Payment Receipt <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        />

        {file && (
          <p className="text-xs text-gray-500 mb-2 truncate">
            Selected: {file.name}
          </p>
        )}

        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex justify-between gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? "Submitting…" : "Subscribe"}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
        @keyframes scaleIn {
          from {transform:scale(0.95); opacity:0;}
          to {transform:scale(1); opacity:1;}
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
