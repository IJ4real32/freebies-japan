// =============================================================
// FILE: src/components/Admin/AdminDeliveryRow.jsx
// PHASE-2 FINAL — BUYER DELIVERY AUTHORITY ONLY
// =============================================================

import React from "react";
import { MapPin, Phone, MessageSquare } from "lucide-react";
import AdminDeliveryActions from "./AdminDeliveryActions";
import AdminForceClosePanel from "../../pages/admin/AdminForceClosePanel";
import StatusBadge from "../MyActivity/StatusBadge";

/* -------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */
const normalize = (v) =>
  v?.toLowerCase().replace(/[_-]/g, "") ?? null;

export default function AdminDeliveryRow({ request }) {
  if (!request) return null;

  const deliveryStatus = normalize(request.deliveryStatus);
  const isClosed =
    request.forceClosed === true || deliveryStatus === "completed";

  return (
    <div className="border rounded-lg bg-white p-4 flex gap-4">
      {/* LEFT — INFO */}
      <div className="flex-1 space-y-3">
        <p className="font-medium text-indigo-700">
          {request.itemTitle}
        </p>

        {/* BUYER DELIVERY ADDRESS */}
        {request.deliveryAddress ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs font-semibold text-emerald-700 mb-1">
              Buyer Delivery Address
            </p>

            <div className="flex items-start gap-2 text-sm text-gray-900">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span className="leading-relaxed">
                {request.deliveryAddress}
              </span>
            </div>

            {request.deliveryPhone && (
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-800">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{request.deliveryPhone}</span>
              </div>
            )}

            {request.deliveryInstructions && (
              <div className="flex items-start gap-2 mt-1 text-sm text-gray-700">
                <MessageSquare className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="italic">
                  {request.deliveryInstructions}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-700 font-medium">
              ⏳ Waiting for buyer delivery address
            </p>
          </div>
        )}
      </div>

      {/* RIGHT — ACTIONS */}
      <div className="min-w-[260px] space-y-3">
        <StatusBadge
          deliveryStatus={request.deliveryStatus}
          showTimeline={!isClosed}
        />

        {!isClosed && (
          <AdminDeliveryActions delivery={request} isAdmin />
        )}

        {!isClosed && (
          <AdminForceClosePanel delivery={request} isAdmin />
        )}
      </div>
    </div>
  );
}
