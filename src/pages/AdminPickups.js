// ✅ FILE: src/pages/AdminPickups.js (CLEAN, FULLY PATCHED)
import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { checkAdminStatus } from "../utils/adminUtils";
import {
  CheckCircle,
  XCircle,
  Truck,
  Search,
  Menu,
  X,
  Home,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Package,
  ClipboardCopy,
  Clock,
  Calendar,
  Filter,
  MapPin,
  Phone,
  MessageSquare,
  User,
  Shield,
} from "lucide-react";

export default function AdminPickups() {
  const { isAdmin, isAuthenticated, currentUser } = useAuth();

  const [pickups, setPickups] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [activeView, setActiveView] = useState("pickups");
  const [permissionError, setPermissionError] = useState(false);

  const [callableFunctions, setCallableFunctions] = useState({
    sendStatusUpdate: null,
    triggerShipment: null,
  });

  // Initialize callable functions
  useEffect(() => {
    const functions = getFunctions();
    setCallableFunctions({
      sendStatusUpdate: httpsCallable(functions, "sendStatusUpdate"),
      triggerShipment: httpsCallable(functions, "triggerShipment"),
    });
  }, []);

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAccess = async () => {
      try {
        const adminStatus = await checkAdminStatus(currentUser);
        if (!adminStatus) {
          setPermissionError(true);
          setLoading(false);
          return;
        }
        loadData();
      } catch (err) {
        console.error(err);
        setPermissionError(true);
        setLoading(false);
      }
    };

    checkAccess();
  }, [isAuthenticated, currentUser]);

  // Load data
  const loadData = () => {
    setLoading(true);

    // 📦 Pickups
    const pickupsQuery = query(
      collection(db, "pickups"),
      orderBy("createdAt", "desc")
    );

    const unsubPickups = onSnapshot(
      pickupsQuery,
      (snap) => {
        setPickups(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load pickups");
      }
    );

    // 🚚 Delivery Requests
    const deliveryQuery = query(
      collection(db, "deliveryDetails"),
      orderBy("createdAt", "desc")
    );

    const unsubDelivery = onSnapshot(
      deliveryQuery,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();

          return {
            id: d.id,
            ...data,

            // FIXED FIELD MAPPING
            deliveryAddress: data.deliveryAddress || "",
            deliveryPhone: data.deliveryPhone || "",
            deliveryInstructions: data.deliveryInstructions || "",

            status: data.status || "accepted",
            deliveryStatus: data.deliveryStatus || "accepted",

            itemData: {
              title: data.itemTitle || "Unknown item",
            },

            // timestamps
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,

            isLegacy: !data.deliveryAddress,
          };
        });

        setRequests(arr);
        setLastSync(new Date());
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load delivery requests");
        setLoading(false);
      }
    );

    return () => {
      unsubPickups();
      unsubDelivery();
    };
  };

  // Helpers
  const formatDate = (v) => {
    if (!v) return "—";
    const d = v.seconds ? new Date(v.seconds * 1000) : new Date(v);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (v) => {
    if (!v) return "—";
    const d = v.seconds ? new Date(v.seconds * 1000) : new Date(v);

    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;

    return formatDate(v);
  };

  const sendStatusNotification = async (email, status, title, type) => {
    if (!callableFunctions.sendStatusUpdate) return;
    try {
      await callableFunctions.sendStatusUpdate({
        userEmail: email,
        status,
        itemTitle: title,
        notificationType: type,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Update delivery status
  const handleUpdateDelivery = async (req, newStatus) => {
    if (!window.confirm(`Set status to "${newStatus}"?`)) return;

    setUpdating((p) => ({ ...p, [req.id]: true }));

    try {
      const updates = {
        updatedAt: new Date(),
        deliveryStatus: newStatus,
        status: newStatus === "delivered" ? "completed" : req.status,
      };

      await updateDoc(doc(db, "deliveryDetails", req.id), updates);

      try {
        await updateDoc(doc(db, "requests", req.id), updates);
      } catch {}

      await sendStatusNotification(
        req.userEmail,
        newStatus,
        req.itemData?.title,
        "delivery_update"
      );

      toast.success("Delivery updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update");
    }

    setUpdating((p) => ({ ...p, [req.id]: false }));
  };

  // Update pickup
  const handleUpdatePickup = async (pickup, newStatus) => {
    if (!window.confirm(`Set pickup as "${newStatus}"?`)) return;

    setUpdating((p) => ({ ...p, [pickup.id]: true }));

    try {
      await updateDoc(doc(db, "pickups", pickup.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      toast.success("Pickup updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update pickup");
    }

    setUpdating((p) => ({ ...p, [pickup.id]: false }));
  };

  // Filter + search + sort
  const filteredData = useMemo(() => {
    const source = activeView === "pickups" ? pickups : requests;
    let filtered = source;

    if (filter) {
      if (activeView === "pickups") {
        filtered = filtered.filter((p) => p.status === filter);
      } else {
        filtered = filtered.filter(
          (r) =>
            (filter === "accepted" && r.status === "accepted") ||
            (filter === "scheduled" && r.deliveryStatus === "pickup_scheduled") ||
            (filter === "delivered" && r.deliveryStatus === "delivered")
        );
      }
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i?.userEmail?.toLowerCase().includes(s) ||
          i?.deliveryAddress?.toLowerCase().includes(s) ||
          i?.deliveryPhone?.toLowerCase().includes(s) ||
          i?.itemData?.title?.toLowerCase().includes(s)
      );
    }

    return filtered;
  }, [requests, pickups, search, filter, activeView]);

  // UI RENDER
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );

  if (permissionError)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <Shield className="text-red-500 w-12 h-12 mb-3" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-gray-600 mt-1">You do not have admin access.</p>
      </div>
    );

  const isEmpty =
    activeView === "pickups" ? pickups.length === 0 : requests.length === 0;

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/20">
          <h2 className="text-lg font-bold">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)}>
            <X />
          </button>
        </div>

        <nav className="p-4 space-y-2 text-sm">
          <Link to="/admin" className="block p-2 rounded hover:bg-white/10">
            Dashboard
          </Link>
          <Link to="/admin/requests" className="block p-2 rounded hover:bg-white/10">
            Requests
          </Link>
          <Link to="/admin/items" className="block p-2 rounded hover:bg-white/10">
            Items
          </Link>
          <Link to="/admin/pickups" className="block p-2 rounded bg-white/20">
            Pickups & Deliveries
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600"
            >
              <Menu size={20} />
            </button>

            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-1">
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} />
              <span className="text-gray-800 font-medium">Pickups & Deliveries</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} /> Last Sync:{" "}
              <span className="font-medium text-gray-700">
                {lastSync?.toLocaleTimeString() || "—"}
              </span>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
            >
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>
        </header>

        {/* Toggle & Stats */}
        <section className="p-4 bg-white border-b">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveView("pickups")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "pickups"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              📦 Pickup Records
            </button>

            <button
              onClick={() => setActiveView("deliveries")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "deliveries"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              🚚 Delivery Requests
            </button>
          </div>
        </section>

        {/* Empty State */}
        {isEmpty ? (
          <div className="text-center my-20 text-gray-600">
            <Truck className="text-gray-400 mx-auto mb-3" size={50} />
            <h2 className="text-lg font-semibold">
              No {activeView === "pickups" ? "pickup" : "delivery"} records
            </h2>
            <p className="text-sm max-w-xs mx-auto mt-2 text-gray-500">
              Records will appear here when users accept items or pickups are
              scheduled.
            </p>
          </div>
        ) : (
          <section className="p-8">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              {/* Search/filter */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder={
                      activeView === "pickups"
                        ? "Search courier or tracking"
                        : "Search email, phone, or item"
                    }
                    className="border pl-8 pr-3 py-2 rounded-md text-sm"
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border px-3 py-2 text-sm rounded"
                >
                  <option value="">All</option>
                  {activeView === "pickups" ? (
                    <>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="accepted">Accepted</option>
                      <option value="scheduled">Pickup Scheduled</option>
                      <option value="delivered">Delivered</option>
                    </>
                  )}
                </select>
              </div>

              {/* Data list */}
              <div className="grid gap-4">
                {filteredData.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="border rounded-xl bg-white p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4"
                    >
                      {activeView === "pickups" ? (
                        <PickupItem
                          pickup={item}
                          onUpdate={handleUpdatePickup}
                          updating={updating[item.id]}
                          formatDate={formatDate}
                          formatTimeAgo={formatTimeAgo}
                        />
                      ) : (
                        <DeliveryItem
                          request={item}
                          onUpdate={handleUpdateDelivery}
                          updating={updating[item.id]}
                          formatDate={formatDate}
                          formatTimeAgo={formatTimeAgo}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Sub Components                               */
/* -------------------------------------------------------------------------- */

const DeliveryItem = ({
  request,
  onUpdate,
  updating,
  formatDate,
  formatTimeAgo,
}) => {
  return (
    <>
      <div className="flex-1">
        <p className="font-medium text-gray-800">
          Item:{" "}
          <span className="text-indigo-700">
            {request.itemData?.title || "Unknown Item"}
          </span>
        </p>

        <div className="mt-2 text-sm text-gray-600 space-y-1">
          <p className="flex items-center gap-1">
            <User size={14} />
            <b>{request.userEmail}</b>
          </p>

          <p className="flex items-center gap-1">
            <MapPin size={14} /> {request.deliveryAddress}
          </p>

          <p className="flex items-center gap-1">
            <Phone size={14} /> {request.deliveryPhone}
          </p>

          {request.deliveryInstructions && (
            <p className="flex items-center gap-1">
              <MessageSquare size={14} /> {request.deliveryInstructions}
            </p>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-400 space-y-1">
          <p className="flex items-center gap-1">
            <Clock size={12} />
            Accepted: {formatDate(request.createdAt)}
          </p>
          <p className="flex items-center gap-1">
            <Calendar size={12} />
            Updated: {formatDate(request.updatedAt)}
          </p>
        </div>

        {request.itemId && (
          <Link
            to={`/admin/items?id=${request.itemId}`}
            className="text-xs underline text-indigo-600 mt-1 inline-block"
          >
            View Item →
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={request.deliveryStatus} />

        {/* Schedule */}
        {request.deliveryStatus === "accepted" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(request, "pickup_scheduled")}
            className="px-3 py-1 bg-orange-600 text-xs text-white rounded-full"
          >
            Schedule
          </button>
        )}

        {/* Deliver */}
        {["pickup_scheduled", "accepted"].includes(request.deliveryStatus) && (
          <button
            disabled={updating}
            onClick={() => onUpdate(request, "delivered")}
            className="px-3 py-1 bg-green-600 text-xs text-white rounded-full"
          >
            Deliver
          </button>
        )}
      </div>
    </>
  );
};

const PickupItem = ({
  pickup,
  onUpdate,
  updating,
  formatDate,
  formatTimeAgo,
}) => {
  return (
    <>
      <div className="flex-1">
        <p className="font-medium text-gray-800">
          Method:{" "}
          <span className="text-indigo-700">{pickup.method || "—"}</span>
        </p>

        <div className="text-sm text-gray-600 mt-2 space-y-1">
          {pickup.courierName && (
            <p className="flex items-center gap-1">
              <Package size={14} /> {pickup.courierName}
            </p>
          )}

          {pickup.trackingId && (
            <p className="flex items-center gap-1">
              <ClipboardCopy size={14} />
              {pickup.trackingId}
            </p>
          )}
        </div>

        <div className="text-xs text-gray-400 mt-3">
          <p className="flex items-center gap-1">
            <Clock size={12} /> {formatDate(pickup.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={pickup.status} />

        {pickup.status === "scheduled" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(pickup, "completed")}
            className="px-3 py-1 bg-green-600 text-xs text-white rounded-full"
          >
            Complete
          </button>
        )}

        {pickup.status === "scheduled" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(pickup, "cancelled")}
            className="px-3 py-1 bg-rose-600 text-xs text-white rounded-full"
          >
            Cancel
          </button>
        )}
      </div>
    </>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    accepted: "bg-blue-100 text-blue-700",
    pickup_scheduled: "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    scheduled: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs ${
        colors[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
};
