// ✅ FILE: src/components/Free/EndsSoonBadge.jsx
import React, { useMemo } from 'react';

/**
 * Shows a small red/orange pill when remainingMs <= threshold (default 2h) and > 0.
 * Props:
 * - endAt: Timestamp | ISO string | ms
 * - thresholdMs?: number (default 2 hours)
 */
export default function EndsSoonBadge({ endAt, thresholdMs = 2 * 60 * 60 * 1000 }) {
  const remaining = useMemo(() => {
    if (!endAt) return null;
    const endMs =
      typeof endAt?.toMillis === 'function'
        ? endAt.toMillis()
        : typeof endAt === 'number'
        ? endAt
        : new Date(endAt).getTime();
    if (isNaN(endMs)) return null;
    return Math.max(0, endMs - Date.now());
  }, [endAt]);

  if (remaining == null || remaining === 0 || remaining > thresholdMs) return null;

  return (
    <span className="ml-2 inline-block text-[11px] px-2 py-0.5 rounded-full bg-red-600 text-white">
      Ends soon
    </span>
  );
}
