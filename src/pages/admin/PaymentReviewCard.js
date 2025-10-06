// ✅ FILE: src/pages/Admin/PaymentReviewCard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../../firebase';
import { X, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export default function PaymentReviewCard({ paymentId, onHandled }) {
  const [payment, setPayment] = useState(null);
  const [userMeta, setUserMeta] = useState(null);
  const [proofURLs, setProofURLs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(true);

  const adminHandlePayment = useMemo(
    () => httpsCallable(functions, 'adminHandlePayment'),
    []
  );

  useEffect(() => {
    if (!paymentId) return;
    const unsub = onSnapshot(doc(db, 'payments', paymentId), async (snap) => {
      if (!snap.exists()) return setPayment(null);
      const p = { id: snap.id, ...snap.data() };
      setPayment(p);

      if (p.userId) {
        const u = await getDoc(doc(db, 'users', p.userId));
        if (u.exists()) setUserMeta({ id: u.id, ...u.data() });
      }

      const paths = Array.isArray(p.proofPaths)
        ? p.proofPaths
        : p.proofPath
        ? [p.proofPath]
        : [];
      const urls = await Promise.all(
        paths.map(async (path) => {
          try { return { path, url: await getDownloadURL(ref(storage, path)) }; }
          catch { return { path, url: null }; }
        })
      );
      setProofURLs(urls);
    });
    return () => unsub();
  }, [paymentId]);

  const handleDecision = useCallback(
    async (decision) => {
      if (!payment) return;
      if (!window.confirm(`Are you sure you want to ${decision} this payment?`)) return;
      setBusy(true);
      try {
        const payload = {
          paymentId: payment.id,
          action: decision === 'approve' ? 'approve' : 'reject',
          adminNote: note || '',
          grantDays: payment.type === 'subscription' ? 30 : undefined,
        };
        const { data } = await adminHandlePayment(payload);
        if (data?.ok) {
          onHandled?.(payment.id, decision);
          setOpen(false);
        } else {
          throw new Error(data?.error || 'Server did not confirm change.');
        }
      } catch (err) {
        console.error('adminHandlePayment error:', err);
        alert(err?.message || 'Failed to update payment.');
      } finally {
        setBusy(false);
      }
    },
    [adminHandlePayment, note, onHandled, payment]
  );

  if (!payment || !open) return null;

  const {
    id, code, type, itemId, amount, currency = 'JPY',
    status, createdAt, reportedAt, senderName, userId
  } = payment;

  const created = createdAt?.toDate?.() || (createdAt ? new Date(createdAt) : null);
  const reported = reportedAt?.toDate?.() || (reportedAt ? new Date(reportedAt) : null);

  return (
    <div className="rounded-xl border shadow-sm bg-white p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500">Payment ID</div>
          <div className="font-mono text-sm">{id}</div>
        </div>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-3">
        <div className="space-y-2">
          <Row k="Status" v={status} />
          <Row
            k="Type"
            v={type === 'subscription'
              ? 'Subscription'
              : type === 'premium_item'
                ? `Premium Item${itemId ? ` (${itemId})` : ''}`
                : String(type || '—')}
          />
          <Row k="Amount" v={typeof amount === 'number' ? `¥${amount.toLocaleString()} ${currency}` : '—'} />
          <Row k="Code" v={code || '—'} mono />
          <Row k="Reported" v={reported ? reported.toLocaleString() : '—'} />
          <Row k="Created" v={created ? created.toLocaleString() : '—'} />
          <Row k="Sender Name (user note)" v={senderName || payment.note || '—'} />
          <div className="pt-2">
            <div className="text-sm text-gray-500">User</div>
            <div className="text-sm">
              <div>{userMeta?.displayName || '—'}</div>
              <div className="text-gray-600">{userMeta?.email || '—'}</div>
              <div className="font-mono text-xs text-gray-500">{userId}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-2">Receipt</div>
          {proofURLs.length === 0 ? (
            <div className="text-sm text-gray-600">No receipt uploaded.</div>
          ) : (
            <div className="space-y-2">
              {proofURLs.map(({ path, url }) => (
                <div key={path} className="flex items-center justify-between rounded border p-2">
                  <div className="truncate text-sm">
                    <span className="font-mono text-gray-700">{path}</span>
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <ExternalLink size={16} />
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">No URL</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3">
            <label className="text-sm text-gray-600">Admin note</label>
            <textarea
              rows={3}
              className="w-full border rounded p-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note visible in payment record"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
        <button
          disabled={busy}
          onClick={() => handleDecision('reject')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-white ${busy ? 'bg-gray-400' : 'bg-rose-600 hover:bg-rose-700'}`}
        >
          <XCircle size={18} />
          {busy ? 'Working…' : 'Reject'}
        </button>
        <button
          disabled={busy}
          onClick={() => handleDecision('approve')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-white ${busy ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          <CheckCircle2 size={18} />
          {busy ? 'Working…' : 'Approve'}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-gray-500">{k}</div>
      <div className={`text-sm ${mono ? 'font-mono' : 'font-medium'} text-gray-800`}>{v}</div>
    </div>
  );
}
