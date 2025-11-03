// FILE: src/pages/HealthCheck.jsx
import React, { useEffect, useState } from "react";
import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

export default function HealthCheck() {
  const [status, setStatus] = useState("Checking…");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const ping = httpsCallable(functions, "ping"); // callable CF
        const res = await ping({ t: Date.now() });
        setStatus("✅ Backend is healthy");
        setDetail(JSON.stringify(res.data, null, 2));
      } catch (e) {
        setStatus("❌ Backend unreachable");
        setDetail(e?.message || String(e));
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Health Check</h1>
      <p className="mb-4">{status}</p>
      {detail && (
        <pre className="text-sm p-3 rounded bg-gray-100 overflow-auto">
{detail}
        </pre>
      )}
    </div>
  );
}
