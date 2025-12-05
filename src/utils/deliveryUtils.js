// ================================================================
//  DELIVERY UTILS — PHASE 2 (FINAL, STABLE)
//  ---------------------------------------------------------------
//  NORMALIZES:
//    - deliveryStatus (free items)
//    - premiumStatus (premium life-cycle)
//    - timestamps
//    - safe item title/image access
//
//  USED BY:
//    • DetailDrawer
//    • DeliveryTimeline
//    • PremiumTimeline
//    • StatusBadge
//    • RequestCard / ListingCard / PurchaseCard
//    • MyActivity refresh pipelines
// ================================================================

/* ---------------------------------------------------------------
   🧩 normalizeStatus(raw)
   Converts ANY input format to Phase-2 official standardized form.
   Supports:
     "in_transit"
     "inTransit"
     "in-transit"
     "in transit"
--------------------------------------------------------------- */
export function normalizeStatus(raw) {
  if (!raw) return null;

  const key = String(raw).replace(/[-_\s]/g, "").toLowerCase();

  const map = {
    accepted: "accepted",
    pickupscheduled: "pickup_scheduled",
    intransit: "inTransit",
    outfordelivery: "out_for_delivery",
    delivered: "delivered",
    completed: "completed",

    // premium
    depositpaid: "depositPaid",
    buyeraccepted: "buyerAccepted",
    buyerdeclined: "buyerDeclined",
    preparingdelivery: "preparingDelivery",
    intransitpremium: "inTransit", // fallback
    sold: "sold",
    cancelled: "cancelled",
    autoclose: "autoClosed",
    autocloseds: "autoClosed",
  };

  return map[key] || raw;
}

/* ---------------------------------------------------------------
   🕒 formatDateSafe()
   Handles Firestore Timestamp, ISO strings, JS dates.
--------------------------------------------------------------- */
export function formatDateSafe(date) {
  if (!date) return null;

  try {
    if (date?.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    if (typeof date === "string" || typeof date === "number") {
      return new Date(date).toLocaleDateString();
    }
    return date.toLocaleDateString();
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------
   🖼 getSafeImage(item)
   Universal safe image getter for any structure  
   (free requests, premium purchases, listings)
--------------------------------------------------------------- */
export function getSafeImage(item) {
  if (!item) return "/images/default-item.jpg";

  return (
    item.images?.[0] ||
    item.itemData?.images?.[0] ||
    item.itemImages?.[0] ||
    "/images/default-item.jpg"
  );
}

/* ---------------------------------------------------------------
   🏷 getSafeTitle(item)
   Universal safe title getter
--------------------------------------------------------------- */
export function getSafeTitle(item) {
  if (!item) return "Unknown Item";

  return (
    item.title ||
    item.itemTitle ||
    item.itemName ||
    item.itemData?.title ||
    "Unknown Item"
  );
}

/* ---------------------------------------------------------------
   🚚 isInDeliveryFlow(status)
   Determines if free item is mid-delivery
--------------------------------------------------------------- */
export const DELIVERY_FLOW = [
  "accepted",
  "pickup_scheduled",
  "inTransit",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "completed",
];

export function isInDeliveryFlow(status) {
  if (!status) return false;

  const normalized = normalizeStatus(status);
  return DELIVERY_FLOW.includes(normalized);
}

/* ---------------------------------------------------------------
   👑 PREMIUM_FLOW_ORDER
   Used by PremiumTimeline + DetailDrawer
--------------------------------------------------------------- */
export const PREMIUM_FLOW_ORDER = [
  "depositPaid",
  "buyerAccepted",
  "preparingDelivery",
  "inTransit",
  "delivered",
  "sold",
];

export const PREMIUM_CANCEL_STATES = [
  "buyerDeclined",
  "cancelled",
  "autoClosed",
];

/* ---------------------------------------------------------------
   🔎 resolveCurrentStatus(item)
   Determines the *true* status for rendering:
     - Free item → deliveryStatus overrides request.status
     - Premium → always use premiumStatus
--------------------------------------------------------------- */
export function resolveCurrentStatus(item) {
  if (!item) return null;

  // PREMIUM ITEM
  if (item.isPremium || item.type === "premium") {
    return normalizeStatus(item.premiumStatus);
  }

  // FREE ITEM: deliveryStatus overrides base status
  const delivery = normalizeStatus(item.deliveryStatus);
  const base = normalizeStatus(item.status);

  if (delivery && isInDeliveryFlow(delivery)) {
    return delivery;
  }

  return base;
}

/* ---------------------------------------------------------------
   🧪 validatePickupDate()
   Ensures pickup scheduling date/time is valid
--------------------------------------------------------------- */
export function validatePickupDate(dateString) {
  if (!dateString) return false;

  try {
    const d = new Date(dateString);
    return d instanceof Date && !isNaN(d.valueOf());
  } catch {
    return false;
  }
}
