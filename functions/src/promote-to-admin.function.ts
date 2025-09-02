import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

// Initialize Firebase Admin with checks
if (admin.apps.length === 0) {
  admin.initializeApp();
}

interface PromotionRequest {
  targetUserId: string;
}

interface PromotionResponse {
  success: boolean;
  message: string;
  promotedUser?: {
    uid: string;
    email?: string;
  };
}

export const promoteToAdmin = onCall<PromotionRequest>(
  { 
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 60,
    enforceAppCheck: false
  },
  async (request): Promise<PromotionResponse> => {
    // 1. Authentication Check
    if (!request.auth) {
      logger.warn("Unauthenticated promotion attempt");
      throw new HttpsError(
        "unauthenticated",
        "Only authenticated users can promote admins"
      );
    }

    // 2. Input Validation
    if (!request.data?.targetUserId) {
      logger.error("Invalid request data", { data: request.data });
      throw new HttpsError(
        "invalid-argument",
        "The function must be called with a valid targetUserId"
      );
    }

    const { targetUserId } = request.data;
    const callerUid = request.auth.uid;

    // 3. Authorization Check
    const isCallerAdmin = await checkAdminStatus(callerUid);
    if (!isCallerAdmin) {
      logger.warn(`Unauthorized promotion attempt by ${callerUid}`);
      throw new HttpsError(
        "permission-denied",
        "Only existing admins can promote users"
      );
    }

    // 4. Target User Verification
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await admin.auth().getUser(targetUserId);
    } catch (error) {
      logger.error("Target user not found", { targetUserId });
      throw new HttpsError(
        "not-found",
        "Target user not found"
      );
    }

    // 5. Firestore Transaction
    const userRef = admin.firestore().doc(`users/${targetUserId}`);

    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists && userDoc.data()?.role === "admin") {
          throw new HttpsError(
            "already-exists",
            "User is already an admin"
          );
        }

        transaction.set(userRef, {
          role: "admin",
          email: targetUser.email,
          lastPromoted: admin.firestore.FieldValue.serverTimestamp(),
          promotedBy: callerUid,
          ...(userDoc.exists ? userDoc.data() : {})
        }, { merge: true });
      });

      // 6. Set Custom Claim
      await admin.auth().setCustomUserClaims(targetUserId, { admin: true });

      logger.log(`Successfully promoted user ${targetUserId} to admin`);
      return {
        success: true,
        message: `Successfully promoted ${targetUser.email || targetUserId} to admin`,
        promotedUser: {
          uid: targetUserId,
          email: targetUser.email
        }
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      
      const errorMessage = getErrorMessage(error);
      logger.error("Promotion failed", { error: errorMessage });
      throw new HttpsError(
        "internal",
        "Promotion failed",
        { errorDetails: errorMessage }
      );
    }
  }
);

// Helper functions
async function checkAdminStatus(uid: string): Promise<boolean> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  return userDoc.exists && userDoc.data()?.role === "admin";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error occurred";
}