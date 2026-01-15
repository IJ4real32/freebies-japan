// =============================================================
// FILE: src/pages/AdminPickups.js
// PHASE-2 FINAL — CANONICAL, ZERO REGRESSION
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
import AdminPickupRow from "../components/Admin/AdminPickupRow";
import AdminDeliveryRow from "../components/Admin/AdminDeliveryRow";


import {
  Search,
  X,
  Home,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Clock,
  Shield,
  Truck,
  Package,
 
} from "lucide-react";



/* =============================================================
 * UTIL
 * =========================================================== */
const normalize = (v) =>
  v?.toLowerCase().replace(/[_-]/g, "") ?? null;

/* =============================================================
 * MAIN
 * =========================================================== */
export default function AdminPickups() {
  const { isAuthenticated, currentUser } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState("deliveries");
  const [lastSync, setLastSync] = useState(null);

  /* -------------------------------------------------------------
   * ADMIN CHECK
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const ok = await checkAdminStatus(currentUser);
      if (!ok) {
        setPermissionError(true);
        setLoading(false);
      }
    })();
  }, [isAuthenticated, currentUser]);

  /* -------------------------------------------------------------
   * DELIVERY DETAILS — SINGLE SOURCE OF TRUTH
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (permissionError) return;

    const q = query(
      collection(db, "deliveryDetails"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const base = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            requestId: d.id,
            itemId: data.itemId,
            buyerId: data.buyerId,
            sellerId: data.sellerId,

            deliveryStatus: data.deliveryStatus || null,
            pickupStatus: data.pickupStatus || null,
            sellerPickupOptions: data.sellerPickupOptions || [],

            forceClosed: data.forceClosed === true,

            deliveryAddress: data.deliveryAddress || null,
            deliveryPhone: data.deliveryPhone || null,
            deliveryInstructions: data.deliveryInstructions || null,
            addressSubmitted:
              data.addressSubmitted === true ||
              (!!data.deliveryAddress && !!data.deliveryPhone),

            createdAt: data.createdAt,
            updatedAt: data.updatedAt,

            userName: null,
            userEmail: null,
            itemTitle: "Loading…",
          };
        });

        const enriched = await Promise.all(
          base.map(async (r) => {
            const row = { ...r };

            if (row.buyerId) {
              const u = await getDoc(doc(db, "users", row.buyerId));
              if (u.exists()) {
                row.userName = u.data().displayName || null;
                row.userEmail = u.data().email || null;
              }
            }

           if (row.itemId) {
  const i = await getDoc(doc(db, "donations", row.itemId));
  if (i.exists()) {
    const d = i.data();
    row.itemTitle = d.title || "Untitled Item";

   if (d.pickupAddress && typeof d.pickupAddress === "object") {
  const a = d.pickupAddress;
  row.sellerPickupAddress = [
    a.postalCode && `〒${a.postalCode}`,
    a.prefecture,
    a.city,
    a.addressLine1,
    a.addressLine2,
    a.country,
  ]
    .filter(Boolean)
    .join(" ");
} else {
  row.sellerPickupAddress = null;
}

row.sellerPickupPhone = d.pickupPhone || null;

  }
}


            return row;
          })
        );

        setRows(enriched);
        setLastSync(new Date());
        setLoading(false);
      },
      () => toast.error("Failed to load delivery records")
    );

    return () => unsub();
  }, [permissionError]);

  /* -------------------------------------------------------------
   * FILTERED VIEW
   * ----------------------------------------------------------- */
  const filtered = useMemo(() => {
    let list = rows.filter(
      (r) => normalize(r.deliveryStatus) !== "completed"
    );

    if (activeView === "pickups") {
      list = list.filter((r) => r.pickupStatus);
    }

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
  }, [rows, activeView, search]);

  /* -------------------------------------------------------------
   * UI STATES
   * ----------------------------------------------------------- */
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );

  if (permissionError)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <Shield className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-gray-600">Admin access required</p>
      </div>
    );

  /* =============================================================
   * RENDER
   * =========================================================== */
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 text-white transition-all overflow-hidden`}
      >
        <div className="flex justify-between px-4 py-3 border-b border-white/20">
          <h2 className="font-bold">Admin Panel</h2>
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
        <header className="flex justify-between bg-white px-6 py-4 border-b">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/admin" className="flex items-center gap-1">
              <Home size={14} /> Dashboard
            </Link>
            <ChevronRight size={14} />
            Pickups & Deliveries
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Clock size={12} />
            {lastSync?.toLocaleTimeString() || "—"}
            <button
              onClick={() => window.location.reload()}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              <RefreshCcw size={12} />
            </button>
          </div>
        </header>

        {/* TOGGLE */}
        <section className="p-4 bg-white border-b flex gap-2">
          <button
            onClick={() => setActiveView("deliveries")}
            className={`px-4 py-2 rounded ${
              activeView === "deliveries"
                ? "bg-green-600 text-white"
                : "bg-gray-200"
            }`}
          >
            <Truck size={14} className="inline mr-1" />
            Buyer Deliveries
          </button>

          <button
            onClick={() => setActiveView("pickups")}
            className={`px-4 py-2 rounded ${
              activeView === "pickups"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            <Package size={14} className="inline mr-1" />
            Seller Pickups
          </button>
        </section>

        {/* LIST */}
        <section className="p-6">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              className="border pl-10 py-2 rounded w-full"
              placeholder="Search…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-4">
           {filtered.map((r) =>
  activeView === "pickups" ? (
    <AdminPickupRow key={r.id} request={r} />
  ) : (
    <AdminDeliveryRow key={r.id} request={r} />
  )
)}

          </div>
        </section>
      </main>
    </div>
  );
}

