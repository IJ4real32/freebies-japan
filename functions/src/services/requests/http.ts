import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { corsHandler } from "../../config/cors.js";
import { admin } from "../../config/index.js";
import { toMillisLoose, serverTS, nowTS } from "../../utils/backendUtils.js";

const db = admin.firestore();

// ------------------------------------------------------------------
// USER REQUEST FREE ITEM (HTTP V2)
// ------------------------------------------------------------------
export const userRequestFreeItemHTTP = onRequest({
  // Explicit configuration for HTTP function
  region: "asia-northeast1",
  cors: false, // We handle CORS manually
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    logger.info("userRequestFreeItemHTTP called", {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    try {
      // Handle preflight requests
      if (req.method === "OPTIONS") {
        logger.info("Handling OPTIONS preflight");
        res.status(204).send("");
        return;
      }

      // Health check probes expect a 200 response
      if (req.method === "GET" || req.method === "HEAD") {
        logger.info("Health check ping", { method: req.method, path: req.path });
        res.status(200).json({ ok: true });
        return;
      }

      // Only allow POST requests
      if (req.method !== "POST") {
        logger.warn("Method not allowed", { method: req.method });
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn("Missing or invalid authorization header");
        res.status(401).json({ error: "Unauthorized - missing token" });
        return;
      }

      const token = authHeader.split("Bearer ")[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
        logger.info("User authenticated", { uid: decodedToken.uid });
      } catch (authError) {
        logger.error("Token verification failed", { error: authError });
        res.status(401).json({ error: "Unauthorized - invalid token" });
        return;
      }

      const uid = decodedToken.uid;

      // Get itemId from request body
      const { itemId } = req.body;
      if (!itemId || typeof itemId !== "string") {
        logger.warn("Invalid itemId", { itemId });
        res.status(400).json({ error: "itemId required" });
        return;
      }

      logger.info("Processing request", { uid, itemId });

      // 3) Load item
      const itemRef = db.doc(`donations/${itemId}`);
      const itemSnap = await itemRef.get();
      if (!itemSnap.exists) {
        logger.warn("Item not found", { itemId });
        res.status(404).json({ error: "Item not found" });
        return;
      }

      const item = itemSnap.data() as any;

      // Prevent requesting premium items through free flow
      const isPremium = item?.type === "premium" || item?.accessType === "premium";
      if (isPremium) {
        logger.warn("Attempted to request premium item as free", { itemId });
        res.status(400).json({ error: "Item is not requestable" });
        return;
      }

      // 4) Enforce free-item request window if provided
      const nowMs = admin.firestore.Timestamp.now().toMillis();
      const endMs = toMillisLoose(item?.requestWindowEnd);
      if (endMs !== null && nowMs >= endMs) {
        logger.warn("Request window closed", { itemId, endMs, nowMs });
        res.status(400).json({ error: "Request window closed" });
        return;
      }

      // 5) Idempotency: prevent duplicate requests
      const dupSnap = await db
        .collection("requests")
        .where("userId", "==", uid)
        .where("itemId", "==", itemId)
        .limit(1)
        .get();

      if (!dupSnap.empty) {
        const existing = dupSnap.docs[0];
        logger.info("Duplicate request found", {
          itemId,
          existingRequestId: existing.id,
        });
        res.status(200).json({
          requestId: existing.id,
          alreadyRequested: true,
        });
        return;
      }

      // 6) Subscription / trial gating (atomic)
      let createdRequestId: string | null = null;
      let remainingTrialCredits: number | undefined = undefined;

      try {
        await db.runTransaction(async (tx) => {
          const userRef = db.doc(`users/${uid}`);
          const userDoc = await tx.get(userRef);
          const u = userDoc.exists ? (userDoc.data() as any) : {};

          const isSubscribed = !!u?.isSubscribed || !!u?.testSubscriber;
          const trialLeft =
            typeof u?.trialCreditsLeft === "number"
              ? u.trialCreditsLeft
              : typeof u?.trialCredits === "number"
              ? u.trialCredits
              : 0;

          logger.info("User subscription check", {
            uid,
            isSubscribed,
            trialLeft,
          });

          if (!isSubscribed) {
            if (trialLeft <= 0) {
              throw new Error("No trial credits remaining");
            }
            remainingTrialCredits = trialLeft - 1;

            tx.set(
              userRef,
              {
                trialCreditsLeft: remainingTrialCredits,
                updatedAt: serverTS(),
              },
              { merge: true }
            );
          }

          // Create the request document
          const reqRef = db.collection("requests").doc();
          createdRequestId = reqRef.id;

          tx.set(reqRef, {
            id: reqRef.id,
            userId: uid,
            userEmail: decodedToken.email ?? null,
            itemId,
            status: "pending",
            createdAt: nowTS(),
            updatedAt: serverTS(),
            requestedAt: nowTS(),
            itemTitle: item?.title ?? null,
            itemImages: Array.isArray(item?.images) ? item.images : [],
            accessType: "free",
          });
        });

        logger.info("Transaction committed successfully", {
          requestId: createdRequestId,
          remainingTrialCredits,
        });
      } catch (transactionError: any) {
        logger.error("Transaction failed", {
          itemId,
          error: transactionError,
        });

        if (transactionError.message === "No trial credits remaining") {
          res.status(403).json({ error: "No trial credits remaining" });
        } else {
          res.status(500).json({ error: "Failed to process request" });
        }
        return;
      }

      // ✅ SUCCESS
      const result = {
        requestId: createdRequestId,
        remainingTrialCredits,
      };

      logger.info("Request completed successfully", result);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error("Unexpected error in userRequestFreeItemHTTP", {
        message: error?.message,
        stack: error?.stack,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });
});
