import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

// Use relative import with .js extension for TypeScript
import { sendEmail, emailTemplates } from "./emailService.js";
import { admin } from "../../config/index.js";

const db = admin.firestore();

// ... rest of your trigger functions (keep your existing code)
export const onUserCreateSendWelcome = onDocumentCreated("users/{userId}", async (event) => {
  // ... your existing function body
});

export const onDonationCreatedSendConfirmation = onDocumentCreated("donations/{donationId}", async (event) => {
  // ... your existing function body
});

export const onRequestStatusUpdateSendEmail = onDocumentUpdated("requests/{requestId}", async (event) => {
  // ... your existing function body
});

export const onDeliveryStatusUpdate = onDocumentUpdated("requests/{requestId}", async (event) => {
  // ... your existing function body
});