// ✅ FILE: src/pages/Admin/PaymentsQueue.jsx (UNIFIED OPTION A — FINAL)
import React, { useEffect, useState } from "react";
import PaymentReviewCard from "./PaymentReviewCard";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import toast from "react-hot-toast";

export default function PaymentsQueue() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all"); // unified default
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------
  // FIRESTORE REAL-TIME PAYMENT LISTENER
  // -------------------------------------------------------
  useEffect(() => {
    // Listen to ALL payments
    const q = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setPayments(arr);
        setLoading(false);
      },
      (err) => {
        console.error("Payments listener error:", err);
        toast.error("Failed to load payments.");
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  // -------------------------------------------------------
  // FILTER LOGIC (UNIFIED OPTION A)
  // -------------------------------------------------------
  const applyFilter = (p) => {
    if (filter === "all") return true;

    // Premium deposit statuses
    if (filter === "deposit_pending") {
      return p.method !== "cash_on_delivery" && p.status === "pending";
    }
    if (filter === "deposit_reported") {
      return p.method !== "cash_on_delivery" && p.status === "reported";
    }
    if (filter === "deposit_confirmed") {
      return p.method !== "cash_on_delivery" && p.status === "confirmed";
    }
    if (filter === "deposit_rejected") {
      return p.method !== "cash_on_delivery" && p.status === "rejected";
    }

    // COD statuses
    if (filter === "cod_pending") {
      return p.method === "cash_on_delivery" && p.status === "pending_cod_confirmation";
    }
    if (filter === "cod_delivered") {
      return p.method === "cash_on_delivery" && p.status === "delivered";
    }

    return true;
  };

  // -------------------------------------------------------
  // SEARCH FILTER
  // -------------------------------------------------------
  const filtered = payments.filter((p) => {
    if (!applyFilter(p)) return false;

    if (!search) return true;

    const hay = [
      p.id,
      p.userId,
      p.userEmail,
      p.itemTitle,
      p.method,
      p.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(search.toLowerCase());
  });

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Payments (Premium + COD)</h2>

        <div className="flex gap-2">
          {/* FILTERS */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>

            {/* Premium */}
            <optgroup label="Deposit Payments">
              <option value="deposit_pending">Pending (Deposit)</option>
              <option value="deposit_reported">Reported</option>
              <option value="deposit_confirmed">Confirmed</option>
              <option value="deposit_rejected">Rejected</option>
            </optgroup>

            {/* COD */}
            <optgroup label="COD Payments">
              <option value="cod_pending">Pending COD Confirmation</option>
              <option value="cod_delivered">Delivered</option>
            </optgroup>
          </select>

          {/* SEARCH */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm w-56"
            placeholder="Search payment, email, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* LOADING */}
      {loading ? (
        <div className="text-sm text-gray-600 border rounded p-4 bg-white">
          Loading payments…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600 border rounded p-4 bg-white">
          No payments match this filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <PaymentReviewCard
              key={p.id}
              paymentId={p.id}
              ticketId={null} // adminInbox no longer needed
              payment={p}
            />
          ))}
        </div>
      )}
    </div>
  );
}
