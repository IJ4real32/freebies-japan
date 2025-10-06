import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { sendEmail, emailTemplates } from "./emailService.js";
import { assertAuthedUser, assertAdmin } from "../../utils/backendUtils.js";
import { TestEmailRequest } from "../../types/index.js";

// TEST EMAIL SYSTEM (Admin only)
export const testEmailSystem = onCall<TestEmailRequest>({
  // Explicit configuration for callable function
  region: "asia-northeast1",
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80
}, async (request) => {
  try {
    assertAuthedUser(request.auth);
    await assertAdmin(request.auth);

    const { email, type } = request.data || {};
    if (!email) throw new HttpsError("invalid-argument", "Email required");

    let subject = "";
    let html = "";

    switch (type) {
      case 'welcome':
        subject = "Welcome to Freebies Japan 🎉";
        html = emailTemplates.welcome("Test User");
        break;
      case 'donation':
        subject = "Thank you for donating!";
        html = emailTemplates.donationConfirmation("Test Donor", "Test Item");
        break;
      case 'selection_winner':
        subject = "🎉 You've been selected!";
        html = emailTemplates.selectionWinner("Test User", "Test Item");
        break;
      case 'selection_loser':
        subject = "Update on your request";
        html = emailTemplates.selectionNotSelected("Test User", "Test Item");
        break;
      default:
        throw new HttpsError("invalid-argument", "Invalid email type");
    }

    const result = await sendEmail(email, subject, html);
    
    if (result.success) {
      return { 
        success: true, 
        message: `Test email sent to ${email}`,
        messageId: result.messageId 
      };
    } else {
      throw new HttpsError("internal", result.error || "Failed to send email");
    }
  } catch (error: any) {
    logger.error("testEmailSystem error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to send test email");
  }
});