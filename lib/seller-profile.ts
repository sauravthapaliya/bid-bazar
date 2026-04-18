import "server-only";

import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getSellerReviews } from "@/lib/reviews";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

function asIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

function idVariants(id: string): IdLike[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  return null;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getPrimaryImageFileId(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  const preferred =
    images.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "isPrimary" in item &&
        (item as { isPrimary?: boolean }).isPrimary,
    ) ?? images[0];

  if (!preferred || typeof preferred !== "object" || !("fileId" in preferred)) {
    return null;
  }

  return asIdString((preferred as { fileId: unknown }).fileId);
}

function resolveAuctionStatus(status: unknown, endsAt: unknown) {
  const raw = String(status ?? "unknown");
  const ends = toDate(endsAt);
  if ((raw === "live" || raw === "scheduled") && ends && ends <= new Date()) {
    return "expired";
  }
  return raw;
}

export type SellerProfileAuction = {
  id: string;
  title: string;
  status: string;
  currentPrice: number;
  totalBids: number;
  endsAt: Date | null;
  imageUrl: string | null;
};

export type SellerProfileData = {
  seller: {
    id: string;
    name: string;
    imageUrl: string | null;
    isSellerVerified: boolean;
    memberSince: Date | null;
  };
  summary: {
    averageRating: number;
    totalReviews: number;
    activeAuctions: number;
    completedAuctions: number;
    successfulSales: number;
  };
  recentAuctions: SellerProfileAuction[];
  eligibleReviewAuctions: Array<{
    id: string;
    title: string;
    endedAt: Date | null;
  }>;
};

export async function getSellerProfile(
  sellerId: string,
): Promise<SellerProfileData | null> {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const { db } = await connectToDatabase();

  const users = db.collection<Record<string, unknown>>(COLLECTIONS.users);
  const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
  const products = db.collection<Record<string, unknown>>(COLLECTIONS.products);
  const transactions = db.collection<Record<string, unknown>>(COLLECTIONS.transactions);
  const reviews = db.collection<Record<string, unknown>>(COLLECTIONS.reviews);

  const seller = await users.findOne(
    { _id: { $in: idVariants(sellerId) } } as never,
    { projection: { name: 1, image: 1, isSellerVerified: 1, createdAt: 1 } },
  );

  if (!seller) return null;

  const [reviewData, recentAuctionDocs, activeAuctions, completedAuctions, successfulSales] =
    await Promise.all([
      getSellerReviews(sellerId),
      auctions
        .find({ sellerId: { $in: idVariants(sellerId) } } as never)
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray(),
      auctions.countDocuments({
        sellerId: { $in: idVariants(sellerId) },
        status: { $in: ["live", "scheduled"] },
      } as never),
      auctions.countDocuments({
        sellerId: { $in: idVariants(sellerId) },
        status: { $in: ["ended", "cancelled"] },
      } as never),
      transactions.countDocuments({
        sellerId: { $in: idVariants(sellerId) },
        status: "paid",
      } as never),
    ]);

  const productIds = recentAuctionDocs
    .map((auction) => auction.productId)
    .filter(Boolean)
    .map((id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id));

  const productDocs = productIds.length
    ? await products.find({ _id: { $in: productIds } } as never).toArray()
    : [];

  const productsById = new Map<string, Record<string, unknown>>();
  for (const product of productDocs) {
    productsById.set(asIdString(product._id), product);
  }

  const recentAuctions: SellerProfileAuction[] = recentAuctionDocs.map((auction) => {
    const product = productsById.get(asIdString(auction.productId));
    const imageId = getPrimaryImageFileId(product?.images);
    return {
      id: asIdString(auction._id),
      title: String(auction.title ?? product?.title ?? "Untitled Auction"),
      status: resolveAuctionStatus(auction.status, auction.endsAt),
      currentPrice: toNumber(auction.currentPrice),
      totalBids: toNumber(auction.totalBids),
      endsAt: toDate(auction.endsAt),
      imageUrl: imageId ? `/api/uploads/${imageId}` : null,
    };
  });

  let eligibleReviewAuctions: SellerProfileData["eligibleReviewAuctions"] = [];
  if (viewerId) {
    const wonAuctionDocs = await auctions
      .find({
        sellerId: { $in: idVariants(sellerId) },
        winnerId: { $in: idVariants(viewerId) },
        status: "ended",
      } as never)
      .sort({ endedAt: -1, endsAt: -1 })
      .limit(12)
      .toArray();

    if (wonAuctionDocs.length > 0) {
      const wonAuctionIds = wonAuctionDocs.map((auction) => auction._id);
      const existingReviews = await reviews
        .find({
          auctionId: { $in: wonAuctionIds },
          reviewerId: { $in: idVariants(viewerId) },
        } as never, { projection: { auctionId: 1 } })
        .toArray();

      const reviewedAuctionIds = new Set(
        existingReviews.map((review) => asIdString(review.auctionId)),
      );

      eligibleReviewAuctions = wonAuctionDocs
        .filter((auction) => !reviewedAuctionIds.has(asIdString(auction._id)))
        .map((auction) => ({
          id: asIdString(auction._id),
          title: String(auction.title ?? "Auction"),
          endedAt: toDate(auction.endedAt ?? auction.endsAt),
        }));
    }
  }

  return {
    seller: {
      id: asIdString(seller._id),
      name: String(seller.name ?? "Seller"),
      imageUrl: typeof seller.image === "string" ? seller.image : null,
      isSellerVerified: seller.isSellerVerified === true,
      memberSince: toDate(seller.createdAt),
    },
    summary: {
      averageRating: reviewData.summary.averageRating,
      totalReviews: reviewData.summary.totalReviews,
      activeAuctions,
      completedAuctions,
      successfulSales,
    },
    recentAuctions,
    eligibleReviewAuctions,
  };
}
