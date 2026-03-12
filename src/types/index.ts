import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  displayName: string;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  groupIds: string[];
  createdAt: Timestamp;
}

export type Currency = "EUR" | "USD";

export interface Group {
  id?: string;
  name: string;
  description: string;
  createdBy: string;
  inviteCode: string;
  memberIds: string[];
  currency: Currency;
  createdAt: Timestamp;
}

export type MarketStatus = "open" | "closed" | "resolved";
export type MarketOutcome = "yes" | "no" | null;
export type BetSide = "yes" | "no";

export interface Market {
  id?: string;
  groupId: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  resolutionDate: Timestamp;
  status: MarketStatus;
  outcome: MarketOutcome;
  resolvedBy: string | null;
  totalYesAmount: number;
  totalNoAmount: number;
}

export interface Bet {
  id?: string;
  marketId: string;
  groupId: string;
  userId: string;
  userDisplayName: string;
  side: BetSide;
  amount: number;
  placedAt: Timestamp;
  payout: number;
}

export interface Settlement {
  id?: string;
  groupId: string;
  marketId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settled: boolean;
  createdAt: Timestamp;
}
