// ✅ FILE: src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { useTranslation } from "../hooks/useTranslation";

const avatarOptions = Array.from({ length: 10 }, (_, i) => ({
  label: `Avatar ${i + 1}`,
  url: `/avatars/avatar${i + 1}.png`,
}));

export default function Profile() {
  const { currentUser, refreshUser } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    zipCode: "",
    address: "",
    roomNumber: "",
    phone: "",
  });
  const [avatarURL, setAvatarURL] = useState("/avatars/avatar1.png");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      zipCode: currentUser?.defaultAddress?.zipCode || "",
      address: currentUser?.defaultAddress?.address || "",
      roomNumber: currentUser?.defaultAddress?.roomNumber || "",
      phone: currentUser?.defaultAddress?.phone || "",
    });
    setAvatarURL(currentUser?.avatar || "/avatars/avatar1.png");
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (formData.zipCode.length === 7 && /^\d+$/.test(formData.zipCode)) {
      const fetchAddress = async () => {
        try {
          const { data } = await axios.get(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formData.zipCode}`
          );
          const result = data.results?.[0];
          if (result) {
            const fullAddress = `${result.address1}${result.address2}${result.address3}`;
            setFormData((prev) => ({ ...prev, address: fullAddress }));
          }
        } catch (err) {
          console.error("ZIP lookup failed", err);
        }
      };
      const timer = setTimeout(fetchAddress, 400);
      return () => clearTimeout(timer);
    }
  }, [formData.zipCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    if (!formData.zipCode || !formData.address || !formData.phone) {
      alert(t("addressValidationError"));
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        avatar: avatarURL,
        defaultAddress: formData,
        updatedAt: new Date(),
      });
      if (refreshUser) await refreshUser();
      alert(t("profileUpdated"));
    } catch (err) {
      console.error("Profile update failed", err);
      alert(t("profileUpdateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailVerification = async () => {
    setSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      alert(t("verificationSent"));
    } catch (err) {
      console.error("Verification email error", err);
      alert(t("verificationFailed"));
    } finally {
      setSendingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        {t("loading")}...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-16 px-4">
      <main className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          {t("myProfile")}
        </h1>

        {/* ✅ Avatar Picker */}
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200 text-center">
          {t("selectAvatar")}
        </h3>
        <div className="grid grid-cols-5 gap-3 mb-6 place-items-center">
          {avatarOptions.map((option) => (
            <img
              key={option.url}
              src={option.url}
              alt={option.label}
              onClick={() => setAvatarURL(option.url)}
              onError={(e) => {
                e.currentTarget.src = "/avatars/avatar1.png";
              }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full cursor-pointer border-2 object-cover transition-transform duration-150 hover:scale-105 ${
                avatarURL === option.url
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
          ))}
        </div>

        {/* ✅ Email Section */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-sm text-gray-700 dark:text-gray-200">
          <p className="mb-1">
            <strong>Email:</strong> {currentUser?.email}
          </p>
          <p>
            <strong>{t("status")}:</strong>{" "}
            {currentUser?.emailVerified ? (
              <span className="text-green-600 dark:text-green-400">
                {t("verified")}
              </span>
            ) : (
              <>
                <span className="text-red-600 dark:text-red-400">
                  {t("unverified")}
                </span>
                <button
                  onClick={handleSendEmailVerification}
                  disabled={sendingVerification}
                  className="ml-2 text-indigo-600 dark:text-indigo-400 underline text-xs font-medium"
                >
                  {sendingVerification ? t("sending") : t("verifyEmail")}
                </button>
              </>
            )}
          </p>
        </div>

        {/* ✅ Default Delivery Info */}
        <h2 className="text-lg font-semibold mt-4 mb-3 text-gray-800 dark:text-white">
          {t("defaultDeliveryInfo")}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {t("zipCode")} *
            </label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              maxLength="7"
              placeholder="1234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {t("address")} *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {t("roomBuilding")}
            </label>
            <input
              type="text"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {t("phone")} *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="08012345678"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-6 w-full py-2.5 rounded-full text-white font-semibold transition ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </main>
    </div>
  );
}
