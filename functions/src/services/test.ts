import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertAuthedUser } from "../utils/backendUtils.js";
import { admin } from "../config";

const db = admin.firestore();

// Common configuration for test functions
const testConfig = {
  region: "asia-northeast1",
  cors: true,
  timeoutSeconds: 30,
  memory: "128MiB" as any, // Fixed: Type assertion to resolve memory type error
  minInstances: 0,
  maxInstances: 5,
  concurrency: 50
};

// ------------------------------------------------------------------
// CALLABLE: Test connection
// ------------------------------------------------------------------
export const testConnection = onCall(testConfig, async (request) => {
  try {
    const uid = assertAuthedUser(request.auth);
    const testDoc = await db.collection("adminInbox").limit(1).get();
    
    return {
      success: true,
      uid,
      dbConnected: true,
      adminInboxExists: !testDoc.empty,
      documentCount: testDoc.size,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error("testConnection error", error);
    
    // Return error response instead of throwing to make it easier for clients to handle
    return { 
      success: false, 
      error: error.message,
      dbConnected: false,
      timestamp: new Date().toISOString(),
    };
  }
});