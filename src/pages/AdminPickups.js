// =============================================================
// FILE: src/pages/AdminPickups.js
// PHASE-2 FINAL — ADMIN PICKUPS & DELIVERIES
// =============================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { checkAdminStatus } from "../utils/adminUtils";

import AdminPickupConfirmation from "../components/Admin/AdminPickupConfirmation";
import AdminDeliveryActions from "../components/Admin/AdminDeliveryActions";
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
  Clock,
  Calendar,
  MapPin,
  Phone,
  MessageSquare,
  User,
  Shield,
  Package,
  Truck,
} from "lucide-react";
import { adminBackfillDelivery } from "../services/functionsApi";

/* =============================================================
 * MAIN COMPONENT
 * =========================================================== */
export default function AdminPickups() {
  const { isAuthenticated, currentUser } = useAuth();

  const [deliveries, setDeliveries] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState("deliveries");
  const [lastSync, setLastSync] = useState(null);

  /* -------------------------------------------------------------
   * ADMIN ACCESS CHECK
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (!isAuthenticated) return;

    const run = async () => {
      const ok = await checkAdminStatus(currentUser);
      if (!ok) {
        setPermissionError(true);
        setLoading(false);
      }
    };

    run();
  }, [isAuthenticated, currentUser]);

  /* -------------------------------------------------------------
   * DELIVERY DETAILS (AUTHORITATIVE — BUYER SIDE)
   * ----------------------------------------------------------- */
  useEffect(() => {
    let unsub = null;
    let alive = true;

    setLoading(true);

    const q = query(
      collection(db, "deliveryDetails"),
      orderBy("createdAt", "desc")
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        if (!alive) return;

        const rows = snap.docs.map((d) => {
          const data = d.data();

          return {
            id: d.id,                // requestId
            requestId: d.id,
            itemId: data.itemId,

            // 🔑 IMPORTANT: buyer === user
            userId: data.buyerId || data.userId || null,

           

            sellerId: data.sellerId,

            deliveryAddress: data.deliveryAddress || null,
            deliveryPhone: data.deliveryPhone || null,
            deliveryInstructions: data.deliveryInstructions || null,
            addressSubmitted:
  data.addressSubmitted === true ||
  (!!data.deliveryAddress && !!data.deliveryPhone),

           

            deliveryStatus: data.deliveryStatus || "pending",
            pickupStatus: data.pickupStatus || null,
            forceClosed: data.forceClosed === true,

            createdAt: data.createdAt,
            updatedAt: data.updatedAt,

            // enrichment
            userName: null,
            userEmail: null,
            itemTitle: "Loading item…",
          };
        });

        setDeliveries(rows);
        setLastSync(new Date());
        setLoading(false);
      },
      () => toast.error("Failed to load deliveries")
    );

    return () => {
      alive = false;
      if (unsub) unsub();
    };
  }, []);

  /* -------------------------------------------------------------
   * PICKUPS (SELLER / DONOR SIDE)
   * ----------------------------------------------------------- */
  useEffect(() => {
    let unsub = null;
    let alive = true;

    const q = query(
      collection(db, "pickups"),
      orderBy("createdAt", "desc")
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        if (!alive) return;
        setPickups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => toast.error("Failed to load pickups")
    );

    return () => {
      alive = false;
      if (unsub) unsub();
    };
  }, []);

  /* -------------------------------------------------------------
   * ENRICH USERS + ITEMS
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (!deliveries.length) return;
    let cancelled = false;

    const enrich = async () => {
      try {
        const enriched = await Promise.all(
          deliveries.map(async (r) => {
            const row = { ...r };

            if (row.userId && !row.userName) {
              const u = await getDoc(doc(db, "users", row.userId));
              if (u.exists()) {
                row.userName = u.data().displayName || null;
                row.userEmail = u.data().email || null;
              }
            }

            if (row.itemId && row.itemTitle === "Loading item…") {
              const i = await getDoc(doc(db, "donations", row.itemId));
              row.itemTitle = i.exists()
                ? i.data().title || "Untitled Item"
                : "Unknown Item";
            }

            return row;
          })
        );

        if (!cancelled) setDeliveries(enriched);
      } catch (e) {
        console.error("[AdminPickups] enrichment failed", e);
      }
    };

    enrich();
    return () => (cancelled = true);
  }, [deliveries.length]);

  /* -------------------------------------------------------------
   * HELPERS
   * ----------------------------------------------------------- */
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

  const copyToClipboard = (v) => {
    if (!v) return;
    navigator.clipboard.writeText(v);
    toast.success("Copied!");
  };

  /* -------------------------------------------------------------
   * FILTER
   * ----------------------------------------------------------- */
  const filtered = useMemo(() => {
    const src =
      activeView === "pickups" ? pickups : deliveries;

    let list = src.filter(
      (i) => i.deliveryStatus !== "completed"
    );

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.userEmail?.toLowerCase().includes(s) ||
          i.userName?.toLowerCase().includes(s) ||
          i.deliveryAddress?.toLowerCase().includes(s) ||
          i.deliveryPhone?.toLowerCase().includes(s) ||
          i.itemTitle?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [deliveries, pickups, activeView, search]);

  /* -------------------------------------------------------------
   * UI STATES
   * ----------------------------------------------------------- */
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
        <p className="text-gray-600 mt-1">
          You do not have admin access.
        </p>
      </div>
    );

  /* =============================================================
   * RENDER
   * =========================================================== */
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

      {/* MAIN */}
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
              <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-1">
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
              onClick={() => setActiveView("deliveries")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "deliveries"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              <Truck size={14} className="inline mr-1" />
              Buyer Deliveries
            </button>

            <button
              onClick={() => setActiveView("pickups")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "pickups"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              <Package size={14} className="inline mr-1" />
              Seller Pickups
            </button>
          </div>
        </section>

        {/* LIST */}
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
              {filtered.map((item) =>
                activeView === "deliveries" ? (
                  <DeliveryItem
                    key={item.id}
                    request={item}
                    formatDate={formatDate}
                    copyToClipboard={copyToClipboard}
                  />
                ) : (
                  <div key={item.id} className="border p-4 rounded">
                    Seller pickup record
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* =============================================================
 * DELIVERY ITEM (BUYER SIDE)
 * =========================================================== */
const DeliveryItem = ({ request, formatDate, copyToClipboard }) => {
  // --------------------------------------------------
  // PHASE-2 FLAGS (EXPLICIT & SAFE)
  // --------------------------------------------------
  const addressReady =
    request.addressSubmitted === true ||
    (!!request.deliveryAddress && !!request.deliveryPhone);


    const isClosed =
  request.forceClosed === true ||
  request.deliveryStatus === "completed" ||
  request.deliveryStatus === "force_closed";

const canPickupConfirm =
  addressReady &&
  !isClosed &&
  request.pickupStatus === "pickupRequested";

  const canTransit =
  !isClosed &&
  request.pickupStatus === "pickupConfirmed" &&
  request.deliveryStatus !== "in_transit";




const canDeliver =
  !isClosed &&
  request.deliveryStatus === "in_transit";

  const canBackfill =
  !request.deliveryStatus ||
  request.deliveryStatus === "pending";



 

  return (
    <div className="border rounded-xl bg-white p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
      {/* ==================================================
         LEFT: DELIVERY DETAILS
      ================================================== */}
      <div className="flex-1">
        <p className="font-medium">
          Item:{" "}
          <span className="text-indigo-700">
            {request.itemTitle || "Unknown Item"}
          </span>
        </p>

        <div className="mt-2 text-sm space-y-2">
          <p className="flex items-center gap-1">
            <User size={14} />
            <b>{request.userName || request.userEmail || "Unknown User"}</b>
          </p>

          {addressReady ? (
            <>
              <div className="flex items-start gap-2">
                <MapPin size={14} />
                <span
                  className="cursor-pointer hover:text-indigo-600"
                  onClick={() =>
                    copyToClipboard(request.deliveryAddress)
                  }
                >
                  {request.deliveryAddress}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span
                  className="cursor-pointer hover:text-indigo-600"
                  onClick={() =>
                    copyToClipboard(request.deliveryPhone)
                  }
                >
                  {request.deliveryPhone}
                </span>
              </div>

              {request.deliveryInstructions && (
                <div className="flex items-start gap-2">
                  <MessageSquare size={14} />
                  <span>{request.deliveryInstructions}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-amber-600 font-medium">
              ⏳ Waiting for recipient to submit address
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p>Created: {formatDate(request.createdAt)}</p>
          <p>Updated: {formatDate(request.updatedAt)}</p>
        </div>

      </div>

      {/* ==================================================
         RIGHT: ADMIN CONTROLS
      ================================================== */}
      <div className="flex flex-col gap-3 min-w-[240px]">
        <StatusBadge
  deliveryStatus={request.deliveryStatus}
  pickupStatus={request.pickupStatus}
  forceClosed={request.forceClosed}
  showTimeline={!isClosed}
/>

     


        {/* ADMIN ACTIONS — PHASE-2 AUTHORITY */}
       {canPickupConfirm && (
  <AdminPickupConfirmation delivery={request} isAdmin />
)}

{(canTransit || canDeliver) && (
  <AdminDeliveryActions delivery={request} isAdmin />
)}

{/* ADMIN BACKFILL — PHASE-2 SAFE (ONLY IF MISSING / LEGACY) */}
{canBackfill && (
  <button
    onClick={async () => {
      try {
        await adminBackfillDelivery({
          itemId: request.itemId,
        });
        toast.success("Delivery backfilled");
      } catch (e) {
        toast.error(
          e?.message || "Failed to backfill delivery"
        );
      }
    }}
    className="text-xs px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
  >
    Backfill Delivery
  </button>
)}

        {/* FORCE CLOSE — ALWAYS AVAILABLE UNLESS ALREADY CLOSED */}
        {!request.forceClosed && (
          <AdminForceClosePanel delivery={request} isAdmin />
        )}
      </div>
    </div>
  );
};
