// ✅ FILE: src/pages/AdminDashboard.js (Finalized with Tailwind-safe colors)
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
   * 🔐 Verify Admin Access
   * -------------------------------------------------------- */
  useEffect(() => {
    const verify = async () => {
      const ok = await isAdmin();
      setAdminStatus(ok);
      setLoading(false);
      if (!ok) navigate("/unauthorized");
    };
    verify();
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

    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const active = snap.docs.filter((d) => {
        const u = d.data();
        return u.isSubscribed || (u.trialCreditsLeft ?? 0) > 0;
      }).length;
      setStats((p) => ({ ...p, activeUsers: active }));
    });

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
        const date = data.scheduledDate?.seconds
          ? new Date(data.scheduledDate.seconds * 1000)
          : new Date(data.scheduledDate);
        const diff = (date - now) / (1000 * 60 * 60);
        if (diff > 0 && diff <= 24) upcoming++;
      });
      setStats((p) => ({ ...p, upcomingDeliveries: upcoming }));

      if (upcoming > 0)
        toast.success(`🚚 ${upcoming} delivery${upcoming > 1 ? "ies" : ""} within 24h`);
    });

    return () => {
      unsubRequests();
      unsubItems();
      unsubPayments();
      unsubLotteries();
      unsubDonations();
      unsubUsers();
      unsubDeliveries();
    };
  }, [adminStatus]);

  /* --------------------------------------------------------
   * 🌀 Loading
   * -------------------------------------------------------- */
  if (loading || !currentUser)
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );

  /* --------------------------------------------------------
   * 🧭 Dashboard Layout
   * -------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Top Bar */}
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
              ← Back
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
      <main className="pt-20 container mx-auto p-4 pb-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={() => navigate("/admin/create-donation")}
            className="hidden sm:block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
          >
            + Create Sponsored Item
          </button>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
          {adminCards(stats).map((c) => (
            <AdminCard key={c.to} {...c} />
          ))}
        </div>

        {/* Stats Overview */}
        <section className="mt-12 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Quick Stats (Live)</h2>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {statCards(stats).map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </section>
      </main>

      {/* Floating Button */}
      <button
        onClick={() => navigate("/admin/create-donation")}
        className="fixed bottom-6 right-6 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-3xl font-bold shadow-lg hover:shadow-2xl transition-all duration-300 sm:hidden"
        title="Create Sponsored Item"
      >
        +
      </button>
    </div>
  );
};

/* --------------------------------------------------------
 * 🧩 Subcomponents & Helpers
 * -------------------------------------------------------- */
const colorMap = {
  blue: "text-blue-600 border-blue-400",
  gray: "text-gray-600 border-gray-400",
  green: "text-green-600 border-green-400",
  amber: "text-amber-600 border-amber-400",
  teal: "text-teal-600 border-teal-400",
  purple: "text-purple-600 border-purple-400",
  orange: "text-orange-600 border-orange-400",
};

const AdminCard = ({ to, title, desc, color, badge }) => {
  const colors = colorMap[color] || "text-gray-600 border-gray-400";
  return (
    <Link
      to={to}
      className={`relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 ${colors.split(" ")[1]} hover:${colors.split(" ")[0]}`}
    >
      {badge && (
        <span
          className={`absolute top-3 right-4 px-2 py-0.5 text-xs rounded-full bg-${color}-600 text-white`}
        >
          {badge}
        </span>
      )}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{desc}</p>
      <div className={`mt-4 ${colors.split(" ")[0]} text-sm font-medium`}>Open →</div>
    </Link>
  );
};

const Stat = ({ label, value, color }) => {
  const colors = colorMap[color] || "text-gray-600 border-gray-400";
  return (
    <div className="bg-gray-50 p-4 rounded shadow-sm border">
      <h3 className="text-gray-500 text-sm">{label}</h3>
      <p className={`text-2xl font-bold ${colors.split(" ")[0]}`}>{value}</p>
    </div>
  );
};

const adminCards = (stats) => [
  { to: "/admin/requests", title: "Manage Requests", desc: "View & approve item requests", color: "blue" },
  { to: "/admin/users", title: "User Management", desc: "Manage users & permissions", color: "gray" },
  { to: "/admin/items", title: "Item Management", desc: "Manage donated items", color: "green" },
  { to: "/admin/payments", title: "Payments & Deposits", desc: "Approve or reject deposits", color: "amber" },
  { to: "/admin/money-donations", title: "Money Donations", desc: "Verify support payments", color: "teal" },
  { to: "/admin/lottery", title: "Lottery Management", desc: "Monitor auto lotteries", color: "purple" },
  {
    to: "/admin/pickups",
    title: "Deliveries & Pickups",
    desc: "Manage & schedule deliveries",
    color: "orange",
    badge: stats.upcomingDeliveries > 0 ? stats.upcomingDeliveries : null,
  },
];

const statCards = (stats) => [
  { label: "Pending Requests", value: stats.pendingRequests, color: "blue" },
  { label: "Active Users", value: stats.activeUsers, color: "gray" },
  { label: "Available Items", value: stats.availableItems, color: "green" },
  { label: "Pending Payments", value: stats.pendingPayments, color: "amber" },
  { label: "Active Lotteries", value: stats.activeLotteries, color: "purple" },
  { label: "Pending Donations", value: stats.pendingDonations, color: "teal" },
  { label: "Upcoming Deliveries (24h)", value: stats.upcomingDeliveries, color: "orange" },
];

export default AdminDashboard;
