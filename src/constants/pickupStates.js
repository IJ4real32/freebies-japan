// ===================================================================
// pickupStates.js — PHASE-2 CANONICAL PICKUP STATES
// ===================================================================

export const PICKUP_STATES = {
  REQUESTED: "pickupRequested",
  SCHEDULED: "pickupScheduled",
  CONFIRMED: "pickupConfirmed",
  COMPLETED: "pickupCompleted",
};

export const PICKUP_ORDER = [
  PICKUP_STATES.REQUESTED,
  PICKUP_STATES.SCHEDULED,
  PICKUP_STATES.CONFIRMED,
  PICKUP_STATES.COMPLETED,
];

export const isTerminalPickup = (status) =>
  status === PICKUP_STATES.COMPLETED;
