/**
 * Main Firebase Functions entry point
 * Configures global settings and exports all functions
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions/v2";
import { promoteToAdmin } from "./promote-to-admin.function";

// Configure global settings for all functions
setGlobalOptions({
  region: "asia-northeast1", // Tokyo region
  maxInstances: 10,         // Maximum instances per function
  memory: "256MiB",         // Default memory allocation
  timeoutSeconds: 60,       // Default timeout
  concurrency: 80           // Maximum concurrent requests per instance
});

// Export all callable functions
export { promoteToAdmin };

// Example HTTP function (uncomment if needed)
/*
import { onRequest } from "firebase-functions/v2/https";
export const api = onRequest({
  region: "asia-northeast1",
  memory: "512MiB"
}, (req, res) => {
  logger.info("HTTP function invoked");
  res.send("Hello from Firebase!");
});
*/