// ✅ FILE: src/components/Admin/BackToDashboardButton.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackToDashboardButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/admin')}
      className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-sm rounded"
    >
      ← Back to Admin Dashboard
    </button>
  );
};

export default BackToDashboardButton;
