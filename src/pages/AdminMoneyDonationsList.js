// ✅ FILE: src/pages/AdminMoneyDonationsList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminGetMoneyDonationsQueue } from "../services/functionsApi";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { isAdmin } from "../utils/adminUtils";
import { Menu, X, Home, ChevronRight, RefreshCcw } from "lucide-react";

export default function AdminMoneyDonationsList() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  /* ---------------------------------------------------------
   * Load Donations (Admin Protected)
   * --------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const ok = await isAdmin();
        if (!ok) {
          navigate("/unauthorized");
          return;
        }

        const res = await adminGetMoneyDonationsQueue();
        let items = res?.donations || [];

        // Enrich with user info (fallback)
        const enriched = await Promise.all(
          items.map(async (d) => {
            if ((!d.userName || !d.userEmail) && d.userId) {
              try {
                const userSnap = await getDoc(doc(db, "users", d.userId));
                if (userSnap.exists()) {
                  const u = userSnap.data();
                  return {
                    ...d,
                    userName:
                      u.username ||
                      u.displayName ||
                      u.name ||
                      (u.email ? u.email.split("@")[0] : "Anonymous"),
                    userEmail: u.email || d.userEmail || "—",
                  };
                }
              } catch (err) {
                console.warn("⚠️ Skipped user enrichment for", d.userId, err);
              }
            }
            return {
              ...d,
              userName:
                d.userName ||
                d.userEmail?.split("@")[0] ||
                "Anonymous",
              userEmail: d.userEmail || "—",
            };
          })
        );

        setDonations(enriched);
      } catch (err) {
        console.error("Failed to load donations:", err);
        setError(err.message || "Failed to load donations");
        toast.error("Failed to load donations queue.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  /* ---------------------------------------------------------
   * Helpers
   * --------------------------------------------------------- */
  const formatAmount = (a) => {
    try {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(a ?? 0);
    } catch {
      return `${a ?? 0} JPY`;
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    const d = new Date(v.seconds ? v.seconds * 1000 : v);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("ja-JP", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const reloadList = async () => {
    try {
      setLoading(true);
      const res = await adminGetMoneyDonationsQueue();
      setDonations(res?.donations || []);
      toast.success("List refreshed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh list");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
   * UI
   * --------------------------------------------------------- */
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* ---------------- Sidebar ---------------- */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold tracking-wide">Admin Panel</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-3 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">
            🏠 Dashboard
          </Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded hover:bg-white/10">
            📋 Requests
          </Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">
            🎁 Items
          </Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded hover:bg-white/10">
            💰 Payments
          </Link>
          <Link
            to="/admin/money-donations"
            className="block px-3 py-2 rounded bg-white/20"
          >
            ❤️ Money Donations
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">
            👥 Users
          </Link>
        </nav>
      </aside>

      {/* ---------------- Main Content ---------------- */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center text-sm text-gray-600">
              <Link to="/admin" className="flex items-center gap-1 hover:text-indigo-600">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} className="mx-1" />
              <span className="text-gray-800 font-medium">
                Money Donations Queue
              </span>
            </div>
          </div>

          <button
            onClick={reloadList}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
          >
            <RefreshCcw size={12} /> Refresh
          </button>
        </header>

        {/* Body */}
        <section className="p-8">
          <div className="bg-white shadow-md border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Money Donations Queue</h1>

            {loading ? (
              <div className="text-gray-500 text-center py-10">
                Loading donations…
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                {error}
              </div>
            ) : donations.length === 0 ? (
              <div className="text-gray-500 text-center py-10">
                No donations found.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-left text-gray-700">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{d.userName || "Anonymous"}</div>
                          <div className="text-xs text-gray-500">{d.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatAmount(d.amountJPY ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              d.status === "verified"
                                ? "bg-green-100 text-green-700"
                                : d.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : d.status === "reported"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {d.status || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(d.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/admin/money-donations/${d.id}`}
                            className="text-blue-600 hover:underline text-sm font-medium"
                          >
                            View Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
