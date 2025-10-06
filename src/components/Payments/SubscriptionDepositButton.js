// SubscriptionDepositButton.js
import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { db, storage } from "../../firebase";

/**
 * Default subscription price: ¥1,000 (can override with prop).
 * Usage: <SubscriptionDepositButton amountYen={1000} />
 */
export default function SubscriptionDepositButton({ amountYen = 1000 }) {
  const { currentUser } = useAuth();

  const [open, setOpen] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [notes, setNotes] = useState("");
  const [txnCode, setTxnCode] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    try {
      if (!currentUser) {
        alert("Please sign in to continue.");
        return;
      }
      if (!Number.isFinite(amountYen) || amountYen < 100) {
        alert("Invalid subscription amount.");
        return;
      }

      setBusy(true);

      let proofUrl = "";
      if (proofFile) {
        const path = `proofs/${currentUser.uid}/${Date.now()}_${proofFile.name}`;
        const sref = ref(storage, path);
        await uploadBytes(sref, proofFile);
        proofUrl = await getDownloadURL(sref);
      }

      await addDoc(collection(db, "payments"), {
        userId: currentUser.uid,
        type: "subscription",
        amountJPY: Math.floor(Number(amountYen)),
        method: "jp_post",
        transactionCode: txnCode || null,
        proofUrl: proofUrl || null,
        notes: notes || null,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setOpen(false);
      setPayerName("");
      setNotes("");
      setTxnCode("");
      setProofFile(null);
      alert("Subscription deposit report submitted. We’ll review and activate your subscription.");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to submit deposit report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded text-sm text-white bg-emerald-600 hover:bg-emerald-700"
      >
        Pay ¥{Number(amountYen).toLocaleString()} by Deposit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="w-[90vw] max-w-sm bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Subscribe by Bank Deposit</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div className="rounded border p-3 bg-gray-50">
                <div className="font-medium mb-2">Receiving account (JP Post)</div>
                <ul className="space-y-1">
                  <li>銀行名：ゆうちょ銀行（銀行コード：9900）</li>
                  <li>支店名：〇一九（支店コード：019）</li>
                  <li>口座種別：普通</li>
                  <li>口座番号：1234567</li>
                  <li>口座名義：フリービーズジャパン</li>
                </ul>
              </div>

              <div>
                <span className="font-semibold">Amount:</span>{" "}
                ¥{Number(amountYen).toLocaleString()}
              </div>

              <label className="block">
                <span className="text-gray-700">Payer name（振込人名）</span>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Your bank transfer name"
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-gray-700">Transaction ID (optional)</span>
                <input
                  type="text"
                  value={txnCode}
                  onChange={(e) => setTxnCode(e.target.value)}
                  placeholder="ATM receipt # / bank reference"
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-gray-700">Upload proof (optional)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm"
                />
              </label>

              <label className="block">
                <span className="text-gray-700">Notes (optional)</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy}
                className={`w-full py-2 rounded text-white ${
                  busy ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {busy ? "Submitting…" : "Submit deposit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
