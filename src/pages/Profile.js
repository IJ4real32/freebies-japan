// ✅ FILE: src/pages/Profile.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { useTranslation } from '../hooks/useTranslation';

const avatarOptions = Array.from({ length: 10 }, (_, i) => ({
  label: `Avatar ${i + 1}`,
  url: `/avatars/avatar${i + 1}.png`,
}));

const Profile = () => {
  const { currentUser, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    zipCode: '',
    address: '',
    roomNumber: '',
    phone: '',
  });
  const [avatarURL, setAvatarURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const defaultData = currentUser.defaultAddress || {
        zipCode: '',
        address: '',
        roomNumber: '',
        phone: '',
      };
      setFormData(defaultData);
      setAvatarURL(currentUser.avatar || '/avatars/avatar1.png');
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchAddress = async () => {
      if (formData.zipCode.length === 7 && /^\d+$/.test(formData.zipCode)) {
        try {
          const response = await axios.get(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formData.zipCode}`
          );
          const result = response.data.results?.[0];
          if (result) {
            const fullAddress = `${result.address1} ${result.address2} ${result.address3}`;
            setFormData(prev => ({ ...prev, address: fullAddress }));
          }
        } catch (err) {
          console.error('ZIP lookup failed', err);
        }
      }
    };
    const timer = setTimeout(fetchAddress, 500);
    return () => clearTimeout(timer);
  }, [formData.zipCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.zipCode || !formData.address || !formData.phone) {
      alert(t('addressValidationError'));
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        avatar: avatarURL,
        defaultAddress: formData,
      });
      await refreshUser();
      alert(t('profileUpdated'));
    } catch (err) {
      console.error('Profile update failed', err);
      alert(t('profileUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailVerification = async () => {
    setSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      alert(t('verificationSent'));
    } catch (err) {
      console.error('Verification email error', err);
      alert(t('verificationFailed'));
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('myProfile')}</h1>

        <h3 className="text-sm font-medium mb-2">{t('selectAvatar')}</h3>
        <div className="grid grid-cols-5 gap-4 mb-6">
          {avatarOptions.map(option => (
            <img
              key={option.url}
              src={option.url}
              alt={option.label}
              onClick={() => setAvatarURL(option.url)}
              className={`w-16 h-16 rounded-full cursor-pointer border-2 object-cover ${
                avatarURL === option.url ? 'border-blue-500' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="mb-4">
          <p><strong>Email:</strong> {currentUser?.email}</p>
          <p>
            <strong>{t('status')}:</strong>{' '}
            {currentUser?.emailVerified ? (
              <span className="text-green-600">{t('verified')}</span>
            ) : (
              <>
                <span className="text-red-600">{t('unverified')}</span>
                <button
                  onClick={handleSendEmailVerification}
                  disabled={sendingVerification}
                  className="ml-2 text-blue-600 underline text-sm"
                >
                  {sendingVerification ? t('sending') : t('verifyEmail')}
                </button>
              </>
            )}
          </p>
        </div>

        <h2 className="text-lg font-semibold mt-6 mb-3">{t('defaultDeliveryInfo')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('zipCode')} *</label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
              maxLength="7"
              placeholder="1234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('address')} *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('roomBuilding')}</label>
            <input
              type="text"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('phone')} *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="08012345678"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          {saving ? t('saving') : t('saveChanges')}
        </button>
      </main>
    </div>
  );
};

export default Profile;
