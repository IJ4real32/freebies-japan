// ✅ FILE: src/pages/RequestsAdmin.js (CRITICAL FIXES APPLIED)
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs, // 🔥 FIX 1: Added missing import
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  adminUpdateRequestStatus,
  sendAdminItemStatusEmail,
} from "../services/functionsApi";
import { useNavigate, Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Menu,
  X, // 🔥 FIX 2: Added missing import
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
  Crown,
  Gift,
  Award,
  RefreshCcw,
  Users,
  Search,
  MapPin,
  Phone,
  XCircle // Keep XCircle for other uses
} from "lucide-react";
import { httpsCallable } from "firebase/functions";

/* --------------------------------------------------------
 * 🧩 Helper Functions & Configurations
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

// 🔥 FIX 6: Corrected STATUS_CONFIG with proper icons
const STATUS_CONFIG = {
  free: {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    awarded: { label: 'Awarded', color: 'bg-purple-100 text-purple-800', icon: Award },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-800', icon: Clock },
    requestClosed: { label: 'Closed', color: 'bg-gray-300 text-gray-800', icon: X }, // 🔥 FIX: Use X icon
    relisted: { label: 'Relisted', color: 'bg-blue-100 text-blue-800', icon: RefreshCcw }
  },
  premium: {
    available: { label: 'Available', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    depositPaid: { label: 'Deposit Paid', color: 'bg-yellow-100 text-yellow-800', icon: CreditCard },
    preparingDelivery: { label: 'Preparing', color: 'bg-blue-100 text-blue-800', icon: Package },
    inTransit: { label: 'In Transit', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
    sold: { label: 'Sold', color: 'bg-gray-300 text-gray-800', icon: Award }
  },
  userDonation: {
    pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    awarded: { label: 'Awarded', color: 'bg-purple-100 text-purple-800', icon: Award },
    completed: { label: 'Completed', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: X } // 🔥 FIX: Use X icon
  }
};

const ITEM_TYPES = {
  free: { label: 'Free Item', icon: Gift, color: 'text-emerald-600 bg-emerald-50' },
  premium: { label: 'Premium', icon: Crown, color: 'text-purple-600 bg-purple-50' },
  userDonation: { label: 'User Donation', icon: User, color: 'text-blue-600 bg-blue-50' },
  adminSponsored: { label: 'Admin Sponsored', icon: Award, color: 'text-orange-600 bg-orange-50' }
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

// 🔥 FIX 3: Move detectItemType to top for better readability
const detectItemType = (item) => {
  if (!item) return 'free';
  if (item.type === 'premium') return 'premium';
  if (item.donorType === 'admin' || item.isSponsored) return 'adminSponsored';
  if (item.donorType === 'user') return 'userDonation';
  return 'free';
};

/* --------------------------------------------------------
 * 🧱 Reusable Components
 * -------------------------------------------------------- */
const AdminButton = ({ label, onClick, busy, color, icon: Icon, disabled }) => (
  <button
    onClick={onClick}
    disabled={busy || disabled}
    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md shadow ${colorMap[color]} ${
      busy || disabled ? "opacity-70 cursor-not-allowed" : ""
    }`}
  >
    {busy && <Loader2 size={12} className="animate-spin" />}
    {Icon && <Icon size={12} />}
    {label}
  </button>
);

const StatusBadge = ({ status, type = "free" }) => {
  const config = STATUS_CONFIG[type]?.[status] || { label: status, color: "bg-gray-100 text-gray-800", icon: Package };
  const IconComponent = config.icon || Package;
  
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <IconComponent size={12} />
      {config.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const config = ITEM_TYPES[type] || ITEM_TYPES.free;
  const IconComponent = config.icon || Package;
  
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${config.color}`}>
      <IconComponent size={12} />
      {config.label}
    </span>
  );
};

/* --------------------------------------------------------
 * 🧭 PREMIUM CONTROL PANEL COMPONENT
 * -------------------------------------------------------- */
const PremiumControlPanel = ({ item, onStatusChange, busy }) => {
  // 🔥 FIX 7: Remove redundant cloud function declaration - use prop instead
  const handleStatusChange = async (newStatus) => {
    try {
      await onStatusChange(item, newStatus);
    } catch (error) {
      console.error('Premium status update error:', error);
      toast.error('Failed to update premium status');
    }
  };

  const getNextStatus = () => {
    const workflow = {
      available: "depositPaid",
      depositPaid: "preparingDelivery",
      preparingDelivery: "inTransit",
      inTransit: "delivered",
      delivered: "sold"
    };
    return workflow[item.premiumStatus];
  };

  const nextStatus = getNextStatus();
  const nextConfig = STATUS_CONFIG.premium[nextStatus];
  // 🔥 FIX 5: Proper dynamic icon rendering
  const NextIcon = nextConfig?.icon;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
        <Crown size={16} />
        Premium Workflow Control
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-purple-700 mb-2">Current Status</p>
          <StatusBadge status={item.premiumStatus} type="premium" />
        </div>
        
        {nextStatus && (
          <div>
            <p className="text-sm text-purple-700 mb-2">Next Step</p>
            <button
              onClick={() => handleStatusChange(nextStatus)}
              disabled={busy}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {NextIcon && <NextIcon size={14} />}
              Advance to {nextConfig?.label || nextStatus}
            </button>
          </div>
        )}
      </div>

      {/* Quick Status Selector */}
      <div className="mt-3">
        <p className="text-sm text-purple-700 mb-2">Manual Status Change</p>
        <select
          value={item.premiumStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={busy}
          className="w-full text-sm border border-purple-300 rounded px-2 py-1 bg-white"
        >
          {Object.entries(STATUS_CONFIG.premium).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/* --------------------------------------------------------
 * 🧭 MAIN COMPONENT - SYNCED WITH ADMINITEMS
 * -------------------------------------------------------- */
export default function RequestsAdmin() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 PATCH 1: URL-Based Item Filtering
  const searchParams = new URLSearchParams(location.search);
  const itemIdFilter = searchParams.get('itemId');

  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState({}); // Store item details
  const [userDetails, setUserDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionBusy, setActionBusy] = useState({});

  // Cloud Functions - 🔥 FIX 7: Single declaration
  const [onPremiumStatusAdvance] = useState(() => httpsCallable(functions, 'onPremiumStatusAdvance'));

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

    // Load Requests with enhanced filtering
    const requestsQuery = itemIdFilter 
      ? query(collection(db, "requests"), where("itemId", "==", itemIdFilter), orderBy("createdAt", "desc"))
      : query(collection(db, "requests"), orderBy("createdAt", "desc"));
    
    const requestsUnsub = onSnapshot(requestsQuery, async (snap) => {
      const requestsData = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          
          // Get item details if not already loaded
          if (data.itemId && !items[data.itemId]) {
            try {
              const itemDoc = await getDoc(doc(db, "donations", data.itemId));
              if (itemDoc.exists()) {
                const itemData = itemDoc.data();
                const itemType = detectItemType(itemData); // 🔥 FIX 3: Now available
                setItems(prev => ({
                  ...prev,
                  [data.itemId]: { ...itemData, itemType, id: data.itemId }
                }));
              }
            } catch (error) {
              console.log("Could not load item details:", error);
            }
          }

          // Get user details - 🔥 FIX 2: Use consistent method with AdminItems
          if (data.userId && !userDetails[data.userId]) {
            try {
              // 🔥 FIX 8: Use same method as AdminItems for consistency
              const userQuery = query(collection(db, 'users'), where('uid', '==', data.userId));
              const userSnapshot = await getDocs(userQuery);
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                setUserDetails(prev => ({
                  ...prev,
                  [data.userId]: {
                    name: userData.username || userData.name || "Unknown",
                    email: userData.email,
                    address: userData.addressInfo || userData.deliveryInfo || {}
                  }
                }));
              }
            } catch (error) {
              console.log("Could not load user details:", error);
            }
          }

          // 🔥 FIX 4: Normalize request records with user details
          const userDetail = userDetails[data.userId];
          return {
            ...data,
            // Ensure these fields exist for table display
            userName: data.userName || userDetail?.name || "Unknown User",
            userEmail: data.userEmail || userDetail?.email || data.userId
          };
        })
      );
      setRequests(requestsData);
      setLoading(false);
    });

    return () => requestsUnsub();
  }, [isAuthenticated, isAdmin, itemIdFilter, userDetails]);

  const getItemStatusConfig = (item) => {
    if (!item) return STATUS_CONFIG.free.active;
    const type = detectItemType(item);
    const status = type === 'premium' ? (item.premiumStatus || 'available') : (item.status || 'active');
    return STATUS_CONFIG[type]?.[status] || STATUS_CONFIG.free.active;
  };

  /* --------------------------------------------------------
   * 🎯 ENHANCED ACTION HANDLERS
   * -------------------------------------------------------- */
  
  // 🔥 FIX 7: Premium status change handler
  const handlePremiumStatusChange = async (item, newStatus) => {
    setActionBusy((s) => ({ ...s, [`premium-${item.id}`]: true }));
    try {
      await onPremiumStatusAdvance({
        itemId: item.id,
        newStatus: newStatus,
        currentStatus: item.premiumStatus
      });
      toast.success(`Premium status updated to "${newStatus}"`);
    } catch (error) {
      console.error('Premium status update error:', error);
      // Fallback to direct update
      await updateDoc(doc(db, "donations", item.id), { 
        premiumStatus: newStatus,
        updatedAt: serverTimestamp()
      });
    } finally {
      setActionBusy((s) => ({ ...s, [`premium-${item.id}`]: false }));
    }
  };

  // 🔥 PATCH 8: Sync Award Logic
  const handleAwardRequest = async (request) => {
    const item = items[request.itemId];
    if (!item) {
      toast.error("Item details not found");
      return;
    }

    if (!window.confirm(`Award "${item.title}" to ${request.userName}?`)) return;
    
    setActionBusy((s) => ({ ...s, [`award-${request.id}`]: true }));
    try {
      // Update request status
      await adminUpdateRequestStatus({ requestId: request.id, status: "awarded" });
      
      // Update item status and awardedTo
      await updateDoc(doc(db, "donations", request.itemId), {
        status: "awarded",
        awardedTo: request.userId,
        updatedAt: serverTimestamp()
      });

      // Send notifications
      await sendAdminItemStatusEmail({
        requestId: request.id,
        userEmail: request.userEmail,
        status: "awarded",
        itemTitle: item.title,
      });

      toast.success(`✅ ${request.userName} awarded "${item.title}"`);
    } catch (err) {
      console.error("Award error:", err);
      toast.error("Failed to award request");
    } finally {
      setActionBusy((s) => ({ ...s, [`award-${request.id}`]: false }));
    }
  };

  // 🔥 PATCH 6: Relist Integration
  const handleRelistItem = async (item) => {
    if (!window.confirm(`Relist "${item.title}" for 48 hours?`)) return;
    setActionBusy((s) => ({ ...s, [`relist-${item.id}`]: true }));
    try {
      const newRequestWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await updateDoc(doc(db, "donations", item.id), {
        status: "relisted",
        requestWindowEnd: newRequestWindowEnd,
        updatedAt: serverTimestamp()
      });
      toast.success(`🔄 "${item.title}" relisted for 48 hours`);
    } catch (err) {
      console.error("Relist error:", err);
      toast.error("Failed to relist item");
    } finally {
      setActionBusy((s) => ({ ...s, [`relist-${item.id}`]: false }));
    }
  };

  // 🔥 PATCH 7: User Donation Approval Flow
  const handleApproveDonation = async (item) => {
    if (!window.confirm(`Approve donation "${item.title}" for listing?`)) return;
    setActionBusy((s) => ({ ...s, [`approve-donation-${item.id}`]: true }));
    try {
      await updateDoc(doc(db, "donations", item.id), {
        status: "active",
        verified: true,
        updatedAt: serverTimestamp()
      });
      toast.success(`✅ Donation approved and listed`);
    } catch (err) {
      console.error("Approve donation error:", err);
      toast.error("Failed to approve donation");
    } finally {
      setActionBusy((s) => ({ ...s, [`approve-donation-${item.id}`]: false }));
    }
  };

  const handleRejectDonation = async (item) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    
    setActionBusy((s) => ({ ...s, [`reject-donation-${item.id}`]: true }));
    try {
      await updateDoc(doc(db, "donations", item.id), {
        status: "rejected",
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      });
      toast.success(`❌ Donation rejected`);
    } catch (err) {
      console.error("Reject donation error:", err);
      toast.error("Failed to reject donation");
    } finally {
      setActionBusy((s) => ({ ...s, [`reject-donation-${item.id}`]: false }));
    }
  };

  // Free item status changes
  const handleFreeStatusChange = async (item, newStatus) => {
    setActionBusy((s) => ({ ...s, [`status-${item.id}`]: true }));
    try {
      await updateDoc(doc(db, "donations", item.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status");
    } finally {
      setActionBusy((s) => ({ ...s, [`status-${item.id}`]: false }));
    }
  };

  /* --------------------------------------------------------
   * 📊 Filtering & Sorting (PATCH 9)
   * -------------------------------------------------------- */
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      // Status filter
      const statusMatch = filter === "all" || request.status === filter;
      
      // Search filter
      const searchMatch = 
        search === "" ||
        request.userName?.toLowerCase().includes(search.toLowerCase()) ||
        items[request.itemId]?.title?.toLowerCase().includes(search.toLowerCase()) ||
        userDetails[request.userId]?.email?.toLowerCase().includes(search.toLowerCase());

      return statusMatch && searchMatch;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt);
        case 'oldest':
          return new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt);
        case 'user':
          return (a.userName || '').localeCompare(b.userName || '');
        case 'item':
          return (items[a.itemId]?.title || '').localeCompare(items[b.itemId]?.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [requests, filter, search, sortBy, items, userDetails]);

  /* --------------------------------------------------------
   * 📊 Statistics
   * -------------------------------------------------------- */
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === "pending").length;
    const awarded = requests.filter(r => r.status === "awarded").length;
    const delivered = requests.filter(r => r.status === "delivered").length;
    const rejected = requests.filter(r => r.status === "rejected").length;
    
    return { total, pending, awarded, delivered, rejected };
  }, [requests]);

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
   * 🖥️ Render Layout - SYNCED WITH ADMINITEMS
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
            📋 Requests
          </Link>
          <Link to="/admin/items" className="block px-3 py-2 rounded hover:bg-white/10">
            🎁 Items
          </Link>
          <Link to="/admin/payments" className="block px-3 py-2 rounded hover:bg-white/10">
            💰 Payments
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
              <ChevronRight size={14} className="mx-1" /> 
              Requests
              {itemIdFilter && (
                <>
                  <ChevronRight size={14} className="mx-1" />
                  <span className="text-blue-600">Item #{itemIdFilter}</span>
                </>
              )}
            </div>
          </div>
          
          {/* 🔥 PATCH 9: Enhanced Filters */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search user, item, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="awarded">Awarded</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="user">By User</option>
              <option value="item">By Item</option>
            </select>
          </div>
        </header>

        {/* Statistics */}
        <section className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-6xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-purple-700 font-medium">Awarded</p>
              <p className="text-2xl font-bold text-purple-800">{stats.awarded}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700 font-medium">Delivered</p>
              <p className="text-2xl font-bold text-green-800">{stats.delivered}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-sm text-red-700 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
            </div>
          </div>
        </section>

        {/* Requests Table */}
        <section className="p-8">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center text-gray-500 py-6">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <p>Loading requests...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 border-b">
                    <tr>
                      <th className="p-3 text-left font-semibold">User</th>
                      <th className="p-3 text-left font-semibold">Item & Type</th>
                      <th className="p-3 text-left font-semibold">Request Status</th>
                      <th className="p-3 text-left font-semibold">Item Status</th>
                      <th className="p-3 text-left font-semibold">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          Requested
                        </div>
                      </th>
                      <th className="p-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRequests.map((request) => {
                      const item = items[request.itemId];
                      const itemType = item ? detectItemType(item) : 'free';
                      const itemStatusConfig = getItemStatusConfig(item);
                      
                      return (
                        <tr key={request.id} className={`hover:bg-gray-50 ${itemIdFilter === request.itemId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                          {/* User Info */}
                          <td className="p-3">
                            <div className="font-medium text-gray-800">
                              {/* 🔥 FIX 4: Use normalized fields */}
                              {request.userName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {request.userEmail}
                            </div>
                            {/* 🔥 PATCH 10: User Details */}
                            {userDetails[request.userId]?.address && (
                              <div className="text-xs text-gray-400 mt-1">
                                {userDetails[request.userId].address.address && (
                                  <div className="flex items-center gap-1">
                                    <MapPin size={10} />
                                    {userDetails[request.userId].address.address}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Item & Type */}
                          <td className="p-3">
                            <div className="font-medium text-gray-700">
                              {item?.title || request.itemId}
                            </div>
                            {item && (
                              <div className="flex items-center gap-2 mt-1">
                                <TypeBadge type={itemType} />
                                {item.verified && (
                                  <CheckCircle size={12} className="text-green-600" title="Verified" />
                                )}
                              </div>
                            )}
                          </td>

                          {/* Request Status */}
                          <td className="p-3">
                            <StatusBadge status={request.status} type="free" />
                          </td>

                          {/* Item Status */}
                          <td className="p-3">
                            {item ? (
                              <StatusBadge status={itemType === 'premium' ? item.premiumStatus : item.status} type={itemType} />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="p-3 text-xs text-gray-500">
                            <div className="flex flex-col">
                              <span className="font-medium">{formatDate(request.createdAt)}</span>
                              <span className="text-gray-400">{formatTimeAgo(request.createdAt)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              {/* Free Item Actions */}
                              {itemType !== 'premium' && request.status === "pending" && (
                                <AdminButton
                                  label="Award"
                                  onClick={() => handleAwardRequest(request)}
                                  busy={actionBusy[`award-${request.id}`]}
                                  color="purple"
                                  icon={Award}
                                  disabled={actionBusy[`award-${request.id}`]} // 🔥 FIX 9: Explicit disabled
                                />
                              )}

                              {/* Item Management Actions */}
                              {item && (
                                <>
                                  {/* Relist for expired/awarded free items */}
                                  {itemType === 'free' && ['expired', 'awarded'].includes(item.status) && (
                                    <AdminButton
                                      label="Relist 48h"
                                      onClick={() => handleRelistItem(item)}
                                      busy={actionBusy[`relist-${item.id}`]}
                                      color="blue"
                                      icon={RefreshCcw}
                                      disabled={actionBusy[`relist-${item.id}`]}
                                    />
                                  )}

                                  {/* Donation Approval */}
                                  {itemType === 'userDonation' && item.status === 'pending' && (
                                    <>
                                      <AdminButton
                                        label="Approve"
                                        onClick={() => handleApproveDonation(item)}
                                        busy={actionBusy[`approve-donation-${item.id}`]}
                                        color="green"
                                        icon={CheckCircle}
                                        disabled={actionBusy[`approve-donation-${item.id}`]}
                                      />
                                      <AdminButton
                                        label="Reject"
                                        onClick={() => handleRejectDonation(item)}
                                        busy={actionBusy[`reject-donation-${item.id}`]}
                                        color="red"
                                        icon={X}
                                        disabled={actionBusy[`reject-donation-${item.id}`]}
                                      />
                                    </>
                                  )}

                                  {/* Free Item Status Management */}
                                  {itemType === 'free' && (
                                    <select
                                      value={item.status || 'active'}
                                      onChange={(e) => handleFreeStatusChange(item, e.target.value)}
                                      disabled={actionBusy[`status-${item.id}`]}
                                      className="text-xs border rounded px-2 py-1"
                                    >
                                      {Object.entries(STATUS_CONFIG.free).map(([status, config]) => (
                                        <option key={status} value={status}>
                                          {config.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </>
                              )}

                              <AdminButton
                                label="Details"
                                onClick={() => setSelectedRequest(request)}
                                color="gray"
                                icon={Users}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRequests.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>No requests found</p>
                    {itemIdFilter && (
                      <button
                        onClick={() => navigate('/admin/requests')}
                        className="text-blue-600 hover:text-blue-800 mt-2"
                      >
                        View all requests
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full relative p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute top-3 right-4 text-gray-600 hover:text-gray-900 font-bold text-lg"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4">Request Details</h2>
            
            {(() => {
              const request = selectedRequest;
              const item = items[request.itemId];
              const itemType = item ? detectItemType(item) : 'free';
              const user = userDetails[request.userId];

              return (
                <div className="space-y-6">
                  {/* User Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User size={16} />
                      Requester Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{request.userName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{request.userEmail}</p>
                      </div>
                      {user?.address && (
                        <>
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">Address</p>
                            <p className="font-medium">{user.address.address || 'No address provided'}</p>
                            {user.address.phone && (
                              <p className="text-sm text-gray-600 mt-1">
                                <Phone size={14} className="inline mr-1" />
                                {user.address.phone}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Item Information */}
                  {item && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package size={16} />
                        Item Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Title</p>
                          <p className="font-medium">{item.title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <TypeBadge type={itemType} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Item Status</p>
                          <StatusBadge 
                            status={itemType === 'premium' ? item.premiumStatus : item.status} 
                            type={itemType} 
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Verified</p>
                          <div className="flex items-center gap-2">
                            {item.verified ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : (
                              <X size={16} className="text-gray-400" />
                            )}
                            <span>{item.verified ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 🔥 PATCH 4: Premium Control Panel */}
                      {itemType === 'premium' && (
                        <PremiumControlPanel 
                          item={item}
                          onStatusChange={handlePremiumStatusChange}
                          busy={actionBusy[`premium-${item.id}`]}
                        />
                      )}

                      {/* Donor/Buyer Information */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {item.donorId && (
                          <div>
                            <p className="text-sm text-gray-600">Donor</p>
                            <p className="font-medium">
                              {userDetails[item.donorId]?.name || 'Unknown Donor'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {userDetails[item.donorId]?.email || item.donorId}
                            </p>
                          </div>
                        )}
                        {item.buyerId && (
                          <div>
                            <p className="text-sm text-gray-600">Buyer</p>
                            <p className="font-medium">
                              {userDetails[item.buyerId]?.name || 'Unknown Buyer'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {userDetails[item.buyerId]?.email || item.buyerId}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Request Timeline */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Request Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Request Submitted</span>
                        <span className="text-gray-600">{formatDate(request.createdAt)}</span>
                      </div>
                      {request.lastStatusUpdate && (
                        <div className="flex justify-between text-sm">
                          <span>Last Updated</span>
                          <span className="text-gray-600">{formatDate(request.lastStatusUpdate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    {itemType !== 'premium' && request.status === "pending" && (
                      <button
                        onClick={() => {
                          handleAwardRequest(request);
                          setSelectedRequest(null);
                        }}
                        disabled={actionBusy[`award-${request.id}`]}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionBusy[`award-${request.id}`] && <Loader2 size={16} className="animate-spin" />}
                        <Award size={16} />
                        Award This Request
                      </button>
                    )}
                    
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}