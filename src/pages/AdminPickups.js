// ✅ FILE: src/pages/AdminPickups.js (PHASE-2 COMPLETE + ITEM TITLE FIXED)

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { checkAdminStatus } from "../utils/adminUtils";

import {
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
  MapPin,
  Phone,
  MessageSquare,
  User,
  Truck,
  Shield,
} from "lucide-react";


// =============================================================
// MAIN COMPONENT
// =============================================================
export default function AdminPickups() {
  const { isAuthenticated, currentUser } = useAuth();

  const [pickups, setPickups] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [activeView, setActiveView] = useState("deliveries");
  const [permissionError, setPermissionError] = useState(false);

  const [callableFunctions, setCallableFunctions] = useState({
    sendStatusUpdate: null,
  });


  // -------------------------------------------------------------
  // INIT FIREBASE FUNCTIONS
  // -------------------------------------------------------------
  useEffect(() => {
    const functions = getFunctions();
    setCallableFunctions({
      sendStatusUpdate: httpsCallable(functions, "sendStatusUpdate"),
    });
  }, []);


  // -------------------------------------------------------------
  // CHECK ADMIN ACCESS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAccess = async () => {
      const ok = await checkAdminStatus(currentUser);
      if (!ok) {
        setPermissionError(true);
        setLoading(false);
        return;
      }
      loadData();
    };

    checkAccess();
  }, [isAuthenticated, currentUser]);


  // -------------------------------------------------------------
  // LOAD PICKUPS + DELIVERY REQUESTS
  // -------------------------------------------------------------
  const loadData = () => {
    setLoading(true);

    // ---------- PICKUPS ----------
    const pickupQuery = query(
      collection(db, "pickups"),
      orderBy("createdAt", "desc")
    );

    const unsubPickups = onSnapshot(
      pickupQuery,
      (snap) => {
        setPickups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => toast.error("Failed to load pickups")
    );


    // ---------- DELIVERY REQUESTS ----------
    const deliveryQuery = query(
      collection(db, "deliveryDetails"),
      orderBy("createdAt", "desc")
    );

    const unsubDelivery = onSnapshot(
      deliveryQuery,
      async (snap) => {
        let arr = snap.docs.map((d) => {
          const data = d.data();
          const addressInfo = data.addressInfo || {};

          return {
            id: d.id,
            ...data,

            // ADDRESS
            deliveryAddress: addressInfo.address || "—",
            deliveryPhone: addressInfo.phone || "—",
            deliveryZip: addressInfo.zipCode || "—",
            deliveryInstructions: addressInfo.instructions || "",

            // USER FIELDS (WILL BE POPULATED)
            userId: data.userId || null,
            userEmail: null,
            userName: null,

            // ITEM FIELDS (FETCHED LATER)
            itemId: data.itemId || null,
            itemData: { title: "Loading item…" },

            status: data.status || "accepted",
            deliveryStatus: data.deliveryStatus || "accepted",

            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });


        // ---------------------------------------------------------
        // 1️⃣ FETCH USER DATA (Name + Email)
        // ---------------------------------------------------------
        for (let r of arr) {
          if (!r.userId) continue;

          const userSnap = await getDoc(doc(db, "users", r.userId));
          if (userSnap.exists()) {
            const u = userSnap.data();
            r.userName = u.displayName || null;
            r.userEmail = u.email || null;
          }
        }

        // ---------------------------------------------------------
        // 2️⃣ FETCH ITEM TITLE FROM donations/{itemId}
        // ---------------------------------------------------------
        for (let r of arr) {
          if (!r.itemId) continue;

          const itemSnap = await getDoc(doc(db, "donations", r.itemId));
          if (itemSnap.exists()) {
            r.itemData = {
              title: itemSnap.data().title || "Untitled Item",
            };
          } else {
            r.itemData = { title: "Unknown item" };
          }
        }

        setRequests(arr);
        setLastSync(new Date());
        setLoading(false);
      },
      () => toast.error("Failed to load delivery requests")
    );

    return () => {
      unsubPickups();
      unsubDelivery();
    };
  };


  // -------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------
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

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };


  // -------------------------------------------------------------
  // UPDATE DELIVERY STATUS
  // -------------------------------------------------------------
  const handleUpdateDelivery = async (req, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;

    setUpdating((p) => ({ ...p, [req.id]: true }));

    try {
      const updates = { deliveryStatus: newStatus, updatedAt: new Date() };

      await updateDoc(doc(db, "deliveryDetails", req.id), updates);
      await updateDoc(doc(db, "requests", req.id), updates);

      toast.success("Delivery updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    }

    setUpdating((p) => ({ ...p, [req.id]: false }));
  };


  // -------------------------------------------------------------
  // UPDATE PICKUP STATUS
  // -------------------------------------------------------------
  const handleUpdatePickup = async (pickup, newStatus) => {
    if (!window.confirm(`Mark pickup as "${newStatus}"?`)) return;

    setUpdating((p) => ({ ...p, [pickup.id]: true }));

    try {
      await updateDoc(doc(db, "pickups", pickup.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      toast.success("Pickup updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    }

    setUpdating((p) => ({ ...p, [pickup.id]: false }));
  };


  // -------------------------------------------------------------
  // FILTER RESULTS
  // -------------------------------------------------------------
  const filteredData = useMemo(() => {
    const src = activeView === "pickups" ? pickups : requests;

    let list = src.filter(
      (i) => i.deliveryStatus !== "completed" && i.status !== "completed"
    );

    if (filter) {
      list = list.filter(
        (i) => i.deliveryStatus === filter || i.status === filter
      );
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.userEmail?.toLowerCase().includes(s) ||
          i.userName?.toLowerCase().includes(s) ||
          i.deliveryAddress?.toLowerCase().includes(s) ||
          i.deliveryPhone?.toLowerCase().includes(s) ||
          i.itemData?.title?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [pickups, requests, filter, search, activeView]);


  // -------------------------------------------------------------
  // UI STATES
  // -------------------------------------------------------------
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


  // =============================================================
  // RENDER UI
  // =============================================================
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">

      {/* SIDEBAR */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"}
        bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900
        text-white transition-all duration-300 overflow-hidden`}
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

        {/* HEADER */}
        <header className="flex items-center justify-between bg-white shadow px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600">
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
            <Clock size={12} /> Last Sync:
            <span className="font-medium text-gray-700">
              {lastSync?.toLocaleTimeString() || "—"}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>
        </header>


        {/* TOGGLE */}
        <section className="p-4 bg-white border-b">
          <div className="flex gap-2">
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


        {/* DATA LIST */}
        <section className="p-8">
          <div className="bg-white rounded-lg shadow p-6 border">

            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search email, phone, item, name…"
                className="border pl-10 pr-3 py-2 rounded-md text-sm w-full"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-4">
              {filteredData.map((item) => (
                <DeliveryItem
                  key={item.id}
                  request={item}
                  updating={updating[item.id]}
                  onUpdate={handleUpdateDelivery}
                  formatDate={formatDate}
                  copyToClipboard={copyToClipboard}
                />
              ))}
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}


// =============================================================
// DELIVERY ITEM COMPONENT
// =============================================================
const DeliveryItem = ({
  request,
  onUpdate,
  updating,
  formatDate,
  copyToClipboard,
}) => {
  const displayUser =
    request.userName || request.userEmail || "Unknown User";

  return (
    <div className="border rounded-xl bg-white p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex-1">

        {/* ITEM */}
        <p className="font-medium text-gray-800">
          Item:{" "}
          <span className="text-indigo-700">{request.itemData?.title}</span>
        </p>

        {/* USER */}
        <div className="mt-2 text-sm text-gray-700 space-y-2">
          <p className="flex items-center gap-1">
            <User size={14} />
            <b>{displayUser}</b>
          </p>

          <p className="text-xs text-gray-500">User ID: {request.userId}</p>

          {/* ADDRESS */}
          <div className="flex items-start gap-2">
            <MapPin size={14} className="mt-1 text-gray-500" />
            <div className="flex flex-col">
              <span
                onClick={() => copyToClipboard(request.deliveryAddress)}
                className="cursor-pointer whitespace-pre-wrap break-words leading-relaxed hover:text-indigo-600"
              >
                {request.deliveryAddress}
              </span>
              <span className="text-xs text-gray-500">ZIP: {request.deliveryZip}</span>

              <button
                onClick={() => copyToClipboard(request.deliveryAddress)}
                className="mt-1 text-xs text-indigo-600 underline w-fit"
              >
                Copy Address
              </button>
            </div>
          </div>

          {/* PHONE */}
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-gray-500" />
            <span
              className="cursor-pointer hover:text-indigo-600"
              onClick={() => copyToClipboard(request.deliveryPhone)}
            >
              {request.deliveryPhone}
            </span>
          </div>

          {/* INSTRUCTIONS */}
          {request.deliveryInstructions && (
            <div className="flex items-start gap-2">
              <MessageSquare size={14} className="text-gray-500" />
              <span className="whitespace-pre-wrap break-words leading-relaxed">
                {request.deliveryInstructions}
              </span>
            </div>
          )}

          {/* ITEM LINK */}
          {request.itemId && (
            <Link
              to={`/admin/items?id=${request.itemId}`}
              className="text-xs underline text-indigo-600 mt-1 inline-block"
            >
              View Item →
            </Link>
          )}
        </div>

        {/* TIMESTAMPS */}
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-1">
            <Clock size={12} /> Accepted: {formatDate(request.createdAt)}
          </p>
          <p className="flex items-center gap-1">
            <Calendar size={12} /> Updated: {formatDate(request.updatedAt)}
          </p>
        </div>

      </div>


      {/* ACTION BUTTONS */}
      <div className="flex items-center gap-2">
        <StatusBadge status={request.deliveryStatus} />

        {request.deliveryStatus === "accepted" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(request, "pickup_scheduled")}
            className="px-3 py-1 bg-orange-600 text-xs text-white rounded-full"
          >
            Schedule Pickup
          </button>
        )}

        {request.deliveryStatus === "pickup_scheduled" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(request, "in_transit")}
            className="px-3 py-1 bg-purple-600 text-xs text-white rounded-full"
          >
            Out for Delivery
          </button>
        )}

        {request.deliveryStatus === "in_transit" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(request, "delivered")}
            className="px-3 py-1 bg-green-600 text-xs text-white rounded-full"
          >
            Mark Delivered
          </button>
        )}

        {request.deliveryStatus === "delivered" && (
          <button
            disabled={updating}
            onClick={() => onUpdate(request, "completed")}
            className="px-3 py-1 bg-blue-600 text-xs text-white rounded-full"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
};


// =============================================================
// STATUS BADGE
// =============================================================
const StatusBadge = ({ status }) => {
  const colors = {
    accepted: "bg-blue-100 text-blue-700",
    pickup_scheduled: "bg-orange-100 text-orange-700",
    in_transit: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-200 text-green-800",
    cancelled: "bg-red-100 text-red-700",
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
