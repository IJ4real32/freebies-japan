import React, { useState } from "react";
import selectionApi from "../services/selectionApi";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SelectionJoinButton({ selectionId, selection, joined, onJoined }) {
  const { currentUser } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const isOpen = selection?.status === "open";
  const disabled = busy || joined || !isOpen;

  async function onJoin() {
    if (!currentUser) {
      return nav("/login?next=" + encodeURIComponent(`/selections/${selectionId}`));
    }
    try {
      setBusy(true);
      await selectionApi.join({ lotteryId: selectionId });
      onJoined?.();
      alert("You're in! ✅");
    } catch (e) {
      alert(e?.message || "Could not enter selection");
    } finally {
      setBusy(false);
    }
  }

  if (joined)   return <button className="px-4 py-2 rounded bg-gray-300 text-gray-700 cursor-not-allowed">Already entered</button>;
  if (!isOpen)  return <button className="px-4 py-2 rounded bg-gray-300 text-gray-700 cursor-not-allowed">Not open</button>;

  return (
    <button
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      onClick={onJoin}
      disabled={disabled}
    >
      {busy ? "Entering…" : "Enter Selection"}
    </button>
  );
}
