// ✅ FILE: src/components/Free/TimeProgress.jsx
import React, { useMemo } from 'react';

function toMillis(v) {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (v?.seconds) return v.seconds * 1000;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export default function TimeProgress({ startAt, endAt }) {
  const start = useMemo(() => toMillis(startAt), [startAt]);
  const end = useMemo(() => toMillis(endAt), [endAt]);
  if (!start || !end || end <= start) return null;

  const now = Date.now();
  const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full bg-gray-200 rounded">
        <div
          className="h-1.5 bg-indigo-600 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
