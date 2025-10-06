// ✅ FILE: src/pages/AdminUsers.js
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import BackToDashboardButton from "../components/Admin/BackToDashboardButton";
import Navbar from "../components/UI/Navbar";

const PAGE_SIZE = 10;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all"); // all | subscribed | not
  const [busyRow, setBusyRow] = useState({}); // row-level spinner

  // Load users
  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snap =
          (await getDocs(q).catch(async () => null)) ||
          (await getDocs(collection(db, "users")));
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setUsers(data);
      } catch (e) {
        console.error("Failed to load users", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filtering + paging
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !s ||
        (u.displayName || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.userName || "").toLowerCase().includes(s) ||
        (u.id || "").toLowerCase().includes(s);

      const isSub = !!u.isSubscribed;
      const matchesFilter =
        subFilter === "all" ||
        (subFilter === "subscribed" && isSub) ||
        (subFilter === "not" && !isSub);

      return matchesSearch && matchesFilter;
    });
  }, [users, search, subFilter]);

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const badgeClasses = (isSub) =>
    isSub ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";

  // Toggle isSubscribed directly for quick testing (firestore write)
  const toggleSubscription = async (userId, currentValue) => {
    if (!window.confirm(currentValue ? "Set as NOT subscribed?" : "Set as SUBSCRIBED?")) return;
    try {
      setToggling((prev) => ({ ...prev, [userId]: true }));
      await updateDoc(doc(db, "users", userId), {
        isSubscribed: !currentValue,
        updatedAt: new Date(),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isSubscribed: !currentValue } : u))
      );
    } catch (e) {
      console.error("Failed to toggle subscription", e);
      alert("Failed to update subscription flag.");
    } finally {
      setToggling((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // ✅ Callables
  const callTopUp = httpsCallable(functions, "adminTopUpTrialCredits");
  const callToggleTestSub = httpsCallable(functions, "adminSetTestSubscriber");

  const onTopUpTrial = async (u) => {
    const raw = window.prompt(
      `Top-up amount for ${u.displayName || u.email || u.id} (can be negative):`,
      "5"
    );
    if (raw == null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) {
      alert("Please enter a valid number.");
      return;
    }
    try {
      setBusyRow((p) => ({ ...p, [u.id]: true }));
      const { data } = await callTopUp({
        targetUid: u.id,
        amount: Math.trunc(amount),
      });

      // Keep local list in sync — IMPORTANT: use trialCreditsLeft (not trialCredits)
      const newBalance =
        typeof data?.newBalance === "number" ? data.newBalance : undefined;

      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? {
                ...x,
                trialCreditsLeft:
                  typeof newBalance === "number"
                    ? newBalance
                    : (x.trialCreditsLeft || 0) + Math.trunc(amount),
              }
            : x
        )
      );
      alert("Trial credits updated.");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Top-up failed.");
    } finally {
      setBusyRow((p) => ({ ...p, [u.id]: false }));
    }
  };

  const onToggleTestSubscriber = async (u) => {
    try {
      setBusyRow((p) => ({ ...p, [u.id]: true }));
      const value = !u.testSubscriber;
      const { data } = await callToggleTestSub({
        targetUid: u.id,
        value,
        alsoSetIsSubscribed: true, // mirror for UI gating
      });
      const next = !!data?.testSubscriber;

      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, testSubscriber: next, isSubscribed: next } : x
        )
      );
      alert(
        `Test subscriber set to ${next ? "ENABLED" : "DISABLED"} for ${
          u.displayName || u.email || u.id
        }`
      );
    } catch (e) {
      console.error(e);
      alert(e?.message || "Toggle failed.");
    } finally {
      setBusyRow((p) => ({ ...p, [u.id]: false }));
    }
  };

  return (
    <>
      {/* Hide Navbar in Admin Views */}
      <Navbar isTransparent={false} hideOnAdmin />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <BackToDashboardButton />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-6">
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by name, email or ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-80 border rounded px-3 py-2 text-sm"
            />
            <select
              value={subFilter}
              onChange={(e) => {
                setSubFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">All users</option>
              <option value="subscribed">Subscribed</option>
              <option value="not">Not subscribed</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Email Verified</th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th className="px-4 py-3 font-semibold">Test Sub</th>
                  <th className="px-4 py-3 font-semibold">Trial Credits</th>
                  <th className="px-4 py-3 font-semibold">Ends</th>
                  <th className="px-4 py-3 font-semibold w-[420px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                      Loading users…
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || "/avatars/avatar1.png"}
                            alt={u.displayName || u.userName || "User"}
                            className="w-10 h-10 rounded-full object-cover border"
                            onError={(e) => {
                              e.currentTarget.src = "/avatars/avatar1.png";
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              {u.displayName || u.userName || "Unnamed User"}
                            </div>
                            <div className="text-xs text-gray-500">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{u.email || "-"}</td>
                      <td className="px-4 py-3">
                        {u.emailVerified ? (
                          <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full ${badgeClasses(
                            !!u.isSubscribed
                          )}`}
                        >
                          {u.isSubscribed ? "Subscribed" : "Not Subscribed"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.testSubscriber ? (
                          <span className="inline-block px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                            Off
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {typeof u.trialCreditsLeft === "number" ? u.trialCreditsLeft : 0}
                      </td>
                      <td className="px-4 py-3">
                        {u.subscriptionEndsAt?.toDate
                          ? u.subscriptionEndsAt.toDate().toLocaleDateString()
                          : u.subscriptionEndsAt
                          ? new Date(u.subscriptionEndsAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleSubscription(u.id, !!u.isSubscribed)}
                            disabled={!!toggling[u.id] || !!busyRow[u.id]}
                            className={`px-3 py-1 rounded text-white text-xs ${
                              u.isSubscribed
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-blue-600 hover:bg-blue-700"
                            } disabled:opacity-50`}
                          >
                            {toggling[u.id]
                              ? "Updating…"
                              : u.isSubscribed
                              ? "Set Not Subscribed"
                              : "Set Subscribed"}
                          </button>

                          <button
                            onClick={() => onToggleTestSubscriber(u)}
                            disabled={!!busyRow[u.id]}
                            className="px-3 py-1 rounded text-white text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                          >
                            {busyRow[u.id]
                              ? "Working…"
                              : u.testSubscriber
                              ? "Disable Test"
                              : "Enable Test"}
                          </button>

                          <button
                            onClick={() => onTopUpTrial(u)}
                            disabled={!!busyRow[u.id]}
                            className="px-3 py-1 rounded text-white text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busyRow[u.id] ? "Working…" : "Top-up Trial"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-3 border-t bg-gray-50">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded text-sm ${
                    n === page ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminUsers;
