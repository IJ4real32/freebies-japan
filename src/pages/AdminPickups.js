// =============================================================
// FILE: src/pages/AdminPickups.js (PHASE-2 COMPLETE + ITEM TITLE FIXED)
// =============================================================

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
import AdminPickupConfirmation from "../components/Admin/AdminPickupConfirmation";
import AdminDeliveryActions from "../components/Admin/AdminDeliveryActions"; // ✅ ADDED
import AdminForceClosePanel from "./admin/AdminForceClosePanel";
import StatusBadge from "../components/MyActivity/StatusBadge";
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
    };

    checkAccess();
  }, [isAuthenticated, currentUser]);

  // -------------------------------------------------------------
  // REALTIME PICKUPS + DELIVERY REQUESTS (PHASE-2 SAFE — RAW ONLY)
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubPickups = null;
    let unsubDelivery = null;
    let isMounted = true;

    setLoading(true);

    // ---------- PICKUPS ----------
    const pickupQuery = query(
      collection(db, "pickups"),
      orderBy("createdAt", "desc")
    );

    unsubPickups = onSnapshot(
      pickupQuery,
      (snap) => {
        if (!isMounted) return;
        setPickups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => toast.error("Failed to load pickups")
    );

    // ---------- DELIVERY DETAILS (RAW ONLY) ----------
    const deliveryQuery = query(
      collection(db, "deliveryDetails"),
      orderBy("createdAt", "desc")
    );

    unsubDelivery = onSnapshot(
      deliveryQuery,
      (snap) => {
        if (!isMounted) return;

        const baseRows = snap.docs.map((d) => {
          const data = d.data();
          const addressInfo = data.addressInfo || {};

          return {
            id: d.id,
            ...data,

            // RAW ADDRESS
            deliveryAddress: addressInfo.address || "—",
            deliveryPhone: addressInfo.phone || "—",
            deliveryZip: addressInfo.zipCode || "—",
            deliveryInstructions: addressInfo.instructions || "",

            // RAW RELATIONS
            userId: data.userId || null,
            itemId: data.itemId || null,

            // PLACEHOLDERS ONLY
            userEmail: null,
            userName: null,
            itemData: { title: "Loading item…" },
          };
        });

        setRequests(baseRows);
        setLoading(false);
      },
      () => toast.error("Failed to load deliveries")
    );

    return () => {
      isMounted = false;
      if (unsubPickups) unsubPickups();
      if (unsubDelivery) unsubDelivery();
    };
  }, []);

  // -------------------------------------------------------------
  // ASYNC ENRICHMENT — USERS + ITEMS (PHASE-2 SAFE)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!requests || requests.length === 0) return;

    let cancelled = false;

    const enrich = async () => {
      try {
        const enriched = await Promise.all(
          requests.map(async (r) => {
            const row = { ...r };

            // ---------- USER LOOKUP ----------
            if (row.userId && !row.userName) {
              const userSnap = await getDoc(doc(db, "users", row.userId));
              if (userSnap.exists()) {
                const u = userSnap.data();
                row.userName = u.displayName || null;
                row.userEmail = u.email || null;
              }
            }

            // ---------- ITEM LOOKUP ----------
            if (row.itemId && row.itemData?.title === "Loading item…") {
              const itemSnap = await getDoc(doc(db, "donations", row.itemId));
              if (itemSnap.exists()) {
                row.itemData = {
                  title: itemSnap.data().title || "Untitled Item",
                };
              } else {
                row.itemData = { title: "Unknown item" };
              }
            }

            return row;
          })
        );

        if (!cancelled) {
          setRequests(enriched);
        }
      } catch (err) {
        console.error("[AdminPickups] enrichment failed", err);
      }
    };

    enrich();

    return () => {
      cancelled = true;
    };
  }, [requests.length]);

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

  // ❌ REMOVED: handleUpdateDelivery legacy handler
  // ❌ REMOVED: handleUpdatePickup legacy handler

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
          <Link
            to="/admin/requests"
            className="block p-2 rounded hover:bg-white/10"
          >
            Requests
          </Link>
          <Link
            to="/admin/items"
            className="block p-2 rounded hover:bg-white/10"
          >
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600"
            >
              <Menu size={20} />
            </button>

            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Link
                to="/admin"
                className="hover:text-indigo-600 flex items-center gap-1"
              >
                <Home size={14} /> Dashboard
              </Link>
              <ChevronRight size={14} />
              <span className="text-gray-800 font-medium">
                Pickups & Deliveries
              </span>
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
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={16}
              />
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
                  formatDate={formatDate}
                  copyToClipboard={copyToClipboard}
                  refetchDeliveries={() => {}}
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
// DELIVERY ITEM COMPONENT — PHASE 2 (ADMIN, FINAL, LOCKED)
// =============================================================

const DeliveryItem = ({
  request,
  formatDate,
  copyToClipboard,
  refetchDeliveries, // 🔁 refresh after admin action
}) => {
  const displayUser =
    request.userName || request.userEmail || "Unknown User";

  // --------------------------------------------------
  // TERMINAL GUARD (Phase-2 authority)
  // --------------------------------------------------
  const isTerminal =
    request.forceClosed === true ||
    request.deliveryStatus === "completed" ||
    request.deliveryStatus === "force_closed";

  return (
    <div className="border rounded-xl bg-white p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
      {/* ==================================================
         LEFT: DELIVERY DETAILS
      ================================================== */}
      <div className="flex-1">
        {/* ITEM */}
        <p className="font-medium text-gray-800">
          Item:{" "}
          <span className="text-indigo-700">
            {request.itemData?.title || "Unknown Item"}
          </span>
        </p>

        {/* USER */}
        <div className="mt-2 text-sm text-gray-700 space-y-2">
          <p className="flex items-center gap-1">
            <User size={14} />
            <b>{displayUser}</b>
          </p>

          <p className="text-xs text-gray-500">User ID: {request.userId}</p>

          {/* ADDRESS */}
          {request.deliveryAddress && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="mt-1 text-gray-500" />
              <div className="flex flex-col">
                <span
                  onClick={() => copyToClipboard(request.deliveryAddress)}
                  className="cursor-pointer whitespace-pre-wrap break-words leading-relaxed hover:text-indigo-600"
                >
                  {request.deliveryAddress}
                </span>

                {request.deliveryZip && (
                  <span className="text-xs text-gray-500">
                    ZIP: {request.deliveryZip}
                  </span>
                )}

                <button
                  onClick={() => copyToClipboard(request.deliveryAddress)}
                  className="mt-1 text-xs text-indigo-600 underline w-fit"
                >
                  Copy Address
                </button>
              </div>
            </div>
          )}

          {/* PHONE */}
          {request.deliveryPhone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-500" />
              <span
                className="cursor-pointer hover:text-indigo-600"
                onClick={() => copyToClipboard(request.deliveryPhone)}
              >
                {request.deliveryPhone}
              </span>
            </div>
          )}

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
            <Clock size={12} />
            Created: {formatDate(request.createdAt)}
          </p>
          <p className="flex items-center gap-1">
            <Calendar size={12} />
            Updated: {formatDate(request.updatedAt)}
          </p>
        </div>

        {/* TERMINAL NOTICE */}
        {isTerminal && (
          <div className="mt-2 text-xs font-medium text-red-600">
            🔒 Delivery permanently closed
          </div>
        )}
      </div>

      {/* ==================================================
         RIGHT: ADMIN ACTIONS
      ================================================== */}
      <div className="flex flex-col gap-3 min-w-[240px]">
        {/* STATUS + TIMELINE */}
        <StatusBadge
          status={request.deliveryStatus}
          pickupStatus={request.pickupStatus}
          showTimeline={!isTerminal}
        />

        {/* ===============================
           PHASE-2 ADMIN DELIVERY ACTIONS
        =============================== */}

        {/* ADMIN PICKUP CONFIRMATION */}
        <AdminPickupConfirmation
          delivery={request}
          isAdmin={true}
        />

        {/* ADMIN DELIVERY ACTIONS */}
        <AdminDeliveryActions
          delivery={request}
          isAdmin={true}
        />

        {/* ADMIN FORCE CLOSE PANEL */}
        <AdminForceClosePanel
          delivery={request}
          isAdmin={true}
        />
      </div>
    </div>
  );
};