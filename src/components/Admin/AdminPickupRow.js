// =============================================================
// FILE: src/components/Admin/AdminPickupRow.jsx
// PHASE-2 FINAL — SELLER PICKUP AUTHORITY ONLY
// BACKWARD COMPATIBLE (date-only legacy support)
// =============================================================

import React from "react";
import { MapPin, Phone, CalendarCheck, Clock } from "lucide-react";
import AdminPickupConfirmation from "./AdminPickupConfirmation";
import StatusBadge from "../MyActivity/StatusBadge";

/* -------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */
const normalize = (v) =>
  v?.toLowerCase().replace(/[_-]/g, "") ?? null;

const DEFAULT_TIME_SLOT = "08:00-12:00";

function formatPickupOption(opt) {
  if (!opt?.date) return "Invalid date";

  const date =
    opt.date?.seconds
      ? new Date(opt.date.seconds * 1000)
      : new Date(opt.date);

  const dateLabel = date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const timeSlot = opt.timeSlot || DEFAULT_TIME_SLOT;

  return `${dateLabel} (${timeSlot})`;
}

export default function AdminPickupRow({ request }) {
  if (!request) return null;

  const pickupStatus = normalize(request.pickupStatus);
  const addressReady = !!request.sellerPickupAddress;

  const pickupOptions = Array.isArray(request.sellerPickupOptions)
    ? request.sellerPickupOptions
    : [];

  const canDecidePickup =
    pickupStatus === "pickupscheduled" && pickupOptions.length > 0;

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

        {/* PICKUP OPTIONS PREVIEW */}
        {pickupOptions.length > 0 && (
          <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Seller Proposed Pickup Options
            </p>

            <ul className="space-y-1 text-sm text-gray-800">
              {pickupOptions.map((opt, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-gray-500">•</span>
                  {formatPickupOption(opt)}
                  {!opt.timeSlot && (
                    <span className="text-xs text-amber-600 ml-1">
                      (legacy default)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* RIGHT — ACTIONS */}
      <div className="min-w-[260px] space-y-3">
        <StatusBadge pickupStatus={request.pickupStatus} />

        {canDecidePickup ? (
          <AdminPickupConfirmation
            delivery={request}
            isAdmin
            defaultTimeSlot={DEFAULT_TIME_SLOT}
          />
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
