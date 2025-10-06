// Export all email-related functions
export { testEmailSystem } from "./callables";
export {
  onUserCreateSendWelcome,
  onDonationCreatedSendConfirmation,
  onRequestStatusUpdateSendEmail,
  onDeliveryStatusUpdate
} from "./triggers";

// Export email service functions
export { sendEmail, emailTemplates, EmailResult } from "./emailService";