import { Timestamp } from "./index";

export type LotteryStatus = "draft" | "open" | "closed" | "drawn";

export interface LotteryDoc {
  title: string;
  itemId?: string;
  description?: string;
  maxWinners: number;
  status: LotteryStatus;
  opensAt?: Timestamp | null;
  closesAt?: Timestamp | null;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
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