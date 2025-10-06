// ✅ FILE: src/components/Payments/DepositButton.jsx
import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const JP_POST = {
  bankNameJa: "ゆうちょ銀行（銀行コード: 9900）",
  branchJa: "○一九（支店コード: 019）",
  typeJa: "普通",
  accountNo: "1234567",
  holderJa: "フリービーズジャパン（ﾌﾘｰﾋﾞｰｽﾞ ｼﾞｬﾊﾟﾝ）",
};

function genCode(uid = "", itemId = "") {
  const rand = () =>
    Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  const tail = uid ? uid.slice(-2).toUpperCase() : rand().slice(0, 2);
  const it = itemId ? itemId.slice(0, 2).toUpperCase() : rand().slice(0, 2);
  return `FJ-${rand()}-${it}${tail}`;
}

export default function DepositButton({
  itemId,
  itemTitle = "Premium Item",
  amountYen,
  buttonClassName = "px-3 py-1.5 rounded text-sm bg-emerald-600 text-white hover:bg-emerald-700",
}) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const code = useMemo(() => genCode(currentUser?.uid, itemId), [currentUser?.uid, itemId]);

  const [form, setForm] = useState({
    method: "ATM",
    payerName: currentUser?.displayName || "",
    transactionId: "",
    notes: "",
  });

  const onOpen = () => {
    if (!currentUser?.uid) {
      navigate("/login");
      return;
    }
    if (!itemId || !amountYen) {
      alert("Missing item information.");
      return;
    }
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !itemId) return;

    try {
      setSubmitting(true);
      await addDoc(collection(db, "depositReports"), {
        userId: currentUser.uid,
        email: currentUser.email || null,
        type: "item",
        itemId,
        itemTitle,
        code,
        amount: Number(amountYen),
        currency: "JPY",
        method: form.method,
        payerName: form.payerName || null,
        transactionId: form.transactionId || null,
        notes: form.notes || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("Deposit report submitted. We’ll review and confirm your purchase.");
      setOpen(false);
    } catch (err) {
      console.error("deposit item report failed:", err);
      alert(err?.message || "Failed to submit deposit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button onClick={onOpen} className={buttonClassName}>
        Pay by Deposit
      </button>

      {!open ? null : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <h3 className="text-base font-semibold truncate">銀行振込のご案内（プレミアム）</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 active:bg-gray-200"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 space-y-3 overflow-auto text-sm">
              <div className="rounded-md border bg-gray-50 p-3 leading-relaxed">
                <div><strong>商品:</strong> {itemTitle}</div>
                <div className="pt-1"><strong>名義:</strong> {JP_POST.holderJa}</div>
                <div><strong>銀行名:</strong> {JP_POST.bankNameJa}</div>
                <div><strong>支店名:</strong> {JP_POST.branchJa}</div>
                <div><strong>口座種別:</strong> {JP_POST.typeJa}</div>
                <div><strong>口座番号:</strong> {JP_POST.accountNo}</div>
                <div className="pt-2">
                  振込の際は次のコードを振込名義に必ずご記載ください：<br />
                  <span className="font-mono font-semibold">{code}</span>
                </div>
                <div className="pt-1">
                  <strong>金額 (JPY):</strong>{" "}
                  <span className="font-medium">¥{Number(amountYen).toLocaleString()}</span>
                </div>
              </div>

              <div className="h-px bg-gray-200" />

              <form onSubmit={onSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">Method</label>
                  <select
                    className="col-span-2 border rounded px-2 py-1"
                    value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  >
                    <option>ATM</option>
                    <option>Bank Counter</option>
                    <option>Online Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Payer name（振込人名）</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={form.payerName}
                    onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Transaction ID (optional)</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={form.transactionId}
                    onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                    placeholder="Reference / 控え番号"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Notes</label>
                  <textarea
                    className="w-full border rounded px-2 py-1"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Anything we should know…"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-3 py-1.5 text-sm rounded text-white ${
                      submitting ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
