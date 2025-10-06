import * as nodemailer from "nodemailer";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";

// Get SendGrid API key from Firebase config
const config = functions.config();
const SENDGRID_API_KEY = config.sendgrid?.api_key;

// Don't initialize anything on import - do it lazily
let transport: nodemailer.Transporter | null = null;
let isEmailEnabled = false;

// Initialize email service lazily on first use
function initializeEmailService() {
  if (transport !== null) return; // Already initialized
  
  if (SENDGRID_API_KEY) {
    try {
      transport = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: SENDGRID_API_KEY
        }
      });
      isEmailEnabled = true;
      logger.info("✅ SendGrid transporter created");
    } catch (error) {
      logger.error("❌ Failed to create email transporter:", error);
      transport = null;
      isEmailEnabled = false;
    }
  } else {
    logger.warn("SendGrid API key not configured. Emails will not be sent.");
  }
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  // Initialize on first use, not on import
  if (transport === null) {
    initializeEmailService();
  }
  
  if (!transport || !isEmailEnabled) {
    logger.warn("Email service not available - email not sent", { to, subject });
    return { success: false, error: "Email service not configured or available" };
  }

  try {
    const result = await transport.sendMail({
      from: '"Freebies Japan" <noreply@freebiesjapan.com>',
      to,
      subject: `[Freebies Japan] ${subject}`,
      html,
      replyTo: 'contact@freebiesjapan.com'
    });

    logger.info("Email sent successfully", { to, subject, messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    logger.error("Failed to send email", { to, subject, error: error.message });
    
    // If there's an auth error, disable email service temporarily
    if (error.code === 'EAUTH') {
      logger.error("Email authentication failed - disabling email service");
      isEmailEnabled = false;
    }
    
    return { success: false, error: error.message };
  }
}

// Check if email service is available
export function isEmailServiceAvailable(): boolean {
  if (transport === null) {
    initializeEmailService();
  }
  return isEmailEnabled && transport !== null;
}
// Email Templates
export const emailTemplates = {
  welcome: (userName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌟 Welcome to Freebies Japan!</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Welcome to Japan's community sharing platform! We're excited to have you join us.</p>
          <p>With Freebies Japan, you can:</p>
          <ul>
            <li>📦 Donate items you no longer need</li>
            <li>🔍 Find free items in your area</li>
            <li>🤝 Connect with your local community</li>
            <li>🌱 Reduce waste and help others</li>
          </ul>
          <p>Ready to get started? Browse available items or make your first donation!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Freebies Japan. Making communities stronger through sharing.</p>
          <p>Questions? Contact us at <a href="mailto:contact@freebiesjapan.com">contact@freebiesjapan.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `,

  donationConfirmation: (userName: string, itemName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
        .item-card { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Donation Received!</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Thank you for your generous donation to <strong>Freebies Japan</strong>!</p>
          
          <div class="item-card">
            <h3>${itemName}</h3>
            <p>Your item has been successfully listed and is now available for those in need.</p>
          </div>
          
          <p>We'll notify you when someone is selected for your donation. Thank you for making a difference!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Freebies Japan</p>
        </div>
      </div>
    </body>
    </html>
  `,

  selectionWinner: (userName: string, itemName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Great news! You've been selected for <strong>${itemName}</strong>!</p>
          <p>The donor will contact you shortly to arrange pickup details.</p>
          <p>Please check your messages and respond promptly to coordinate the pickup.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Freebies Japan</p>
        </div>
      </div>
    </body>
    </html>
  `,

  selectionNotSelected: (userName: string, itemName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #666; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Selection Update</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Thank you for your interest in <strong>${itemName}</strong>.</p>
          <p>Unfortunately, you weren't selected this time, but don't worry! There are many other great items available.</p>
          <p>Keep trying - your next opportunity is just around the corner!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Freebies Japan</p>
        </div>
      </div>
    </body>
    </html>
  `,

  requestReceived: (itemName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Delivery Update</h1>
        </div>
        <div class="content">
          <h2>Update on ${itemName}</h2>
          <p>Your item delivery status has been updated.</p>
          <p>Please check the app for the latest delivery information.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Freebies Japan</p>
        </div>
      </div>
    </body>
    </html>
  `
};