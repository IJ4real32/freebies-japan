import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function BackToDashboardButton() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // ✅ Hide this button for normal (non-admin) users
  if (!isAdmin) return null;

  return (
    <button
      onClick={() => navigate("/admin")}
      className="mb-4 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded"
    >
      ← Back to Admin Dashboard
    </button>
  );
}
