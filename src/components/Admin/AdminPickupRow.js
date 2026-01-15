// =============================================================
// FILE: src/components/Admin/AdminPickupRow.jsx
// PHASE-2 FINAL — SELLER PICKUP AUTHORITY ONLY
// =============================================================

import React from "react";
import { MapPin, Phone, CalendarCheck } from "lucide-react";
import AdminPickupConfirmation from "./AdminPickupConfirmation";
import StatusBadge from "../MyActivity/StatusBadge";

/* -------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */
const normalize = (v) =>
  v?.toLowerCase().replace(/[_-]/g, "") ?? null;

export default function AdminPickupRow({ request }) {
  if (!request) return null;

  const pickupStatus = normalize(request.pickupStatus);
  const addressReady = !!request.sellerPickupAddress;

  const canDecidePickup =
    pickupStatus === "pickupscheduled" &&
    Array.isArray(request.sellerPickupOptions) &&
    request.sellerPickupOptions.length > 0;

  return (
    <div className="border rounded-lg bg-white p-4 flex gap-4">
      {/* LEFT — INFO */}
      <div className="flex-1 space-y-3">
        <p className="font-medium text-indigo-700">
          {request.itemTitle}
        </p>

        {/* SELLER PICKUP ADDRESS */}
        {addressReady ? (
          <div className="rounded-md bg-indigo-50 border border-indigo-200 p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-1">
              Seller Pickup Address
            </p>

            <div className="flex items-start gap-2 text-sm text-gray-900">
              <MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <span className="leading-relaxed">
                {request.sellerPickupAddress}
              </span>
            </div>

            {request.sellerPickupPhone && (
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-800">
                <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{request.sellerPickupPhone}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-700 font-medium">
              ⚠ Seller pickup address missing on listing
            </p>
          </div>
        )}
      </div>

      {/* RIGHT — ACTIONS */}
      <div className="min-w-[260px] space-y-3">
        <StatusBadge pickupStatus={request.pickupStatus} />

        {canDecidePickup ? (
          <AdminPickupConfirmation delivery={request} isAdmin />
        ) : (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <CalendarCheck size={12} />
            Waiting for seller pickup proposal
          </p>
        )}
      </div>
    </div>
  );
}
