import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

declare global {
  var _dbSchemaReady: Promise<void> | undefined;
}

async function createIndexes() {
  const { db } = await connectToDatabase();

  await Promise.all([
    db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(COLLECTIONS.users).createIndex({ role: 1, isBlocked: 1 }),
    db.collection(COLLECTIONS.users).createIndex({ isSellerVerified: 1, kycStatus: 1 }),
    db.collection(COLLECTIONS.verificationTokens).createIndex({ token: 1 }, { unique: true }),
    db.collection(COLLECTIONS.verificationTokens).createIndex({ userId: 1, createdAt: -1 }),
    db
      .collection(COLLECTIONS.verificationTokens)
      .createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),

    db
      .collection(COLLECTIONS.kycSubmissions)
      .createIndex({ userId: 1, createdAt: -1 }),
    db
      .collection(COLLECTIONS.kycSubmissions)
      .createIndex({ status: 1, createdAt: -1 }),
    db
      .collection(COLLECTIONS.kycSubmissions)
      .createIndex({ reviewedById: 1, reviewedAt: -1 }),

    db.collection(COLLECTIONS.products).createIndex({ sellerId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.products).createIndex({ slug: 1 }, { unique: true }),
    db.collection(COLLECTIONS.products).createIndex({ status: 1, category: 1 }),

    db.collection(COLLECTIONS.auctions).createIndex({ status: 1, endsAt: 1 }),
    db.collection(COLLECTIONS.auctions).createIndex({ sellerId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.auctions).createIndex({ productId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.auctions).createIndex({ highestBidderId: 1, endsAt: -1 }),

    db.collection(COLLECTIONS.bids).createIndex({ auctionId: 1, amount: -1, createdAt: -1 }),
    db.collection(COLLECTIONS.bids).createIndex({ bidderId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.bids).createIndex({ auctionId: 1, bidderId: 1 }),

    db
      .collection(COLLECTIONS.watchlist)
      .createIndex({ userId: 1, auctionId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.watchlist).createIndex({ userId: 1, createdAt: -1 }),

    db.collection(COLLECTIONS.notifications).createIndex({ userId: 1, isRead: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.notifications).createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 }),

    db.collection(COLLECTIONS.transactions).createIndex({ buyerId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.transactions).createIndex({ sellerId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.transactions).createIndex({ auctionId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.transactions).createIndex({ status: 1, createdAt: -1 }),
    db
      .collection(COLLECTIONS.transactions)
      .createIndex({ esewaTransactionUuid: 1 }, { unique: true, sparse: true }),
    db
      .collection(COLLECTIONS.transactions)
      .createIndex({ khaltiPidx: 1 }, { unique: true, sparse: true }),
    db.collection(COLLECTIONS.transactions).createIndex({ provider: 1, status: 1, createdAt: -1 }),

    db
      .collection(COLLECTIONS.auctionContactRequests)
      .createIndex({ auctionId: 1, submittedById: 1 }, { unique: true }),
    db
      .collection(COLLECTIONS.auctionContactRequests)
      .createIndex({ recipientId: 1, createdAt: -1 }),
    db
      .collection(COLLECTIONS.auctionContactRequests)
      .createIndex({ auctionId: 1, createdAt: -1 }),

    db.collection(COLLECTIONS.reviews).createIndex({ auctionId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.reviews).createIndex({ sellerId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.reviews).createIndex({ reviewerId: 1, createdAt: -1 }),
  ]);
}

export function ensureDatabaseSchema() {
  if (!global._dbSchemaReady) {
    global._dbSchemaReady = createIndexes();
  }
  return global._dbSchemaReady;
}
