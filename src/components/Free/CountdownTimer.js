// ✅ FILE: src/components/Free/CountdownTimer.jsx
import React, { useEffect, useMemo, useState } from 'react';

/** Convert Timestamp | number(ms) | string -> millis or null */
function toMillis(v) {
  if (!v) return null;
  if (typeof v === 'number') return v;                 // already ms
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof v?.toMillis === 'function') return v.toMillis(); // Firestore Timestamp
  if (v?.seconds) return v.seconds * 1000;             // plain proto
  return null;
}

function fmt(n) { return n.toString().padStart(2, '0'); }

export default function CountdownTimer({ endAt, className = '' }) {
  const endMs = useMemo(() => toMillis(endAt), [endAt]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!endMs) return null;

  const diff = endMs - now;
  if (diff <= 0) {
    return <span className={`text-xs font-semibold text-gray-500 ${className}`}>Closed</span>;
  }

  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return (
    <span
      title={new Date(endMs).toLocaleString()}
      className={`text-xs font-semibold px-2 py-1 rounded bg-black/5 text-gray-800 ${className}`}
    >
      {d > 0 ? `${d}d ${fmt(h)}:${fmt(m)}:${fmt(s)}` : `${fmt(h)}:${fmt(m)}:${fmt(s)}`}
    </span>
  );
}
