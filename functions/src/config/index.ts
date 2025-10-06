import { setGlobalOptions } from "firebase-functions/v2";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// ------------------------------------------------------------------
// Global options MUST be set at the very top to avoid early init work
// ------------------------------------------------------------------
export const initializeFirebase = () => {
  setGlobalOptions({
    region: "asia-northeast1",
    maxInstances: 10,
    memory: "256MiB",
    timeoutSeconds: 60,
    concurrency: 80,
  });
};

// ------------------------------------------------------------------
// Firebase Admin Initialization - make it lazy
// ------------------------------------------------------------------
let adminInitialized = false;

export const initializeAdmin = () => {
  if (adminInitialized) return admin.firestore();
  
  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    adminInitialized = true;
    return admin.firestore();
  } catch (error) {
    logger.error("Admin initialization error:", error);
    throw error;
  }
};
// ------------------------------------------------------------------
// App Configuration
// ------------------------------------------------------------------
export const getAppConfig = () => {
  const cfgSafe: any = (() => {
    try {
      return (functions as any).config ? functions.config() ?? {} : {};
    } catch {
      return {};
    }
  })();

  const ORIGINS: string[] = String(cfgSafe.app?.allowed_origins ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (ORIGINS.length === 0) {
    logger.warn("No app.allowed_origins configured. Only requests without an Origin header will be allowed by CORS.");
  } else {
    logger.info("Allowed origins loaded", { ORIGINS });
  }

  return {
    origins: ORIGINS,
    sendgridApiKey: cfgSafe.sendgrid?.api_key,
  };
};

// Re-export admin for use in other modules
export { admin };