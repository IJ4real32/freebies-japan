// ✅ FILE: src/pages/AdminDashboard.js - FIXED WITH LATEST isAdmin PROPERTY
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth(); // ✅ isAdmin is now a property
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

  /* --------------------------------------------------------
   * 🔐 Verify Admin - FIXED: isAdmin is now a property
   * -------------------------------------------------------- */
  useEffect(() => {
    console.log("🔍 AdminDashboard - Admin check:", {
      isAdmin: isAdmin,
      currentUser: currentUser ? { email: currentUser.email, uid: currentUser.uid } : null
    });

    if (currentUser) {
      // ✅ isAdmin is now a property, no need to call it as a function
      if (!isAdmin) {
        console.warn("⚠️ User is not admin, redirecting...");
        navigate("/unauthorized");
        return;
      }
      setLoading(false);
    }
  }, [isAdmin, currentUser, navigate]);

  /* --------------------------------------------------------
   * 📊 Real-time Listeners for Stats
   * -------------------------------------------------------- */
  useEffect(() => {
    if (!isAdmin || !currentUser) return; // ✅ Use isAdmin property directly

    console.log("📊 Starting admin real-time listeners...");

    const qRequests = query(collection(db, "requests"), where("status", "==", "pending"));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setStats((p) => ({ ...p, pendingRequests: snap.size }));
    });

    const qItems = query(collection(db, "donations"), where("status", "==", "active"));
    const unsubItems = onSnapshot(qItems, (snap) => {
      setStats((p) => ({ ...p, availableItems: snap.size }));
    });

    const qPayments = query(
      collection(db, "payments"),
      where("status", "in", ["pending", "pending_deposit"])
    );
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setStats((p) => ({ ...p, pendingPayments: snap.size }));
    });

    const qLotteries = query(collection(db, "lotteries"), where("status", "==", "open"));
    const unsubLotteries = onSnapshot(qLotteries, (snap) => {
      setStats((p) => ({ ...p, activeLotteries: snap.size }));
    });

    const qDonations = query(
      collection(db, "moneyDonations"),
      where("status", "in", ["pending", "reported"])
    );
    const unsubDonations = onSnapshot(qDonations, (snap) => {
      setStats((p) => ({ ...p, pendingDonations: snap.size }));
    });

    // Active Users count
    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const activeUsers = snap.docs.filter(doc => {
        const userData = doc.data();
        return userData.isSubscribed || (userData.trialCreditsLeft ?? 0) > 0;
      }).length;
      setStats((p) => ({ ...p, activeUsers }));
    });

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
      unsubUsers();
      unsubDeliveries();
    };
  }, [isAdmin, currentUser]); // ✅ Use isAdmin property directly

  /* --------------------------------------------------------
   * ⏳ Loading Spinner
   * -------------------------------------------------------- */
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

  /* --------------------------------------------------------
   * 🧭 Dashboard Layout
   * -------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔷 Compact Admin Top Bar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 text-white shadow-lg backdrop-blur-md">
        <div className="flex justify-between items-center px-6 py-4">
          <div
            onClick={() => navigate("/items")}
            className="flex items-center gap-3 cursor-pointer select-none hover:opacity-90 transition-opacity"
          >
            <img src="/LogoX.png" alt="Freebies Japan" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="font-bold text-xl tracking-wide">Freebies Japan Admin</h1>
              <p className="text-blue-200 text-sm">Welcome, {currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/items")}
              className="bg-white/10 hover:bg-white/20 text-sm px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              ← Back to Main App
            </button>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Full width without container constraints */}
      <main className="pt-24 p-6 w-full">
        <div className="w-full space-y-8">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage your platform and monitor real-time activity
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/create-donation")}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
            >
              + Create Sponsored Item
            </button>
          </div>

          {/* Navigation Grid - Desktop First */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Management Sections</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              <AdminCard
                to="/admin/requests"
                title="Manage Requests"
                desc="View and approve item requests"
                color="blue"
                badge={stats.pendingRequests > 0 ? stats.pendingRequests : null}
              />
              <AdminCard
                to="/admin/users"
                title="User Management"
                desc="Manage user accounts and permissions"
                color="gray"
                badge={stats.activeUsers > 0 ? stats.activeUsers : null}
              />
              <AdminCard
                to="/admin/items"
                title="Item Management"
                desc="Manage donated items"
                color="green"
                badge={stats.availableItems > 0 ? stats.availableItems : null}
              />
              <AdminCard
                to="/admin/payments"
                title="Payments & Deposits"
                desc="Approve or reject deposit reports"
                color="amber"
                badge={stats.pendingPayments > 0 ? stats.pendingPayments : null}
              />
              <AdminCard
                to="/admin/money-donations"
                title="Money Donations"
                desc="Verify user support payments"
                color="teal"
                badge={stats.pendingDonations > 0 ? stats.pendingDonations : null}
              />
              <AdminCard
                to="/admin/lottery"
                title="Lottery Management"
                desc="Monitor and trigger auto lotteries"
                color="purple"
                badge={stats.activeLotteries > 0 ? stats.activeLotteries : null}
              />
              <AdminCard
                to="/admin/pickups"
                title="Deliveries & Pickups"
                desc="Manage and schedule item handovers"
                color="orange"
                badge={stats.upcomingDeliveries > 0 ? stats.upcomingDeliveries : null}
              />
            </div>
          </section>

          {/* Stats Overview */}
          <section className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Quick Stats (Live Updates)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
        </div>
      </main>
    </div>
  );
};

/* --------------------------------------------------------
 * 🧩 Small Subcomponents - FIXED with explicit color classes
 * -------------------------------------------------------- */
const AdminCard = ({ to, title, desc, color, badge }) => {
  // Map color names to actual Tailwind classes
  const colorClasses = {
    blue: "border-blue-400 hover:border-blue-600 text-blue-600",
    gray: "border-gray-400 hover:border-gray-600 text-gray-600", 
    green: "border-green-400 hover:border-green-600 text-green-600",
    amber: "border-amber-400 hover:border-amber-600 text-amber-600",
    teal: "border-teal-400 hover:border-teal-600 text-teal-600",
    purple: "border-purple-400 hover:border-purple-600 text-purple-600",
    orange: "border-orange-400 hover:border-orange-600 text-orange-600",
  };

  const badgeColors = {
    blue: "bg-blue-600",
    gray: "bg-gray-600",
    green: "bg-green-600", 
    amber: "bg-amber-600",
    teal: "bg-teal-600",
    purple: "bg-purple-600",
    orange: "bg-orange-600",
  };

  return (
    <Link
      to={to}
      className={`relative bg-white p-8 rounded-xl shadow hover:shadow-xl transition-all duration-300 border-l-4 group hover:scale-105 ${colorClasses[color]}`}
    >
      {badge && (
        <span
          className={`absolute top-4 right-4 text-white text-sm px-3 py-1 rounded-full font-semibold shadow ${badgeColors[color]}`}
        >
          {badge}
        </span>
      )}
      <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-gray-900 transition-colors">
        {title}
      </h2>
      <p className="text-gray-600 text-lg mb-4">{desc}</p>
      <div className={`font-semibold text-lg flex items-center gap-2 ${colorClasses[color].split(' ')[2]}`}>
        Open 
        <span className="group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  );
};

const Stat = ({ label, value, color }) => {
  const colorClasses = {
    blue: "text-blue-700",
    gray: "text-gray-700", 
    green: "text-green-700",
    amber: "text-amber-700",
    teal: "text-teal-700",
    purple: "text-purple-700",
    orange: "text-orange-700",
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <h3 className="text-gray-500 text-sm font-medium mb-2">{label}</h3>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
};

export default AdminDashboard;