export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  sessions: "sessions",
  verificationTokens: "verificationTokens",
  kycSubmissions: "kycSubmissions",
  products: "products",
  auctions: "auctions",
  bids: "bids",
  watchlist: "watchlist",
  notifications: "notifications",
  transactions: "transactions",
  auctionContactRequests: "auctionContactRequests",
  reviews: "reviews",
} as const;

export type EntityId = string;

export type UserRole = "user" | "seller" | "admin";
export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";
export type KycDocumentType = "pan" | "citizenship";
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
export type PaymentProvider = "esewa" | "khalti";
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
  isSellerVerified: boolean;
  kycStatus: KycStatus;
  phone?: string | null;
}

export interface KycSubmissionEntity extends BaseTimestamps {
  _id: EntityId;
  userId: EntityId;
  name: string;
  email: string;
  phone: string;
  address: string;
  panNumber: string;
  citizenshipNumber: string;
  documentType: KycDocumentType;
  documentFileId: EntityId;
  status: Exclude<KycStatus, "not_submitted">;
  reviewNote?: string | null;
  reviewedById?: EntityId | null;
  reviewedAt?: Date | null;
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
  conditionAgeDays?: number | null;
  images: ProductImage[];
  status: ProductStatus;
  tags: string[];
  marketValueEstimate?: {
    estimatedMarketValue: number;
    suggestedStartPrice: number;
    suggestedBidIncrement: number;
    confidence: "low" | "medium" | "high";
    confidenceScore: number;
    reasonCodes: string[];
    deterministicFingerprint: string;
    usesAiExtraction: boolean;
    valuationSource: "gemini";
    valuationDebug: string;
    generatedAt: string;
  };
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
  provider: PaymentProvider;
  providerRef?: string;
  paidAt?: Date | null;
  esewaTransactionUuid?: string | null;
  esewaRefId?: string | null;
  khaltiPidx?: string | null;
  gatewayPayloadHash?: string | null;
}

export interface ReviewEntity {
  _id: EntityId;
  auctionId: EntityId;
  sellerId: EntityId;
  reviewerId: EntityId;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
  createdAt: Date;
}

export interface AuctionContactRequestEntity extends BaseTimestamps {
  _id: EntityId;
  auctionId: EntityId;
  sellerId: EntityId;
  winnerId: EntityId;
  submittedById: EntityId;
  recipientId: EntityId;
  auctionTitle: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  meetingLocation: string;
  preferredContactTime?: string | null;
  note?: string | null;
  sentAt: Date;
}
