// ✅ FILE: src/pages/Profile.jsx
// UI-UNIFIED VERSION — Matches MyActivity / Items styling
// F-8: Credit visibility added (Option C compliant)

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
        } catch {
          // silent fail
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
    } catch {
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
    } catch {
      alert(t("verificationFailed"));
    } finally {
      setSendingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        {t("loading")}...
      </div>
    );
  }

  const creditsLeft = typeof currentUser?.trialCreditsLeft === "number"
    ? currentUser.trialCreditsLeft
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-4">
      <main className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 mt-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {t("myProfile")}
        </h1>

        {/* Avatar Picker */}
        <h3 className="text-sm font-medium mb-2 text-gray-700 text-center">
          {t("selectAvatar")}
        </h3>

        <div className="grid grid-cols-5 gap-3 mb-6 place-items-center">
          {avatarOptions.map((option) => (
            <img
              key={option.url}
              src={option.url}
              alt={option.label}
              onClick={() => setAvatarURL(option.url)}
              onError={(e) => (e.currentTarget.src = "/avatars/avatar1.png")}
              className={`w-14 h-14 rounded-full cursor-pointer border-2 object-cover transition ${
                avatarURL === option.url
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-gray-300"
              }`}
            />
          ))}
        </div>

        {/* 🔹 CREDITS (F-8 ADDITION) */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 text-sm text-indigo-900">
          <p className="font-semibold text-base">
            Credits remaining: {creditsLeft}
          </p>
          <p className="text-xs text-indigo-700 mt-1">
            Credits are used only when you receive an item.
            Requests are always free.
          </p>
        </div>

        {/* Email Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
          <p className="mb-1">
            <strong>Email:</strong> {currentUser?.email}
          </p>
          <p>
            <strong>{t("status")}:</strong>{" "}
            {currentUser?.emailVerified ? (
              <span className="text-green-600">{t("verified")}</span>
            ) : (
              <>
                <span className="text-red-600">{t("unverified")}</span>
                <button
                  onClick={handleSendEmailVerification}
                  disabled={sendingVerification}
                  className="ml-2 text-indigo-600 underline text-xs font-medium"
                >
                  {sendingVerification ? t("sending") : t("verifyEmail")}
                </button>
              </>
            )}
          </p>
        </div>

        {/* Default Address */}
        <h2 className="text-base font-semibold mb-3 text-gray-900">
          {t("defaultDeliveryInfo")}
        </h2>

        <div className="space-y-4">
          {[
            ["zipCode", t("zipCode"), "1234567"],
            ["address", t("address"), ""],
            ["roomNumber", t("roomBuilding"), ""],
            ["phone", t("phone"), "08012345678"],
          ].map(([name, label, placeholder]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {label}
              </label>
              <input
                type="text"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          ))}
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
