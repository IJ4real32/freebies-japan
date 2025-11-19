// ✅ FILE: src/pages/Admin/PaymentsQueue.jsx
import React, { useEffect, useState } from "react";
import PaymentReviewCard from "./PaymentReviewCard";
import { adminGetPaymentQueue } from "../../services/functionsApi";
import toast from "react-hot-toast";
import { checkAdminStatus } from "../../utils/adminUtils";

export default function PaymentsQueue() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("reported"); // reported | pending | all
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      try {
        const status = filter === "all" ? undefined : filter;
        const res = await adminGetPaymentQueue(status);
        if (res?.payments) {
          setPayments(res.payments);
        } else {
          setPayments([]);
        }
      } catch (err) {
        console.error("Error fetching payment queue:", err);
        toast.error("Failed to load payments.");
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, [filter]);

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const hay = `${p.id} ${p.userId || ""} ${p.userEmail || ""} ${
      p.transferName || ""
    } ${p.method || ""}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Deposit Payments</h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="reported">Reported</option>
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search id / user / transfer name"
            className="border rounded px-2 py-1 text-sm w-56"
          />
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-600 border rounded p-4 bg-white">
          Loading payments…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600 border rounded p-4 bg-white">
          No payments in this queue.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <PaymentReviewCard key={p.id} paymentId={p.id} />
          ))}
        </div>
      )}
    </div>
  );
}
