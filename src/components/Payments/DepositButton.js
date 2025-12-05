// ✅ FILE: src/components/Payments/DepositButton.jsx
import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createDepositRequest } from "../../services/functionsApi";
import toast from "react-hot-toast";

const JP_POST = {
  bankNameJa: "ゆうちょ銀行（銀行コード: 9900）",
  branchJa: "○一九（支店コード: 019）",
  typeJa: "普通",
  accountNo: "1234567",
  holderJa: "フリービーズジャパン（ﾌﾘｰﾋﾞｰｽﾞ ｼﾞｬﾊﾟﾝ）",
};

// Generates a simple deposit tracking code
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
  const [receiptFile, setReceiptFile] = useState(null);

  const code = useMemo(
    () => genCode(currentUser?.uid, itemId),
    [currentUser?.uid, itemId]
  );

  // Form values
  const [method, setMethod] = useState("ATM");
  const [payerName, setPayerName] = useState(currentUser?.displayName || "");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");

  const [address, setAddress] = useState({
    address: "",
    roomNumber: "",
    phone: "",
  });

  const onOpen = () => {
    if (!currentUser?.uid) {
      navigate("/login");
      return;
    }
    if (!itemId || !amountYen) {
      toast.error("Missing item information.");
      return;
    }
    setOpen(true);
  };

  /* ------------------------------------------------------------------
   * File Upload Logic
   * ------------------------------------------------------------------ */
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return toast.error("Only image files allowed.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Max size 5MB.");
    setReceiptFile(f);
  };

  const uploadReceipt = async (paymentId) => {
    if (!receiptFile) return null;
    const path = `payments/${paymentId}/${Date.now()}_${receiptFile.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, receiptFile, { contentType: receiptFile.type });
    return await getDownloadURL(fileRef);
  };

  /* ------------------------------------------------------------------
   * Submit Deposit → Phase-2 Cloud Function
   * ------------------------------------------------------------------ */
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !itemId) return;

    try {
      setSubmitting(true);

      // Validate
      if (!receiptFile) {
        toast.error("Please upload a transfer receipt.");
        return;
      }
      if (!address.address || !address.phone) {
        toast.error("Please enter delivery address & phone.");
        return;
      }

      // 1) TEMP: create request WITHOUT receipt
      const res = await createDepositRequest({
        itemId,
        amount: Number(amountYen),
        method: "bank_transfer",
        deliveryInfo: address,
        receiptUrl: null,
      });

      if (!res?.paymentId) throw new Error("Failed to create deposit request.");

      // 2) Upload receipt with paymentId
      const url = await uploadReceipt(res.paymentId);

      // 3) Report deposit (Phase-2 pipeline)
      await createDepositRequest({
        paymentId: res.paymentId,
        receiptUrl: url,
      });

      toast.success("Deposit submitted successfully.");
      setOpen(false);
      navigate("/my-activity?tab=premium");
    } catch (err) {
      console.error("Deposit error:", err);
      toast.error(err?.message || "Failed to submit deposit.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------
   * UI MODAL
   * ------------------------------------------------------------------ */
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
              <h3 className="text-base font-semibold truncate">
                銀行振込のご案内（プレミアム）
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 active:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 space-y-3 overflow-auto text-sm">
              {/* Bank Info */}
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
                  <span className="font-medium">
                    ¥{Number(amountYen).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="border rounded-md p-3 space-y-2">
                <label className="text-xs font-semibold text-gray-600">
                  Delivery Address
                </label>
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Full address"
                  value={address.address}
                  onChange={(e) =>
                    setAddress({ ...address, address: e.target.value })
                  }
                />
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Room number (optional)"
                  value={address.roomNumber}
                  onChange={(e) =>
                    setAddress({ ...address, roomNumber: e.target.value })
                  }
                />
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Phone number"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />
              </div>

              {/* Receipt Upload */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">
                  Upload Transfer Receipt *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                {receiptFile && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {receiptFile.name}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className={`px-3 py-1.5 text-sm rounded text-white ${
                    submitting
                      ? "bg-emerald-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
