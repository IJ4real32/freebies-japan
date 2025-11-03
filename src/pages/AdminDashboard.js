// ✅ FILE: src/pages/AdminDashboard.js
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState(false);
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

  /* --------------------------------------------------------
   * 🔐 Verify Admin
   * -------------------------------------------------------- */
  useEffect(() => {
    const checkAdminStatus = async () => {
      const admin = await isAdmin();
      setAdminStatus(admin);
      setLoading(false);
      if (!admin) navigate("/unauthorized");
    };
    checkAdminStatus();
  }, [isAdmin, navigate]);

  /* --------------------------------------------------------
   * 📊 Real-time Listeners for Stats
   * -------------------------------------------------------- */
  useEffect(() => {
    if (!adminStatus) return;

    const qRequests = query(collection(db, "requests"), where("status", "==", "pending"));
    const unsubRequests = onSnapshot(qRequests, (snap) =>
      setStats((p) => ({ ...p, pendingRequests: snap.size }))
    );

    const qItems = query(collection(db, "donations"), where("status", "==", "active"));
    const unsubItems = onSnapshot(qItems, (snap) =>
      setStats((p) => ({ ...p, availableItems: snap.size }))
    );

    const qPayments = query(
      collection(db, "payments"),
      where("status", "in", ["pending", "pending_deposit"])
    );
    const unsubPayments = onSnapshot(qPayments, (snap) =>
      setStats((p) => ({ ...p, pendingPayments: snap.size }))
    );

    const qLotteries = query(collection(db, "lotteries"), where("status", "==", "open"));
    const unsubLotteries = onSnapshot(qLotteries, (snap) =>
      setStats((p) => ({ ...p, activeLotteries: snap.size }))
    );

    const qDonations = query(
      collection(db, "moneyDonations"),
      where("status", "in", ["pending", "reported"])
    );
    const unsubDonations = onSnapshot(qDonations, (snap) =>
      setStats((p) => ({ ...p, pendingDonations: snap.size }))
    );

    // 🚚 Pickups/Deliveries
    const qDeliveries = query(
      collection(db, "pickups"),
      where("status", "==", "scheduled"),
      orderBy("scheduledDate", "asc")
    );
    const unsubDeliveries = onSnapshot(qDeliveries, (snap) => {
      const now = new Date();
      let upcoming = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        const date =
          data.scheduledDate?.seconds
            ? new Date(data.scheduledDate.seconds * 1000)
            : new Date(data.scheduledDate);
        const diff = (date - now) / (1000 * 60 * 60);
        if (diff > 0 && diff <= 24) upcoming++;
      });
      setStats((p) => ({
        ...p,
        upcomingDeliveries: upcoming,
      }));

      if (upcoming > 0) {
        toast.success(`🚚 ${upcoming} delivery${upcoming > 1 ? "ies" : ""} within 24h`);
      }
    });

    return () => {
      unsubRequests();
      unsubItems();
      unsubPayments();
      unsubLotteries();
      unsubDonations();
      unsubDeliveries();
    };
  }, [adminStatus]);

  /* --------------------------------------------------------
   * ⏳ Loading Spinner
   * -------------------------------------------------------- */
  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  /* --------------------------------------------------------
   * 🧭 Dashboard Layout
   * -------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔷 Compact Admin Top Bar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 text-white shadow-lg backdrop-blur-md">
        <div className="flex justify-between items-center px-4 py-3">
          <div
            onClick={() => navigate("/items")}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <img src="/LogoX.png" alt="Freebies Japan" className="h-10 w-auto object-contain" />
            <h1 className="font-bold text-lg tracking-wide hidden sm:block">
              Freebies Japan Admin
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/items")}
              className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1.5 rounded-full transition"
            >
              ← Back to Main App
            </button>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-full transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
          <AdminCard
            to="/admin/requests"
            title="Manage Requests"
            desc="View and approve item requests"
            color="blue"
          />
          <AdminCard
            to="/admin/users"
            title="User Management"
            desc="Manage user accounts and permissions"
            color="gray"
          />
          <AdminCard
            to="/admin/items"
            title="Item Management"
            desc="Manage donated items"
            color="green"
          />
          <AdminCard
            to="/admin/payments"
            title="Payments & Deposits"
            desc="Approve or reject deposit reports"
            color="amber"
          />
          <AdminCard
            to="/admin/money-donations"
            title="Money Donations"
            desc="Verify user support payments"
            color="teal"
          />
          <AdminCard
            to="/admin/lottery"
            title="Lottery Management"
            desc="Monitor and trigger auto lotteries"
            color="purple"
          />
          <AdminCard
            to="/admin/pickups"
            title="Deliveries & Pickups"
            desc="Manage and schedule item handovers"
            color="orange"
            badge={stats.upcomingDeliveries > 0 ? stats.upcomingDeliveries : null}
          />
        </div>

        {/* Stats Overview */}
        <section className="mt-12 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Quick Stats (Live)</h2>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Stat label="Pending Requests" value={stats.pendingRequests} color="blue" />
            <Stat label="Active Users" value={stats.activeUsers} color="gray" />
            <Stat label="Available Items" value={stats.availableItems} color="green" />
            <Stat label="Pending Payments" value={stats.pendingPayments} color="amber" />
            <Stat label="Active Lotteries" value={stats.activeLotteries} color="purple" />
            <Stat label="Pending Donations" value={stats.pendingDonations} color="teal" />
            <Stat
              label="Upcoming Deliveries (24h)"
              value={stats.upcomingDeliveries}
              color="orange"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

/* --------------------------------------------------------
 * 🧩 Small Subcomponents
 * -------------------------------------------------------- */
const AdminCard = ({ to, title, desc, color, badge }) => (
  <Link
    to={to}
    className={`relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-${color}-400 hover:border-${color}-600`}
  >
    {badge && (
      <span
        className={`absolute top-3 right-4 bg-${color}-600 text-white text-xs px-2 py-0.5 rounded-full`}
      >
        {badge}
      </span>
    )}
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-gray-600">{desc}</p>
    <div className={`mt-4 text-${color}-600 text-sm font-medium`}>Open →</div>
  </Link>
);

const Stat = ({ label, value, color }) => (
  <div className="bg-gray-50 p-4 rounded shadow-sm border">
    <h3 className="text-gray-500 text-sm">{label}</h3>
    <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
  </div>
);

export default AdminDashboard;
