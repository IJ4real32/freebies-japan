// ✅ FILE: src/pages/RequestsAdmin.js (UNIFIED LIFECYCLE MANAGEMENT)
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  adminUpdateRequestStatus,
  sendAdminItemStatusEmail,
} from "../services/functionsApi";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Menu,
  X,
  Home,
  ChevronRight,
  Filter,
  Loader2,
  Clock,
  Calendar,
  Package,
  Truck,
  CheckCircle,
  CreditCard,
  User,
  Mail,
  MapPin,
  Crown,
  Award,
  RefreshCcw,
} from "lucide-react";
import { httpsCallable } from "firebase/functions";

/* --------------------------------------------------------
 * 🧩 Helper Functions
 * -------------------------------------------------------- */
const formatDate = (v) => {
  if (!v) return "—";
  const d = v?.toDate?.() || new Date(v);
  return d.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeAgo = (v) => {
  if (!v) return "—";
  const d = v?.toDate?.() || new Date(v);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(v);
};

const statusColors = {
  pending: "bg-gray-100 text-gray-700",
  approved: "bg-blue-100 text-blue-800",
  awarded: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  lost: "bg-red-100 text-red-800",
};

const premiumStatusColors = {
  available: "bg-green-100 text-green-800",
  depositPaid: "bg-yellow-100 text-yellow-800",
  preparingDelivery: "bg-blue-100 text-blue-800",
  inTransit: "bg-purple-100 text-purple-800",
  delivered: "bg-indigo-100 text-indigo-800",
  sold: "bg-gray-100 text-gray-800",
};

const donationStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  listed: "bg-blue-100 text-blue-800",
  awarded: "bg-purple-100 text-purple-800",
  completed: "bg-indigo-100 text-indigo-800",
};

const colorMap = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  red: "bg-red-600 hover:bg-red-700 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white",
  gray: "bg-gray-500 hover:bg-gray-600 text-white",
  yellow: "bg-yellow-500 hover:bg-yellow-600 text-white",
  orange: "bg-orange-500 hover:bg-orange-600 text-white",
};

/* --------------------------------------------------------
 * 🧱 Reusable Components
 * -------------------------------------------------------- */
const AdminButton = ({ label, onClick, busy, color, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={busy}
    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md shadow ${colorMap[color]} ${
      busy ? "opacity-70 cursor-wait" : ""
    }`}
  >
    {busy && <Loader2 size={12} className="animate-spin" />}
    {Icon && <Icon size={12} />}
    {label}
  </button>
);

const StatusBadge = ({ status, type = "free" }) => {
  const getStatusConfig = () => {
    if (type === "premium") {
      return {
        color: premiumStatusColors[status] || "bg-gray-100 text-gray-800",
        label: status || "available"
      };
    }
    if (type === "donation") {
      return {
        color: donationStatusColors[status] || "bg-gray-100 text-gray-800",
        label: status || "pending"
      };
    }
    return {
      color: statusColors[status] || "bg-gray-100 text-gray-800",
      label: status || "pending"
    };
  };

  const config = getStatusConfig();

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const TabButton = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-indigo-600 text-white shadow-sm"
        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
    }`}
  >
    {children}
    {count !== undefined && (
      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
        active ? "bg-white text-indigo-600" : "bg-gray-100 text-gray-600"
      }`}>
        {count}
      </span>
    )}
  </button>
);

/* --------------------------------------------------------
 * 🧭 MAIN COMPONENT - UNIFIED LIFECYCLE MANAGEMENT
 * -------------------------------------------------------- */
export default function RequestsAdmin() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("free"); // free, premium, donations
  const [requests, setRequests] = useState([]);
  const [premiumItems, setPremiumItems] = useState([]);
  const [userDonations, setUserDonations] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [actionBusy, setActionBusy] = useState({});

  // Cloud Functions
  const [onAwardDonation] = useState(() => httpsCallable(functions, 'onAwardDonation'));
  const [onPremiumStatusAdvance] = useState(() => httpsCallable(functions, 'onPremiumStatusAdvance'));
  const [onPickupBooking] = useState(() => httpsCallable(functions, 'onPickupBooking'));
  const [sendUserNotification] = useState(() => httpsCallable(functions, 'sendUserNotification'));
  const [sendAdminNotification] = useState(() => httpsCallable(functions, 'sendAdminNotification'));

  /* --------------------------------------------------------
   * 🔐 Guard: Only admins can access
   * -------------------------------------------------------- */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    if (!isAdmin) {
      navigate("/unauthorized");
      return;
    }
  }, [isAuthenticated, isAdmin, navigate]);

  /* --------------------------------------------------------
   * 📡 Load ALL Data in Real-time
   * -------------------------------------------------------- */
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    setLoading(true);

    // Load Free Requests
    const requestsQuery = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc")
    );
    
    const requestsUnsub = onSnapshot(requestsQuery, async (snap) => {
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const enriched = await Promise.all(
        base.map(async (r) => {
          if (!r.userName && r.userId) {
            try {
              const u = await getDoc(doc(db, "users", r.userId));
              if (u.exists()) {
                const udata = u.data();
                return {
                  ...r,
                  userName: udata.username || udata.name || udata.email?.split("@")[0] || "Anonymous",
                  userEmail: udata.email || r.userEmail,
                  type: "free"
                };
              }
            } catch {}
          }
          return { ...r, type: "free" };
        })
      );
      setRequests(enriched);
    });

    // Load Premium Items
    const premiumQuery = query(
      collection(db, "donations"),
      where("type", "==", "premium"),
      orderBy("createdAt", "desc")
    );
    
    const premiumUnsub = onSnapshot(premiumQuery, async (snap) => {
      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          // Get buyer info for purchased items
          let buyerInfo = null;
          if (data.premiumStatus !== "available") {
            try {
              const buyerSnap = await getDoc(doc(db, "users", data.buyerId));
              if (buyerSnap.exists()) {
                buyerInfo = buyerSnap.data();
              }
            } catch (error) {
              console.log("No buyer info found");
            }
          }
          
          return {
            id: d.id,
            ...data,
            type: "premium",
            buyerInfo
          };
        })
      );
      setPremiumItems(items);
    });

    // Load User Donations
    const donationsQuery = query(
      collection(db, "donations"),
      where("donorType", "==", "user"),
      orderBy("createdAt", "desc")
    );
    
    const donationsUnsub = onSnapshot(donationsQuery, async (snap) => {
      const donations = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          // Get donor info
          let donorInfo = null;
          if (data.donorId) {
            try {
              const donorSnap = await getDoc(doc(db, "users", data.donorId));
              if (donorSnap.exists()) {
                donorInfo = donorSnap.data();
              }
            } catch (error) {
              console.log("No donor info found");
            }
          }
          
          return {
            id: d.id,
            ...data,
            type: "donation",
            donorInfo
          };
        })
      );
      setUserDonations(donations);
    });

    // Set loading false after initial load
    setTimeout(() => setLoading(false), 1000);

    return () => {
      requestsUnsub();
      premiumUnsub();
      donationsUnsub();
    };
  }, [isAuthenticated, isAdmin]);

  /* --------------------------------------------------------
   * 🎯 FREE REQUEST ACTIONS
   * -------------------------------------------------------- */
  const handleManualApprove = async (req) => {
    if (!window.confirm(`Approve ${req.userName} for "${req.itemTitle}"?`)) return;
    setActionBusy((s) => ({ ...s, [`approve-${req.id}`]: true }));
    try {
      await adminUpdateRequestStatus({ requestId: req.id, status: "awarded" });
      await sendAdminItemStatusEmail({
        requestId: req.id,
        userEmail: req.userEmail,
        status: "awarded",
        itemTitle: req.itemTitle,
      });
      toast.success(`✅ ${req.userName} approved for delivery.`);
    } catch (err) {
      console.error("Manual approve error:", err);
      toast.error("Failed to approve request.");
    } finally {
      setActionBusy((s) => ({ ...s, [`approve-${req.id}`]: false }));
    }
  };

  const handleRejectRequest = async (req) => {
    if (!window.confirm(`Reject ${req.userName}'s request for "${req.itemTitle}"?`)) return;
    setActionBusy((s) => ({ ...s, [`reject-${req.id}`]: true }));
    try {
      await adminUpdateRequestStatus({ requestId: req.id, status: "rejected" });
      await sendAdminItemStatusEmail({
        requestId: req.id,
        userEmail: req.userEmail,
        status: "rejected",
        itemTitle: req.itemTitle,
      });
      toast.success(`❌ Request rejected.`);
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Failed to reject request.");
    } finally {
      setActionBusy((s) => ({ ...s, [`reject-${req.id}`]: false }));
    }
  };

  const handleMarkDelivered = async (req) => {
    setActionBusy((s) => ({ ...s, [`deliver-${req.id}`]: true }));
    try {
      await adminUpdateRequestStatus({ requestId: req.id, status: "delivered" });
      await sendAdminItemStatusEmail({
        requestId: req.id,
        userEmail: req.userEmail,
        status: "delivered",
        itemTitle: req.itemTitle,
      });
      toast.success(`📦 "${req.itemTitle}" marked delivered.`);
    } catch (e) {
      console.error("Mark delivered error:", e);
      toast.error("Failed to mark delivered.");
    } finally {
      setActionBusy((s) => ({ ...s, [`deliver-${req.id}`]: false }));
    }
  };

  const handleRelistItem = async (req) => {
    if (!window.confirm(`Relist item "${req.itemTitle}" for new requests?`)) return;
    setActionBusy((s) => ({ ...s, [`relist-${req.id}`]: true }));
    try {
      // This would call a cloud function to reopen the item
      await sendUserNotification({
        userId: req.userId,
        title: "Item Relisted",
        message: `The item "${req.itemTitle}" has been relisted for new requests.`
      });
      toast.success(`🔄 Item relisted successfully.`);
    } catch (err) {
      console.error("Relist error:", err);
      toast.error("Failed to relist item.");
    } finally {
      setActionBusy((s) => ({ ...s, [`relist-${req.id}`]: false }));
    }
  };

  /* --------------------------------------------------------
   * 🚀 PREMIUM ITEM ACTIONS
   * -------------------------------------------------------- */
  const handlePremiumStatusChange = async (item, newStatus) => {
    setActionBusy((s) => ({ ...s, [`premium-${item.id}`]: true }));
    try {
      await onPremiumStatusAdvance({
        itemId: item.id,
        newStatus: newStatus,
        currentStatus: item.premiumStatus
      });

      // Update local state immediately
      await updateDoc(doc(db, "donations", item.id), {
        premiumStatus: newStatus,
        updatedAt: new Date()
      });

      // Notify buyer
      if (item.buyerId) {
        await sendUserNotification({
          userId: item.buyerId,
          title: "Order Status Updated",
          message: `Your order "${item.title}" is now ${newStatus}.`
        });
      }

      toast.success(`✅ Premium status updated to "${newStatus}"`);
    } catch (err) {
      console.error("Premium status update error:", err);
      toast.error("Failed to update premium status.");
    } finally {
      setActionBusy((s) => ({ ...s, [`premium-${item.id}`]: false }));
    }
  };

  /* --------------------------------------------------------
   * 🎁 USER DONATION ACTIONS
   * -------------------------------------------------------- */
  const handleApproveDonation = async (donation) => {
    if (!window.confirm(`Approve donation "${donation.title}" for listing?`)) return;
    setActionBusy((s) => ({ ...s, [`approve-donation-${donation.id}`]: true }));
    try {
      await updateDoc(doc(db, "donations", donation.id), {
        status: "active",
        verified: true,
        updatedAt: new Date()
      });

      await sendUserNotification({
        userId: donation.donorId,
        title: "Donation Approved!",
        message: `Your donation "${donation.title}" has been approved and is now listed.`
      });

      toast.success(`✅ Donation approved and listed.`);
    } catch (err) {
      console.error("Approve donation error:", err);
      toast.error("Failed to approve donation.");
    } finally {
      setActionBusy((s) => ({ ...s, [`approve-donation-${donation.id}`]: false }));
    }
  };

  const handleRejectDonation = async (donation) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    
    setActionBusy((s) => ({ ...s, [`reject-donation-${donation.id}`]: true }));
    try {
      await updateDoc(doc(db, "donations", donation.id), {
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date()
      });

      await sendUserNotification({
        userId: donation.donorId,
        title: "Donation Not Approved",
        message: `Your donation "${donation.title}" was not approved. Reason: ${reason}`
      });

      toast.success(`❌ Donation rejected.`);
    } catch (err) {
      console.error("Reject donation error:", err);
      toast.error("Failed to reject donation.");
    } finally {
      setActionBusy((s) => ({ ...s, [`reject-donation-${donation.id}`]: false }));
    }
  };

  const handleAwardDonation = async (donation, winnerRequest) => {
    if (!window.confirm(`Award "${donation.title}" to ${winnerRequest.userName}?`)) return;
    setActionBusy((s) => ({ ...s, [`award-${donation.id}`]: true }));
    try {
      await onAwardDonation({
        donationId: donation.id,
        winnerRequestId: winnerRequest.id,
        winnerUserId: winnerRequest.userId
      });

      toast.success(`🏆 Donation awarded to ${winnerRequest.userName}`);
    } catch (err) {
      console.error("Award donation error:", err);
      toast.error("Failed to award donation.");
    } finally {
      setActionBusy((s) => ({ ...s, [`award-${donation.id}`]: false }));
    }
  };

  const handleSchedulePickup = async (donation) => {
    const pickupDate = prompt("Enter pickup date (YYYY-MM-DD):");
    const pickupTime = prompt("Enter pickup time (HH:MM):");
    
    if (!pickupDate || !pickupTime) return;
    
    setActionBusy((s) => ({ ...s, [`pickup-${donation.id}`]: true }));
    try {
      await onPickupBooking({
        donationId: donation.id,
        donorId: donation.donorId,
        pickupDate: `${pickupDate} ${pickupTime}`,
        pickupAddress: donation.donorInfo?.address
      });

      await sendUserNotification({
        userId: donation.donorId,
        title: "Pickup Scheduled",
        message: `Pickup for your donation "${donation.title}" scheduled for ${pickupDate} at ${pickupTime}.`
      });

      toast.success(`🚚 Pickup scheduled successfully.`);
    } catch (err) {
      console.error("Schedule pickup error:", err);
      toast.error("Failed to schedule pickup.");
    } finally {
      setActionBusy((s) => ({ ...s, [`pickup-${donation.id}`]: false }));
    }
  };

  /* --------------------------------------------------------
   * 👤 User Details Modal (Existing)
   * -------------------------------------------------------- */
  const handleViewUser = async (uid) => {
    setActionBusy((s) => ({ ...s, view: uid }));
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const user = snap.exists() ? snap.data() : {};
      const reqsSnap = await getDocs(
        query(collection(db, "requests"), where("userId", "==", uid))
      );
      const all = reqsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const normalize = (s = "") => s.toLowerCase().trim();
      const total = all.length;
      const won = all.filter((r) =>
        ["approved", "awarded"].includes(normalize(r.status))
      ).length;
      const lost = all.filter((r) =>
        ["rejected", "lost"].includes(normalize(r.status))
      ).length;
      const delivered = all.filter((r) =>
        ["delivered", "completed"].includes(normalize(r.status))
      ).length;

      setUserDetails({
        name: user.username || user.name || "Unnamed",
        email: user.email,
        total,
        approved: won,
        rejected: lost,
        delivered,
        address: user.addressInfo || user.deliveryInfo || {},
        requests: all,
      });
    } catch (err) {
      console.error("View user error:", err);
      toast.error("Failed to load user info.");
    } finally {
      setActionBusy((s) => ({ ...s, view: null }));
    }
  };

  /* --------------------------------------------------------
   * 📊 Statistics & Filtering
   * -------------------------------------------------------- */
  const stats = useMemo(() => {
    const freeStats = {
      total: requests.length,
      pending: requests.filter(r => (r.status || "pending") === "pending").length,
      awarded: requests.filter(r => ["approved", "awarded"].includes(r.status || "")).length,
      delivered: requests.filter(r => ["delivered", "completed"].includes(r.status || "")).length,
    };

    const premiumStats = {
      total: premiumItems.length,
      available: premiumItems.filter(p => p.premiumStatus === "available").length,
      inProgress: premiumItems.filter(p => 
        ["depositPaid", "preparingDelivery", "inTransit"].includes(p.premiumStatus)
      ).length,
      delivered: premiumItems.filter(p => p.premiumStatus === "delivered").length,
      sold: premiumItems.filter(p => p.premiumStatus === "sold").length,
    };

    const donationStats = {
      total: userDonations.length,
      pending: userDonations.filter(d => d.status === "pending").length,
      approved: userDonations.filter(d => d.status === "active").length,
      awarded: userDonations.filter(d => d.status === "awarded").length,
      completed: userDonations.filter(d => d.status === "completed").length,
    };

    return { free: freeStats, premium: premiumStats, donations: donationStats };
  }, [requests, premiumItems, userDonations]);

  const filteredData = useMemo(() => {
    if (activeTab === "free") {
      let result = requests;
      if (filter !== "all") {
        result = result.filter(r => (r.status || "pending") === filter);
      }
      return result.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime;
      });
    }

    if (activeTab === "premium") {
      let result = premiumItems;
      if (filter !== "all") {
        result = result.filter(p => p.premiumStatus === filter);
      }
      return result.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime;
      });
    }

    if (activeTab === "donations") {
      let result = userDonations;
      if (filter !== "all") {
        result = result.filter(d => d.status === filter);
      }
      return result.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime;
      });
    }

    return [];
  }, [activeTab, filter, requests, premiumItems, userDonations]);

  const getFilterOptions = () => {
    switch (activeTab) {
      case "free":
        return [
          { value: "all", label: "All Requests" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "awarded", label: "Awarded" },
          { value: "delivered", label: "Delivered" },
          { value: "rejected", label: "Rejected" }
        ];
      case "premium":
        return [
          { value: "all", label: "All Premium" },
          { value: "available", label: "Available" },
          { value: "depositPaid", label: "Deposit Paid" },
          { value: "preparingDelivery", label: "Preparing Delivery" },
          { value: "inTransit", label: "In Transit" },
          { value: "delivered", label: "Delivered" },
          { value: "sold", label: "Sold" }
        ];
      case "donations":
        return [
          { value: "all", label: "All Donations" },
          { value: "pending", label: "Pending Approval" },
          { value: "active", label: "Active" },
          { value: "awarded", label: "Awarded" },
          { value: "completed", label: "Completed" },
          { value: "rejected", label: "Rejected" }
        ];
      default:
        return [];
    }
  };

  /* --------------------------------------------------------
   * ⏳ Loading State for Non-Admins
   * -------------------------------------------------------- */
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------
   * 🖥️ Render Layout - UNIFIED INTERFACE
   * -------------------------------------------------------- */
  return (
    <div className="flex min-h-screen bg-gray-100">
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
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-white/10">
            🏠 Dashboard
          </Link>
          <Link to="/admin/requests" className="block px-3 py-2 rounded bg-white/20">
            📋 Unified Requests
          </Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">
            🎁 Items
          </Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded hover:bg-white/10">
            💰 Payments
          </Link>
          <Link to="/admin/money-donations" className="block px-3 py-2 rounded hover:bg-white/10">
            ❤️ Money Donations
          </Link>
          <Link to="/admin/pickups" className="block px-3 py-2 rounded hover:bg-white/10">
            🚚 Pickups
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-white/10">
            👥 Users
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-30 border-b">
          <div className="flex items-center gap-2">
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
              <ChevronRight size={14} className="mx-1" /> Unified Requests
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              {getFilterOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Tab Navigation */}
        <section className="p-4 bg-white border-b">
          <div className="flex gap-2 mb-4">
            <TabButton 
              active={activeTab === "free"} 
              onClick={() => { setActiveTab("free"); setFilter("all"); }}
              count={stats.free.total}
            >
              📋 Free Requests
            </TabButton>
            <TabButton 
              active={activeTab === "premium"} 
              onClick={() => { setActiveTab("premium"); setFilter("all"); }}
              count={stats.premium.total}
            >
              👑 Premium Orders
            </TabButton>
            <TabButton 
              active={activeTab === "donations"} 
              onClick={() => { setActiveTab("donations"); setFilter("all"); }}
              count={stats.donations.total}
            >
              🎁 User Donations
            </TabButton>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {activeTab === "free" && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.free.total}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-yellow-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.free.pending}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">Awarded</p>
                  <p className="text-2xl font-bold text-green-800">{stats.free.awarded}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-purple-700 font-medium">Delivered</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.free.delivered}</p>
                </div>
              </>
            )}
            {activeTab === "premium" && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.premium.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">Available</p>
                  <p className="text-2xl font-bold text-green-800">{stats.premium.available}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-yellow-700 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.premium.inProgress}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-purple-700 font-medium">Delivered</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.premium.delivered}</p>
                </div>
              </>
            )}
            {activeTab === "donations" && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.donations.total}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-yellow-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.donations.pending}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-800">{stats.donations.approved}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-purple-700 font-medium">Awarded</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.donations.awarded}</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Data Table */}
        <section className="p-8">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center text-gray-500 py-6">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <p>Loading {activeTab} data...</p>
              </div>
            ) : error ? (
              <p className="text-red-600 p-4">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 border-b">
                    <tr>
                      {activeTab === "free" && (
                        <>
                          <th className="px-4 py-3 text-left font-semibold">User</th>
                          <th className="px-4 py-3 text-left font-semibold">Item</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-left font-semibold">
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              Requested
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">Updated</th>
                          <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </>
                      )}
                      {activeTab === "premium" && (
                        <>
                          <th className="px-4 py-3 text-left font-semibold">Item</th>
                          <th className="px-4 py-3 text-left font-semibold">Buyer</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-left font-semibold">Price</th>
                          <th className="px-4 py-3 text-left font-semibold">Created</th>
                          <th className="px-4 py-3 text-right font-semibold">Update Status</th>
                        </>
                      )}
                      {activeTab === "donations" && (
                        <>
                          <th className="px-4 py-3 text-left font-semibold">Item</th>
                          <th className="px-4 py-3 text-left font-semibold">Donor</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-left font-semibold">Delivery</th>
                          <th className="px-4 py-3 text-left font-semibold">Created</th>
                          <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {/* FREE REQUESTS ROW */}
                        {activeTab === "free" && (
                          <>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">
                                {item.userName || "—"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.userEmail}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {item.itemTitle || item.itemId}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status} type="free" />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              <div className="flex flex-col">
                                <span className="font-medium">{formatDate(item.createdAt)}</span>
                                <span className="text-gray-400">{formatTimeAgo(item.createdAt)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              <div className="flex flex-col">
                                <span>{formatDate(item.lastStatusUpdate)}</span>
                                <span className="text-gray-400">{formatTimeAgo(item.lastStatusUpdate)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2 flex-wrap">
                                {item.status === "pending" && (
                                  <>
                                    <AdminButton
                                      label="Approve"
                                      onClick={() => handleManualApprove(item)}
                                      busy={actionBusy[`approve-${item.id}`]}
                                      color="green"
                                      icon={CheckCircle}
                                    />
                                    <AdminButton
                                      label="Reject"
                                      onClick={() => handleRejectRequest(item)}
                                      busy={actionBusy[`reject-${item.id}`]}
                                      color="red"
                                      icon={X}
                                    />
                                  </>
                                )}
                                {["approved", "awarded"].includes(item.status) && (
                                  <>
                                    <AdminButton
                                      label="Delivered"
                                      onClick={() => handleMarkDelivered(item)}
                                      busy={actionBusy[`deliver-${item.id}`]}
                                      color="blue"
                                      icon={Truck}
                                    />
                                    <AdminButton
                                      label="Relist"
                                      onClick={() => handleRelistItem(item)}
                                      busy={actionBusy[`relist-${item.id}`]}
                                      color="purple"
                                      icon={RefreshCcw}
                                    />
                                  </>
                                )}
                                <AdminButton
                                  label="View User"
                                  onClick={() => handleViewUser(item.userId)}
                                  busy={actionBusy.view === item.userId}
                                  color="gray"
                                  icon={User}
                                />
                              </div>
                            </td>
                          </>
                        )}

                        {/* PREMIUM ORDERS ROW */}
                        {activeTab === "premium" && (
                          <>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-gray-500">ID: {item.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              {item.buyerInfo ? (
                                <>
                                  <div className="font-medium text-gray-800">
                                    {item.buyerInfo.username || item.buyerInfo.name || "—"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.buyerInfo.email}
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.premiumStatus} type="premium" />
                            </td>
                            <td className="px-4 py-3 font-semibold text-indigo-600">
                              ¥{item.price?.toLocaleString() || "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <select
                                value={item.premiumStatus || "available"}
                                onChange={(e) => handlePremiumStatusChange(item, e.target.value)}
                                disabled={actionBusy[`premium-${item.id}`]}
                                className="border rounded px-2 py-1 text-xs"
                              >
                                <option value="available">Available</option>
                                <option value="depositPaid">Deposit Paid</option>
                                <option value="preparingDelivery">Preparing Delivery</option>
                                <option value="inTransit">In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="sold">Sold</option>
                              </select>
                            </td>
                          </>
                        )}

                        {/* USER DONATIONS ROW */}
                        {activeTab === "donations" && (
                          <>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-gray-500">{item.category}</div>
                            </td>
                            <td className="px-4 py-3">
                              {item.donorInfo ? (
                                <>
                                  <div className="font-medium text-gray-800">
                                    {item.donorInfo.username || item.donorInfo.name || "—"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.donorInfo.email}
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status} type="donation" />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {item.delivery === "pickup" ? (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  Pickup: {item.pickupLocation || "N/A"}
                                </span>
                              ) : (
                                <span>Delivery</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2 flex-wrap">
                                {item.status === "pending" && (
                                  <>
                                    <AdminButton
                                      label="Approve"
                                      onClick={() => handleApproveDonation(item)}
                                      busy={actionBusy[`approve-donation-${item.id}`]}
                                      color="green"
                                      icon={CheckCircle}
                                    />
                                    <AdminButton
                                      label="Reject"
                                      onClick={() => handleRejectDonation(item)}
                                      busy={actionBusy[`reject-donation-${item.id}`]}
                                      color="red"
                                      icon={X}
                                    />
                                  </>
                                )}
                                {item.status === "active" && (
                                  <AdminButton
                                    label="Award"
                                    onClick={() => {/* You would implement winner selection here */}}
                                    busy={actionBusy[`award-${item.id}`]}
                                    color="purple"
                                    icon={Award}
                                  />
                                )}
                                {item.delivery === "pickup" && (
                                  <AdminButton
                                    label="Schedule Pickup"
                                    onClick={() => handleSchedulePickup(item)}
                                    busy={actionBusy[`pickup-${item.id}`]}
                                    color="orange"
                                    icon={Truck}
                                  />
                                )}
                                <AdminButton
                                  label="View Donor"
                                  onClick={() => handleViewUser(item.donorId)}
                                  busy={actionBusy.view === item.donorId}
                                  color="gray"
                                  icon={User}
                                />
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>No {activeTab} items found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* User Details Modal (Keep existing) */}
      {userDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setUserDetails(null)}
              className="absolute top-3 right-4 text-gray-600 hover:text-gray-900 font-bold text-lg"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-3">User Details</h2>
            <p className="text-sm text-gray-700 mb-1">{userDetails.name}</p>
            <p className="text-xs text-gray-500 mb-4">{userDetails.email}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">📋 Total</p>
                <p className="font-bold text-gray-800">{userDetails.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-700">🏆 Won</p>
                <p className="font-bold text-green-800">{userDetails.approved}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-700">❌ Lost</p>
                <p className="font-bold text-red-800">{userDetails.rejected}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-700">📦 Delivered</p>
                <p className="font-bold text-blue-800">{userDetails.delivered}</p>
              </div>
            </div>
            {userDetails.address && (
              <div className="bg-gray-50 p-3 rounded-lg mb-3 text-sm text-gray-700">
                <p>{userDetails.address.address || "No address on file"}</p>
                {userDetails.address.phone && <p>📞 {userDetails.address.phone}</p>}
              </div>
            )}
            <h3 className="font-semibold text-gray-700 mb-2">Recent Requests</h3>
            <ul className="divide-y max-h-48 overflow-y-auto border rounded-md">
              {userDetails.requests.map((r) => (
                <li key={r.id} className="p-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">
                      {r.itemTitle || r.itemId}
                    </span>
                    <StatusBadge status={r.status} type="free" />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDate(r.createdAt)} • {formatTimeAgo(r.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}