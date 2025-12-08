// ✅ FILE: src/pages/AdminDashboard.js (PHASE 2 — OPTION B FINAL)

import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";
import toast from "react-hot-toast";

/* ───────────────────────────────────────────────
   MAIN COMPONENT
   ─────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    activeUsers: 0,
    availableItems: 0,
    pendingPayments: 0,
    activeLotteries: 0,
    pendingDonations: 0,
    upcomingDeliveries: 0,
  });

  /* ───────────────────────────────────────────────
     🔐 Verify Admin Access
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (currentUser) {
      if (!isAdmin) {
        navigate("/unauthorized");
        return;
      }
      setLoading(false);
    }
  }, [currentUser, isAdmin, navigate]);

  /* ───────────────────────────────────────────────
     📊 Real-Time Stats Listeners (Option B logic)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    /* Pending Requests */
    const unsubRequests = onSnapshot(
      query(collection(db, "requests"), where("status", "==", "pending")),
      (snap) => setStats((p) => ({ ...p, pendingRequests: snap.size }))
    );

    /* Available Items */
    const unsubItems = onSnapshot(
      query(collection(db, "donations"), where("status", "==", "active")),
      (snap) => setStats((p) => ({ ...p, availableItems: snap.size }))
    );

    /* Phase-2 Pending Payment Statuses (Option B) */
    const unsubPayments = onSnapshot(
      query(
        collection(db, "payments"),
        where("status", "in", [
          "pending",
          "reported",
          "pending_cod_confirmation"
        ])
      ),
      (snap) => setStats((p) => ({ ...p, pendingPayments: snap.size }))
    );

    /* Lotteries */
    const unsubLotteries = onSnapshot(
      query(collection(db, "lotteries"), where("status", "==", "open")),
      (snap) => setStats((p) => ({ ...p, activeLotteries: snap.size }))
    );

    /* Money Donations */
    const unsubDonations = onSnapshot(
      query(
        collection(db, "moneyDonations"),
        where("status", "in", ["pending", "reported"])
      ),
      (snap) => setStats((p) => ({ ...p, pendingDonations: snap.size }))
    );

    /* Active Users */
    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
      const activeUsers = snap.docs.filter((d) => {
        const u = d.data();
        return u.isSubscribed || (u.trialCreditsLeft ?? 0) > 0;
      }).length;
      setStats((p) => ({ ...p, activeUsers }));
    });

    /* Deliveries in Next 24 Hours */
    const unsubDeliveries = onSnapshot(
      query(
        collection(db, "pickups"),
        where("status", "==", "scheduled"),
        orderBy("scheduledDate", "asc")
      ),
      (snap) => {
        const now = new Date();
        let upcoming = 0;
        snap.forEach((d) => {
          const data = d.data();
          const scheduled = data.scheduledDate?.seconds
            ? new Date(data.scheduledDate.seconds * 1000)
            : new Date(data.scheduledDate);
          const diffHours = (scheduled - now) / 36e5;
          if (diffHours > 0 && diffHours <= 24) upcoming++;
        });
        setStats((p) => ({ ...p, upcomingDeliveries: upcoming }));
      }
    );

    return () => {
      unsubRequests();
      unsubItems();
      unsubPayments();
      unsubLotteries();
      unsubDonations();
      unsubUsers();
      unsubDeliveries();
    };
  }, [currentUser, isAdmin]);

  /* ───────────────────────────────────────────────
     Loading State
     ─────────────────────────────────────────────── */
  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-lg">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────────────
     MAIN DASHBOARD UI
     ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 text-white shadow-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <div
            onClick={() => navigate("/items")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90"
          >
            <img src="/LogoX.png" className="h-12 object-contain" alt="Freebies Logo" />
            <div>
              <h1 className="font-bold text-xl">Freebies Japan Admin</h1>
              <p className="text-blue-200 text-sm">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/items")}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm"
            >
              ← Back to App
            </button>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN UI */}
      <main className="pt-24 p-6 space-y-10 w-full max-w-7xl mx-auto">

        {/* Heading */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 text-lg mt-2">Monitor live activity across the platform</p>
          </div>

          <button
            onClick={() => navigate("/admin/create-donation")}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 text-white rounded-xl shadow-md"
          >
            + Create Sponsored Item
          </button>
        </div>

        {/* Admin Navigation Cards */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Management Sections</h2>

          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">

            <AdminCard
              to="/admin/requests"
              title="Manage Requests"
              desc="Handle all free item requests"
              color="blue"
              badge={stats.pendingRequests}
            />

            <AdminCard
              to="/admin/users"
              title="User Accounts"
              desc="Manage user roles, activity & subscriptions"
              color="gray"
              badge={stats.activeUsers}
            />

            <AdminCard
              to="/admin/items"
              title="Item Management"
              desc="Review, approve & manage donated items"
              color="green"
              badge={stats.availableItems}
            />

            <AdminCard
              to="/admin/payments"
              title="Payments & Deposits"
              desc="Approve deposit reports & COD confirmations"
              color="amber"
              badge={stats.pendingPayments}
            />

            <AdminCard
              to="/admin/money-donations"
              title="Money Donations"
              desc="Verify support donations"
              color="teal"
              badge={stats.pendingDonations}
            />

            <AdminCard
              to="/admin/lottery"
              title="Lottery Management"
              desc="Manage and run lotteries"
              color="purple"
              badge={stats.activeLotteries}
            />

            <AdminCard
              to="/admin/pickups"
              title="Deliveries & Pickups"
              desc="Monitor upcoming handovers"
              color="orange"
              badge={stats.upcomingDeliveries}
            />

          </div>
        </section>

        {/* Stats Overview */}
        <section className="bg-white p-8 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-6">Quick Stats</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            <Stat label="Pending Requests" value={stats.pendingRequests} color="blue" />
            <Stat label="Active Users" value={stats.activeUsers} color="gray" />
            <Stat label="Available Items" value={stats.availableItems} color="green" />
            <Stat label="Pending Payments" value={stats.pendingPayments} color="amber" />
            <Stat label="Active Lotteries" value={stats.activeLotteries} color="purple" />
            <Stat label="Pending Donations" value={stats.pendingDonations} color="teal" />
            <Stat label="Upcoming Deliveries (24h)" value={stats.upcomingDeliveries} color="orange" />

          </div>
        </section>
      </main>
    </div>
  );
}

/* ───────────────────────────────────────────────
   SUBCOMPONENTS
   ─────────────────────────────────────────────── */

const colorMap = {
  blue: "border-blue-400 text-blue-600",
  gray: "border-gray-400 text-gray-600",
  green: "border-green-400 text-green-600",
  amber: "border-amber-400 text-amber-600",
  teal: "border-teal-400 text-teal-600",
  purple: "border-purple-400 text-purple-600",
  orange: "border-orange-400 text-orange-600",
};

const badgeMap = {
  blue: "bg-blue-600",
  gray: "bg-gray-600",
  green: "bg-green-600",
  amber: "bg-amber-600",
  teal: "bg-teal-600",
  purple: "bg-purple-600",
  orange: "bg-orange-600",
};

function AdminCard({ to, title, desc, color, badge }) {
  return (
    <Link
      to={to}
      className={`relative bg-white p-8 rounded-xl shadow border-l-4 hover:shadow-xl group transition-all duration-300 hover:scale-105 ${colorMap[color]}`}
    >
      {badge > 0 && (
        <span
          className={`absolute top-4 right-4 text-white px-3 py-1 rounded-full text-sm font-semibold shadow ${badgeMap[color]}`}
        >
          {badge}
        </span>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{desc}</p>
      <span className="font-semibold text-lg">Open →</span>
    </Link>
  );
}

function Stat({ label, value, color }) {
  const statColor = {
    blue: "text-blue-700",
    gray: "text-gray-700",
    green: "text-green-700",
    amber: "text-amber-700",
    teal: "text-teal-700",
    purple: "text-purple-700",
    orange: "text-orange-700",
  }[color];

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="text-gray-500 text-sm">{label}</h3>
      <p className={`text-3xl font-bold ${statColor}`}>{value}</p>
    </div>
  );
}
