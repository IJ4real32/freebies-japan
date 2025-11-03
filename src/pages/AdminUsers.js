// ✅ FILE: src/pages/AdminUsers.js (Unified Blue Sidebar Layout)
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
import {
  Menu,
  X,
  Home,
  ChevronRight,
  Search,
  Users,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const [busyRow, setBusyRow] = useState({});
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* -----------------------------------------------------------
   * Load all users
   * ----------------------------------------------------------- */
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
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* -----------------------------------------------------------
   * Search & Filter
   * ----------------------------------------------------------- */
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

  /* -----------------------------------------------------------
   * Toggle subscription
   * ----------------------------------------------------------- */
  const toggleSubscription = async (userId, currentValue) => {
    if (
      !window.confirm(
        currentValue
          ? "Set this user as NOT subscribed?"
          : "Set this user as SUBSCRIBED?"
      )
    )
      return;
    try {
      setToggling((prev) => ({ ...prev, [userId]: true }));
      await updateDoc(doc(db, "users", userId), {
        isSubscribed: !currentValue,
        updatedAt: new Date(),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isSubscribed: !currentValue } : u
        )
      );
      toast.success("Subscription status updated.");
    } catch (e) {
      console.error("Failed to toggle subscription", e);
      toast.error("Failed to update subscription flag.");
    } finally {
      setToggling((prev) => ({ ...prev, [userId]: false }));
    }
  };

  /* -----------------------------------------------------------
   * Reset trial credits
   * ----------------------------------------------------------- */
  const callResetTrial = httpsCallable(functions, "resetTrialCredits");

  const onResetTrialCredits = async (u) => {
    const raw = window.prompt(
      `Enter new total trial credits for ${u.displayName || u.email || u.id}:`,
      u.trialCreditsLeft ?? 5
    );
    if (raw == null) return;
    const credits = Number(raw);
    if (!Number.isFinite(credits)) {
      toast.error("Please enter a valid number.");
      return;
    }

    try {
      setBusyRow((p) => ({ ...p, [u.id]: true }));
      const { data } = await callResetTrial({
        targetUid: u.id,
        credits: Math.trunc(credits),
      });

      const newCredits =
        typeof data?.credits === "number"
          ? data.credits
          : Math.trunc(credits);

      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? { ...x, trialCreditsLeft: newCredits, isTrialExpired: newCredits <= 0 }
            : x
        )
      );

      toast.success(`Trial credits reset to ${newCredits}.`);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to reset trial credits.");
    } finally {
      setBusyRow((p) => ({ ...p, [u.id]: false }));
    }
  };

  /* -----------------------------------------------------------
   * UI Layout
   * ----------------------------------------------------------- */
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold tracking-wide">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-white hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">🏠 Dashboard</Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded hover:bg-white/10">📋 Requests</Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">🎁 Items</Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded hover:bg-white/10">💰 Payments</Link>
          <Link to="/admin/money-donations" className="block px-3 py-2 rounded hover:bg-white/10">❤️ Donations</Link>
          <Link to="/admin/lottery" className="block px-3 py-2 rounded hover:bg-white/10">🎰 Lottery</Link>
          <Link to="/admin/pickups" className="block px-3 py-2 rounded hover:bg-white/10">🚚 Pickups</Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded bg-white/20">👥 Users</Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 hover:text-gray-900">
              <Menu size={20} />
            </button>
            <div className="flex items-center text-sm text-gray-600">
              <Link to="/admin" className="flex items-center gap-1 hover:text-indigo-600">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} className="mx-1" />
              <span className="text-gray-800 font-medium">Users Management</span>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300">
            <Filter size={12} /> Refresh
          </button>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            {/* Filters */}
            <div className="flex flex-wrap justify-between gap-3 mb-6 items-center">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users size={22} />
                User Management
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-2.5 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, email or ID"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 pr-3 py-2 border rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-72"
                  />
                </div>

                <select
                  value={subFilter}
                  onChange={(e) => {
                    setSubFilter(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All users</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="not">Not subscribed</option>
                </select>

                <div className="text-sm text-gray-600">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Email Verified</th>
                      <th className="px-4 py-3 font-semibold">Subscription</th>
                      <th className="px-4 py-3 font-semibold text-center">Trial Credits</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
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
                        <tr key={u.id} className="border-t hover:bg-gray-50">
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
                                <div className="text-xs text-gray-500">
                                  ID: {u.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{u.email || "-"}</td>
                          <td className="px-4 py-3">
                            {u.emailVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
                                <UserCheck size={12} /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                                <UserX size={12} /> Unverified
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
                          <td className="px-4 py-3 text-center font-semibold">
                            {u.trialCreditsLeft ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() =>
                                  toggleSubscription(u.id, !!u.isSubscribed)
                                }
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
                                  ? "Unsubscribe"
                                  : "Subscribe"}
                              </button>

                              <button
                                onClick={() => onResetTrialCredits(u)}
                                disabled={!!busyRow[u.id]}
                                className="px-3 py-1 rounded text-white text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {busyRow[u.id] ? "Working…" : "Reset Trial"}
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
                        n === page
                          ? "bg-blue-600 text-white"
                          : "bg-white border hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
