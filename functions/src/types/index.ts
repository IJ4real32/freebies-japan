import * as admin from "firebase-admin";

export type AuthCtx = any;
export type Timestamp = admin.firestore.Timestamp;

// ------------------------------------------------------------------
// Admin Inbox Types
// ------------------------------------------------------------------
export interface AdminInboxDoc {
  id: string;
  kind?: string;
  type?: string;
  status?: string;
  amountJPY?: number;
  itemId?: string;
  paymentId?: string;
  userId?: string;
  userEmail?: string | null;
  userName?: string | null;
  currency?: string;
  code?: string;
  createdAt: any;
  updatedAt?: any;
  [key: string]: any;
}

// ------------------------------------------------------------------
// Payment Types
// ------------------------------------------------------------------
export interface CreateDepositRequestData {
  type: "subscription" | "item";
  targetId?: string;
  amount: number;
  address: {
    postalCode: string;
    prefecture: string;
    city: string;
    street: string;
    recipientName: string;
    phone: string;
  };
}

export interface ReportDepositData {
  paymentId: string;
  amount?: number;
  method?: string;
  transferName?: string;
  txId?: string;
  receiptUrl?: string;
  proofUrls?: string[];
  address?: {
    recipientName?: string;
    phone?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    street?: string;
    building?: string;
  };
}

export interface PaymentQueueRequest {
  status?: string;
  limit?: number;
  startAfter?: string;
}

export interface PaymentDetailsRequest {
  paymentId: string;
}

export interface ApproveDepositRequest {
  paymentId: string;
  reportId: string;
}

export interface RejectDepositRequest {
  paymentId: string;
  reportId: string;
  reason?: string;
}

// ------------------------------------------------------------------
// Email Test Types
// ------------------------------------------------------------------
export interface TestEmailRequest {
  email: string;
  type: 'welcome' | 'donation' | 'selection_winner' | 'selection_loser';
}

// ... existing types ...

// ------------------------------------------------------------------
// Lottery Types
// ------------------------------------------------------------------
export type LotteryStatus = "draft" | "open" | "closed" | "drawn";

export interface LotteryDoc {
  title: string;
  itemId?: string;
  description?: string;
  maxWinners: number;
  status: LotteryStatus;
  opensAt?: admin.firestore.Timestamp | null;
  closesAt?: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
  createdBy: string;
  updatedAt: admin.firestore.Timestamp;
  winners?: string[];
  ticketCount?: number;
}

export interface CreateLotteryRequest {
  title: string;
  itemId?: string;
  description?: string;
  maxWinners: number;
  opensAt?: string | null;
  closesAt?: string | null;
  status?: LotteryStatus;
}

export interface LotteryActionRequest {
  lotteryId: string;
}

export interface DrawLotteryRequest {
  lotteryId: string;
  seed?: string;
}

export interface LotteryStatusRequest {
  lotteryId: string;
}