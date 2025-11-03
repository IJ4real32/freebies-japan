// ✅ FILE: src/pages/DonateMoney.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/UI/Navbar";
import toast from "react-hot-toast";

/**
 * 💰 DonateMoney.js
 * For users to make one-time ¥1,500 donations
 * - Creates record in Firestore -> moneyDonations
 * - User can upload optional proof image or message
 * - Admin later verifies in AdminMoneyDonations.js
 */
export default function DonateMoney() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [proofFile, setProofFile] = useState(null);

  const DONATION_AMOUNT = 1500;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) setProofFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error("🔑 Please log in to donate.");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      let proofUrl = null;

      // ✅ Optional: upload proof image to Firebase Storage
      if (proofFile) {
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import(
          "firebase/storage"
        );
        const storage = getStorage();
        const proofRef = ref(
          storage,
          `moneyDonations/${currentUser.uid}_${Date.now()}_${proofFile.name}`
        );
        await uploadBytes(proofRef, proofFile);
        proofUrl = await getDownloadURL(proofRef);
      }

      // ✅ Determine user display name reliably
      let userName = currentUser.displayName?.trim() || "";

      // Try to fetch from users collection if empty
      if (!userName) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            userName =
              data.username?.trim() ||
              data.name?.trim() ||
              (currentUser.email ? currentUser.email.split("@")[0] : "Anonymous");
          } else {
            userName = currentUser.email
              ? currentUser.email.split("@")[0]
              : "Anonymous";
          }
        } catch (err) {
          console.warn("⚠️ Could not fetch user profile for name:", err);
          userName = currentUser.email
            ? currentUser.email.split("@")[0]
            : "Anonymous";
        }
      }

      // ✅ Safe payload (no undefined fields)
      const donationData = {
        userId: currentUser.uid,
        userName: userName || "Anonymous",
        userEmail: currentUser.email || null,
        amountJPY: DONATION_AMOUNT,
        message: (message ?? "").trim() || null,
        proofUrl: proofUrl || null,
        status: "reported", // aligns with AdminMoneyDonations.js
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "moneyDonations"), donationData);

      toast.success(
        "💝 Thank you! Your donation has been submitted for verification.",
        { icon: "🙏" }
      );

      setTimeout(() => navigate("/items"), 2000);
    } catch (err) {
      console.error("Donation error:", err);
      toast.error("😞 Failed to submit donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-lg mx-auto mt-28 px-6 py-8 bg-white shadow-md rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          💝 Support Freebies Japan
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Make a one-time donation of{" "}
          <strong>¥{DONATION_AMOUNT.toLocaleString()}</strong> to keep Freebies
          Japan running and continue enjoying free requests!
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Message field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              💬 Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Leave a note for the Freebies Japan team..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Proof upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📎 Upload Proof of Donation (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-700 border-gray-300"
            />
            {proofFile && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {proofFile.name}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-md text-white font-semibold transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-pink-600 hover:bg-pink-700"
            }`}
          >
            {loading
              ? "Processing..."
              : `Donate ¥${DONATION_AMOUNT.toLocaleString()}`}
          </button>
        </form>

        <div className="text-center text-gray-500 text-sm mt-6">
          ⚠️ Your donation will be reviewed by our admin team.
          <br />
          Once verified, you’ll become a{" "}
          <strong>Subscriber</strong> and regain full access.
        </div>
      </div>
    </>
  );
}
