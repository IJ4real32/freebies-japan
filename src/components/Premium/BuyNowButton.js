// Compact deposit modal for buying a single premium item
import React, { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

// Receiving account (override with envs if you have them)
const JPPOST = {
  bank:       process.env.REACT_APP_JPPOST_BANK        || "ゆうちょ銀行（銀行コード: 9900）",
  branch:     process.env.REACT_APP_JPPOST_BRANCH      || "〇一九（支店コード: 019）",
  accountType:process.env.REACT_APP_JPPOST_TYPE        || "普通",
  account:    process.env.REACT_APP_JPPOST_ACCOUNT     || "1234567",
  name:       process.env.REACT_APP_JPPOST_NAME        || "フリービーズジャパン（フリービズ ジャパン）",
};

function genCode(seed = "ITEM") {
  const pick = (n) =>
    Array.from({ length: n }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  return `FJ-${seed}-${pick(4)}-${pick(4)}`;
}

export default function ItemDepositButton({ itemId, title, amountJPY, onSubmitted }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [payMethod, setPayMethod] = useState("ATM");
  const [payerName, setPayerName] = useState("");
  const [txId, setTxId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const depositCode = useMemo(() => genCode("ITEM"), []);

  const openGuard = () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!currentUser) return navigate("/login");
    if (!amountJPY || Number(amountJPY) <= 0) {
      alert("Invalid amount.");
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, "depositReports"), {
        type: "item",
        itemId,
        itemTitle: title || null,
        userId: currentUser.uid,
        amountJPY: Number(amountJPY),
        method: payMethod,
        payerName: payerName || null,
        transactionId: txId || null,
        notes: notes || null,
        code: depositCode,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setOpen(false);
      setPayerName(""); setTxId(""); setNotes("");
      if (onSubmitted) onSubmitted();
      alert("Deposit report submitted. We’ll review and update you shortly.");
    } catch (e) {
      console.error(e);
      alert("Could not submit deposit report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={openGuard}
        className="text-white px-4 py-2 rounded text-sm bg-indigo-600 hover:bg-indigo-700"
      >
        Deposit to buy
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                Deposit to buy{title ? `: ${title}` : ""}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm">
                <div className="font-medium">Send to (JP Post / ゆうちょ銀行)</div>
                <ul className="mt-2 space-y-1 text-gray-700">
                  <li>銀行: {JPPOST.bank}</li>
                  <li>支店: {JPPOST.branch}</li>
                  <li>種別: {JPPOST.accountType}</li>
                  <li>口座番号: {JPPOST.account}</li>
                  <li>名義: {JPPOST.name}</li>
                </ul>
                <div className="mt-3 bg-gray-50 border rounded p-2 text-xs">
                  振込名義に次のコードを必ずご記載ください：<br />
                  <span className="font-mono text-base">{depositCode}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <label className="block">
                  <span className="text-gray-700">Amount (JPY)</span>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={amountJPY}
                    disabled
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700">Method</span>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option>ATM</option>
                    <option>Counter</option>
                    <option>Online</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-gray-700">Payer name（振込人名）</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="e.g., Yamada Taro"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700">Transaction ID (optional)</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700">Notes (optional)</span>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={submit}
                disabled={busy}
              >
                {busy ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
