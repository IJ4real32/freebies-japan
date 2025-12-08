// ✅ FILE: src/components/MyActivity/ListingCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { Trash2, RefreshCcw, Eye, Crown } from "lucide-react";
import StatusBadge from "./StatusBadge";

/* Normalize delivery status */
const normalize = (raw) => {
  if (!raw) return null;
  const key = raw.replace(/[-_]/g, "").toLowerCase();
  const map = {
    accepted: "accepted",
    pickupscheduled: "pickup_scheduled",
    intransit: "in_transit",
    outfordelivery: "out_for_delivery",
    delivered: "delivered",
    completed: "completed",
  };
  return map[key] || raw;
};

const ListingCard = ({
  item,
  onView,
  onRelist,
  onDelete,
  loading,
}) => {
  const mainImage =
    item?.images?.[0] ||
    item?.itemData?.images?.[0] ||
    "/images/default-item.jpg";

  const isPremium = item?.type === "premium" || item?.isPremium;

  const status = item?.status;
  const premiumStatus = item?.premiumStatus;
  const deliveryStatus = normalize(item?.deliveryStatus);

  /* -------------------------------------------------------
   * RELIST LOGIC (unchanged)
   * ------------------------------------------------------*/
  const FREE_RELIST =
    !isPremium &&
    ["expired", "awarded", "requestClosed", "relisted"].includes(status);

  const PREMIUM_RELIST =
    isPremium &&
    ["cancelled", "buyerDeclined", "autoClosed", "available"].includes(
      premiumStatus
    );

  const canRelist = FREE_RELIST || PREMIUM_RELIST;

  /* -------------------------------------------------------
   * DELETE RESTRICTIONS
   * ------------------------------------------------------*/
  const BLOCK_DELETE = [
    "accepted",
    "pickup_scheduled",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "completed",
  ];

  const canDelete = !BLOCK_DELETE.includes(deliveryStatus);

  /* -------------------------------------------------------
   * SAFE HANDLERS
   * ------------------------------------------------------*/
  const stop = (e) => e.stopPropagation();

  const handleDelete = (e) => {
    stop(e);
    if (!canDelete || loading) return;
    onDelete(item);
  };

  const handleRelist = (e) => {
    stop(e);
    if (!canRelist) return;
    onRelist(item);
  };

  const handleView = (e) => {
    stop(e);
    onView(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
      onClick={() => onView(item)}
    >
      {/* IMAGE */}
      <div className="relative w-full h-44 rounded-lg overflow-hidden bg-gray-100 mb-3">
        <img
          src={mainImage}
          alt={item?.title}
          className="w-full h-full object-cover hover:scale-105 transition"
          onError={(e) => (e.target.src = "/images/default-item.jpg")}
        />

        <div className="absolute top-2 left-2">
          <StatusBadge
            status={status}
            deliveryStatus={deliveryStatus}
            isListing={true}
            isPremium={isPremium}
          />
        </div>

        {isPremium && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 shadow">
            <Crown size={12} />
            Premium
          </div>
        )}
      </div>

      {/* TITLE */}
      <h3 className="text-gray-900 font-semibold text-base line-clamp-2">
        {item?.title || "Untitled Listing"}
      </h3>

      {/* Category or Premium Price */}
      {!isPremium ? (
        <p className="text-xs text-gray-500 mb-2 capitalize">
          {item?.category || "Uncategorized"}
        </p>
      ) : (
        <p className="text-sm text-indigo-700 font-semibold mb-2">
          ¥{item?.price?.toLocaleString() || "—"}
        </p>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-between mt-3">

        {/* VIEW */}
        <button
          onClick={handleView}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <Eye size={14} /> View
        </button>

        <div className="flex gap-2">

          {/* RELIST */}
          {canRelist && (
            <button
              onClick={handleRelist}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-full shadow"
            >
              <RefreshCcw size={12} />
              Relist
            </button>
          )}

          {/* DELETE */}
          <button
            disabled={!canDelete || loading}
            onClick={handleDelete}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full shadow transition
              ${
                canDelete
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ListingCard;
