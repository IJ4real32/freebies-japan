// ✅ FILE: src/components/Payments/ItemDepositButton.js
// Two-page modal carousel: 1) Deposit instructions  2) Report deposit
// Uses Cloud Functions callables to create and report payments.
// Storage upload path: payments/{paymentId}/{filename}

import React, { useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../../firebase';

// --- Fallback bank account display (backend returns canonical details) ---
const FALLBACK_BANK = {
  bank: 'ゆうちょ銀行 (JP Post Bank)',
  branch: '〇一八 / 018',
  type: '普通',
  account: '1234567',
  name: 'フリービーズジャパン',
};

// Tiny toast helper (no external deps)
const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] px-4 py-2 rounded shadow-lg text-sm text-white ${
        type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
      }`}
      role="status"
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          className="opacity-80 hover:opacity-100"
          onClick={onClose}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function ItemDepositButton({ itemId, title, amountJPY }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0 = info, 1 = report

  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const auth = getAuth();
  const user = auth.currentUser;

  // Payment session (created via callable)
  const [paymentId, setPaymentId] = useState('');
  const [refCode, setRefCode] = useState(''); // from backend
  const [bank, setBank] = useState(FALLBACK_BANK);

  const [copied, setCopied] = useState(false);

  // Form (report page)
  const [form, setForm] = useState({
    method: 'ATM', // 'ATM'|'Counter'|'Online'|'jp_post'
    payerName: user?.displayName || '',
    transactionId: '',
    notes: '',
    proofFile: null,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type }), 2500);
  };

  const resetModal = () => {
    setStep(0);
    setOpen(false);
    setBusy(false);
    setCreating(false);
    setError('');
    setSuccess('');
    setCopied(false);

    // clear payment session to avoid dangling pending docs
    setPaymentId('');
    setRefCode('');
    setBank(FALLBACK_BANK);

    setForm({
      method: 'ATM',
      payerName: user?.displayName || '',
      transactionId: '',
      notes: '',
      proofFile: null,
    });
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setError('Please upload an image file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Max file size is 5MB.');
      return;
    }
    setError('');
    setForm((s) => ({ ...s, proofFile: f }));
  };

  const copyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(refCode);
      } else {
        const el = document.createElement('textarea');
        el.value = refCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      showToast('Reference code copied');
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      showToast('Could not copy code', 'error');
    }
  };

  // --- Callables ---
  const createDepositRequest = useMemo(
    () => httpsCallable(functions, 'createDepositRequest'),
    []
  );
  const reportDeposit = useMemo(
    () => httpsCallable(functions, 'reportDeposit'),
    []
  );

  // Ensure we have a payment document before going to step 1 or submitting
  const ensurePaymentCreated = async () => {
    if (paymentId) return { paymentId, code: refCode, bank };
    if (!user) throw new Error('Please sign in first.');
    if (!itemId || !amountJPY) throw new Error('Missing item or amount.');

    setCreating(true);
    try {
      const { data } = await createDepositRequest({
        type: 'item',
        targetId: itemId,
        amount: Number(amountJPY),
      });
      // backend returns: { paymentId, code, amount, bank }
      if (!data?.paymentId) throw new Error('Failed to create payment.');
      setPaymentId(String(data.paymentId));
      if (data.code) setRefCode(String(data.code));
      if (data.bank) setBank(data.bank);
      return {
        paymentId: String(data.paymentId),
        code: String(data.code || ''),
        bank: data.bank || FALLBACK_BANK,
      };
    } finally {
      setCreating(false);
    }
  };

  const goNext = async () => {
    setError('');
    try {
      // Create the payment only when user proceeds; reduces abandoned docs
      await ensurePaymentCreated();
      setStep(1);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Could not start deposit.');
      showToast('Could not start deposit', 'error');
    }
  };

  const submitReport = async () => {
    if (!user) {
      setError('Please sign in first.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const { paymentId: pid } = await ensurePaymentCreated();

      let proofUrl;
      if (form.proofFile) {
        // MUST upload into payments/{paymentId}/... to match storage.rules
        const path = `payments/${pid}/${Date.now()}-${form.proofFile.name}`;
        const r = ref(storage, path);
        await uploadBytes(r, form.proofFile, { contentType: form.proofFile.type });
        proofUrl = await getDownloadURL(r);
      }

      const payload = {
        paymentId: pid,
        amount: Number(amountJPY),
        method: form.method,
        transferName: form.payerName || undefined,
        memo: form.notes || undefined,
        txId: form.transactionId || undefined,
        receiptUrl: proofUrl || undefined,
      };

      const res = await reportDeposit(payload);
      if (!res?.data?.ok) {
        // callable may not return data.ok; still fine if it didn't throw
        console.log('reportDeposit response', res);
      }

      setSuccess("Deposit report submitted. We'll verify and notify you.");
      showToast('Report submitted');
      setStep(0); // back to info page
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Could not submit deposit report.');
      showToast('Submission failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const headerTitle = step === 0 ? 'Deposit instructions' : 'Report your deposit';
  const displayBank = bank || FALLBACK_BANK;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        aria-haspopup="dialog"
      >
        Pay by Deposit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={resetModal} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{headerTitle}</h3>
              <button onClick={resetModal} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                ×
              </button>
            </div>

            {/* carousel body */}
            <div className="p-5">
              {step === 0 ? (
                <div className="space-y-3 text-sm">
                  <p className="text-gray-700">
                    To purchase <span className="font-medium">{title || 'this item'}</span>, please deposit:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-gray-800">
                    <span className="font-medium">Amount</span>
                    <span>¥{Number(amountJPY || 0).toLocaleString()}</span>
                    <span className="font-medium">Bank</span>
                    <span>{displayBank.bank || FALLBACK_BANK.bank}</span>
                    <span className="font-medium">Branch</span>
                    <span>{displayBank.branch || FALLBACK_BANK.branch}</span>
                    <span className="font-medium">Type</span>
                    <span>{displayBank.type || FALLBACK_BANK.type}</span>
                    <span className="font-medium">Account #</span>
                    <span>{displayBank.account || FALLBACK_BANK.account}</span>
                    <span className="font-medium">Name</span>
                    <span>{displayBank.name || FALLBACK_BANK.name}</span>
                  </div>

                  <div className="mt-3 p-3 rounded bg-indigo-50 text-indigo-800">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs">
                          Include this code in the transfer name or notes so we can match your payment quickly:
                        </p>
                        <p className="font-mono text-base tracking-wider select-all">
                          {refCode || '—'}
                        </p>
                      </div>
                      <button
                        onClick={copyCode}
                        disabled={!refCode || creating}
                        className={`shrink-0 px-3 py-1.5 rounded text-white text-xs ${
                          refCode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400'
                        }`}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    {!paymentId && (
                      <p className="text-[11px] text-indigo-700 mt-2">
                        Your reference code is generated when you proceed to the next step.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    After you make the transfer, click Next to submit the receipt or details.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Payment method</label>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                      {['ATM', 'Counter', 'Online', 'jp_post'].map((m) => (
                        <label
                          key={m}
                          className={`border rounded px-3 py-2 cursor-pointer ${
                            form.method === m ? 'bg-indigo-50 border-indigo-300' : 'bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="method"
                            value={m}
                            className="mr-2"
                            checked={form.method === m}
                            onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payer name</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-sm"
                      value={form.payerName}
                      onChange={(e) => setForm((s) => ({ ...s, payerName: e.target.value }))}
                      placeholder="Name used on the transfer"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Reference / transaction code (optional)</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-sm font-mono"
                      value={form.transactionId}
                      onChange={(e) => setForm((s) => ({ ...s, transactionId: e.target.value }))}
                      placeholder="e.g. 1234-ABCD"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Upload receipt (optional)</label>
                    <input type="file" accept="image/*" onChange={onFile} className="mt-1 text-sm" />
                    {form.proofFile && <p className="text-xs text-gray-600 mt-1">{form.proofFile.name}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <textarea
                      className="mt-1 w-full border rounded px-3 py-2 text-sm"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Anything that helps us match your deposit"
                    />
                  </div>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              {success && <p className="mt-4 text-sm text-green-700">{success}</p>}
            </div>

            {/* footer */}
            <div className="px-5 py-4 border-t flex items-center justify-between">
              <button onClick={resetModal} className="text-sm px-3 py-2 rounded bg-gray-100 hover:bg-gray-200">
                Close
              </button>
              <div className="flex items-center gap-2">
                {step === 1 && (
                  <button
                    onClick={() => setStep(0)}
                    disabled={busy || creating}
                    className="text-sm px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    Previous
                  </button>
                )}
                {step === 0 ? (
                  <button
                    onClick={goNext}
                    disabled={creating}
                    className="text-sm px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {creating ? 'Preparing…' : 'Next'}
                  </button>
                ) : (
                  <button
                    onClick={submitReport}
                    disabled={busy || creating}
                    className="text-sm px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {busy ? 'Submitting…' : 'Submit report'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* lightweight toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </>
  );
}
