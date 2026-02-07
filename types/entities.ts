export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  sessions: "sessions",
  verificationTokens: "verificationTokens",
  products: "products",
  auctions: "auctions",
  bids: "bids",
  watchlist: "watchlist",
  notifications: "notifications",
  transactions: "transactions",
} as const;

export type EntityId = string;

export type UserRole = "user" | "admin";
export type ProductCondition =
  | "new"
  | "like_new"
  | "excellent"
  | "good"
  | "fair"
  | "poor";
export type ProductStatus = "draft" | "pending" | "listed" | "sold" | "removed";
export type AuctionStatus = "scheduled" | "live" | "ended" | "cancelled";
export type BidSource = "manual" | "auto";
export type TransactionStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded";
export type NotificationType =
  | "outbid"
  | "auction_won"
  | "auction_lost"
  | "auction_ending"
  | "payment_due"
  | "system";

export interface BaseTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEntity extends BaseTimestamps {
  _id: EntityId;
  name: string;
  email: string;
  passwordHash?: string;
  image?: string | null;
  emailVerified?: Date | null;
  role: UserRole;
  isBlocked: boolean;
  phone?: string | null;
}

export interface ProductImage {
  fileId: EntityId;
  alt?: string;
  isPrimary: boolean;
}

export interface ProductEntity extends BaseTimestamps {
  _id: EntityId;
  sellerId: EntityId;
  title: string;
  slug: string;
  description: string;
  category: string;
  condition: ProductCondition;
  images: ProductImage[];
  status: ProductStatus;
  tags: string[];
}

export interface AuctionEntity extends BaseTimestamps {
  _id: EntityId;
  productId: EntityId;
  sellerId: EntityId;
  title: string;
  status: AuctionStatus;
  startPrice: number;
  reservePrice?: number | null;
  bidIncrement: number;
  currentPrice: number;
  highestBidderId?: EntityId | null;
  startsAt: Date;
  endsAt: Date;
  totalBids: number;
  winnerId?: EntityId | null;
  endedAt?: Date | null;
}

export interface BidEntity {
  _id: EntityId;
  auctionId: EntityId;
  bidderId: EntityId;
  amount: number;
  source: BidSource;
  isWinning: boolean;
  createdAt: Date;
}

export interface WatchlistEntity {
  _id: EntityId;
  userId: EntityId;
  auctionId: EntityId;
  createdAt: Date;
}

export interface NotificationEntity {
  _id: EntityId;
  userId: EntityId;
  type: NotificationType;
  title: string;
  message: string;
  auctionId?: EntityId;
  isRead: boolean;
  createdAt: Date;
}

export interface TransactionEntity extends BaseTimestamps {
  _id: EntityId;
  auctionId: EntityId;
  buyerId: EntityId;
  sellerId: EntityId;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider: string;
  providerRef?: string;
  paidAt?: Date | null;
}
