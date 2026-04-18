import "server-only";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

function asIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

function idVariants(id: string): (string | ObjectId)[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

export type ReviewItem = {
  id: string;
  auctionId: string;
  auctionTitle: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: Date | null;
};

export type SellerRatingSummary = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export async function getSellerReviews(sellerId: string): Promise<{
  reviews: ReviewItem[];
  summary: SellerRatingSummary;
}> {
  const { db } = await connectToDatabase();
  const reviewsCol = db.collection<Record<string, unknown>>(COLLECTIONS.reviews);
  const usersCol = db.collection<Record<string, unknown>>(COLLECTIONS.users);
  const auctionsCol = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);

  const rawReviews = await reviewsCol
    .find({ sellerId: { $in: idVariants(sellerId) } } as never)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  if (rawReviews.length === 0) {
    return {
      reviews: [],
      summary: { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    };
  }

  const reviewerIds = rawReviews.map((r) => asIdString(r.reviewerId));
  const auctionIds = rawReviews.map((r) => asIdString(r.auctionId));

  const uniqueReviewerIds = [...new Set(reviewerIds)];
  const uniqueAuctionIds = [...new Set(auctionIds)];

  const reviewerClauses = uniqueReviewerIds.map((id) => ({ _id: { $in: idVariants(id) } }));
  const auctionClauses = uniqueAuctionIds.map((id) => ({ _id: { $in: idVariants(id) } }));

  const [reviewerDocs, auctionDocs] = await Promise.all([
    usersCol
      .find({ $or: reviewerClauses } as never, { projection: { name: 1 } })
      .toArray(),
    auctionsCol
      .find({ $or: auctionClauses } as never, { projection: { title: 1 } })
      .toArray(),
  ]);

  const reviewerMap = new Map<string, string>();
  for (const u of reviewerDocs) {
    reviewerMap.set(asIdString(u._id), String(u.name ?? "Bidder"));
  }
  const auctionMap = new Map<string, string>();
  for (const a of auctionDocs) {
    auctionMap.set(asIdString(a._id), String(a.title ?? "Auction"));
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  const reviews: ReviewItem[] = rawReviews.map((r) => {
    const rating = Number(r.rating);
    ratingSum += rating;
    distribution[rating] = (distribution[rating] ?? 0) + 1;
    return {
      id: asIdString(r._id),
      auctionId: asIdString(r.auctionId),
      auctionTitle: auctionMap.get(asIdString(r.auctionId)) ?? "Auction",
      reviewerName: reviewerMap.get(asIdString(r.reviewerId)) ?? "Bidder",
      rating,
      comment: r.comment ? String(r.comment) : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt : null,
    };
  });

  return {
    reviews,
    summary: {
      averageRating: reviews.length > 0 ? Math.round((ratingSum / reviews.length) * 10) / 10 : 0,
      totalReviews: reviews.length,
      distribution: distribution as Record<1 | 2 | 3 | 4 | 5, number>,
    },
  };
}

export async function getReviewForAuction(auctionId: string): Promise<{
  id: string;
  rating: number;
  comment: string | null;
} | null> {
  const { db } = await connectToDatabase();
  const reviewsCol = db.collection<Record<string, unknown>>(COLLECTIONS.reviews);
  const review = await reviewsCol.findOne({
    auctionId: { $in: idVariants(auctionId) },
  } as never);
  if (!review) return null;
  return {
    id: asIdString(review._id),
    rating: Number(review.rating),
    comment: review.comment ? String(review.comment) : null,
  };
}
