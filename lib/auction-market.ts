import "server-only";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

export type AuctionListItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  conditionAgeDays: number | null;
  status: string;
  currentPrice: number;
  startPrice: number;
  bidIncrement: number;
  totalBids: number;
  startsAt: Date | null;
  endsAt: Date | null;
  sellerId: string;
  sellerName: string;
  isSellerVerified: boolean;
  imageUrl: string | null;
  sellerRating: number | null;
  sellerReviewCount: number;
};

export type AuctionBidItem = {
  id: string;
  amount: number;
  createdAt: Date | null;
  bidderId: string;
  bidderLabel: string;
};

export type AuctionDetail = AuctionListItem & {
  productId: string;
  bids: AuctionBidItem[];
  isOwnerView: boolean;
  winnerId: string | null;
  winnerLabel: string | null;
  isViewerWinner: boolean;
  marketValueEstimate: {
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
  } | null;
};

function asIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
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

function idVariants(id: string): IdLike[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

function getPrimaryImageFileId(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  const preferred =
    images.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "isPrimary" in item &&
        (item as { isPrimary?: boolean }).isPrimary
    ) ?? images[0];

  if (!preferred || typeof preferred !== "object" || !("fileId" in preferred)) {
    return null;
  }

  return asIdString((preferred as { fileId: unknown }).fileId);
}

function bidderMask(bidderId: string) {
  if (bidderId.length <= 6) return bidderId;
  return `${bidderId.slice(0, 3)}***${bidderId.slice(-3)}`;
}

function mapAuctionRow(params: {
  auction: Record<string, unknown>;
  product?: Record<string, unknown>;
  sellerName: string;
  isSellerVerified: boolean;
  sellerRating?: number | null;
  sellerReviewCount?: number;
}): AuctionListItem {
  const { auction, product, sellerName, isSellerVerified, sellerRating, sellerReviewCount } = params;
  const imageId = getPrimaryImageFileId(product?.images);

  return {
    id: asIdString(auction._id),
    title: String(auction.title ?? product?.title ?? "Untitled Auction"),
    description: String(product?.description ?? ""),
    category: String(product?.category ?? "General"),
    condition: String(product?.condition ?? "good"),
    conditionAgeDays:
      typeof product?.conditionAgeDays === "number" ? product.conditionAgeDays : null,
    status: String(auction.status ?? "unknown"),
    currentPrice: toNumber(auction.currentPrice),
    startPrice: toNumber(auction.startPrice),
    bidIncrement: toNumber(auction.bidIncrement, 1),
    totalBids: toNumber(auction.totalBids),
    startsAt: toDate(auction.startsAt),
    endsAt: toDate(auction.endsAt),
    sellerId: asIdString(auction.sellerId),
    sellerName,
    isSellerVerified,
    imageUrl: imageId ? `/api/uploads/${imageId}` : null,
    sellerRating: sellerRating ?? null,
    sellerReviewCount: sellerReviewCount ?? 0,
  };
}

async function getSellerRatingMap(sellerIds: string[], db: Awaited<ReturnType<typeof connectToDatabase>>["db"]) {
  if (sellerIds.length === 0) return new Map<string, { avg: number; count: number }>();

  const uniqueIds = [...new Set(sellerIds)];
  const idClauses = uniqueIds.flatMap((id) => idVariants(id).map((v) => ({ sellerId: v })));

  const agg = await db
    .collection(COLLECTIONS.reviews)
    .aggregate([
      { $match: { $or: idClauses } },
      { $group: { _id: "$sellerId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();

  const map = new Map<string, { avg: number; count: number }>();
  for (const row of agg) {
    map.set(asIdString(row._id), {
      avg: Math.round((row.avg as number) * 10) / 10,
      count: row.count as number,
    });
  }
  return map;
}

async function getUsersMapByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  const stringIds = uniqueIds;
  const objectIds = uniqueIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

  const clauses: Record<string, unknown>[] = [];
  if (stringIds.length > 0) clauses.push({ _id: { $in: stringIds } });
  if (objectIds.length > 0) clauses.push({ _id: { $in: objectIds } });

  if (clauses.length === 0) return new Map<string, string>();

  const { db } = await connectToDatabase();
  const users = await db
    .collection(COLLECTIONS.users)
    .find(clauses.length === 1 ? clauses[0] : { $or: clauses }, { projection: { name: 1 } })
    .toArray();

  const map = new Map<string, string>();
  for (const user of users) {
    map.set(asIdString(user._id), String(user.name ?? "User"));
  }
  return map;
}

export async function getLiveAuctions(limit = 30): Promise<AuctionListItem[]> {
  const { db } = await connectToDatabase();
  const now = new Date();
  const auctionsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
  const productsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.products);

  const auctions = await auctionsCollection
    .find({
      status: { $in: ["live", "scheduled"] },
      endsAt: { $gt: now },
    })
    .sort({ endsAt: 1 })
    .limit(limit)
    .toArray();

  if (auctions.length === 0) return [];

  const productIds = auctions.map((row) => row.productId).filter(Boolean);
  const products = await productsCollection
    .find({
      _id: {
        $in: productIds.map((id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id)),
      },
    } as never)
    .toArray();

  const productById = new Map<string, Record<string, unknown>>();
  for (const product of products) {
    productById.set(asIdString(product._id), product as Record<string, unknown>);
  }

  const sellerIds = auctions.map((row) => asIdString(row.sellerId));
  const [usersById, ratingMap] = await Promise.all([
    getUsersMapByIds(sellerIds),
    getSellerRatingMap(sellerIds, db),
  ]);

  return auctions.map((auction) => {
    const sid = asIdString(auction.sellerId);
    const rating = ratingMap.get(sid);
    return mapAuctionRow({
      auction: auction as Record<string, unknown>,
      product: productById.get(asIdString(auction.productId)),
      sellerName: usersById.get(sid) ?? "Seller",
      isSellerVerified: false,
      sellerRating: rating?.avg ?? null,
      sellerReviewCount: rating?.count ?? 0,
    });
  });
}

export async function getAuctionDetail(
  auctionId: string,
  viewerUserId?: string | null
): Promise<AuctionDetail | null> {
  const { db } = await connectToDatabase();
  const auctionsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
  const productsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.products);
  const bidsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.bids);
  const queryIds = idVariants(auctionId);
  const auctionQuery =
    queryIds.length === 1
      ? { _id: queryIds[0] }
      : { $or: queryIds.map((value) => ({ _id: value })) };

  const auction = await auctionsCollection.findOne(auctionQuery as never);
  if (!auction) return null;

  const product = await productsCollection.findOne({
    _id: ObjectId.isValid(String(auction.productId))
      ? new ObjectId(String(auction.productId))
      : auction.productId,
  } as never);

  const sellerId = asIdString(auction.sellerId);
  const [seller, usersById, sellerRatingMap] = await Promise.all([
    db.collection<Record<string, unknown>>(COLLECTIONS.users).findOne(
      { _id: { $in: idVariants(sellerId) } } as never,
      { projection: { name: 1, isSellerVerified: 1 } },
    ),
    getUsersMapByIds([sellerId]),
    getSellerRatingMap([sellerId], db),
  ]);
  const isOwnerView = Boolean(viewerUserId && idVariants(viewerUserId).some((id) => asIdString(id) === sellerId));
  const winnerIdRaw = auction.winnerId ?? auction.highestBidderId ?? null;
  const winnerId =
    winnerIdRaw === null || winnerIdRaw === undefined || String(winnerIdRaw).length === 0
      ? null
      : asIdString(winnerIdRaw);
  const isViewerWinner = Boolean(
    winnerId &&
      viewerUserId &&
      idVariants(viewerUserId).some((candidate) => asIdString(candidate) === winnerId)
  );
  const winnerNames = winnerId ? await getUsersMapByIds([winnerId]) : new Map<string, string>();
  const winnerLabel = winnerId
    ? isOwnerView
      ? winnerNames.get(winnerId) ?? "Winning bidder"
      : bidderMask(winnerId)
    : null;

  const bids = await bidsCollection
    .find({
      auctionId: {
        $in: queryIds,
      },
    })
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray();

  const bidderIds = bids.map((bid) => asIdString(bid.bidderId));
  const bidderNames = isOwnerView ? await getUsersMapByIds(bidderIds) : new Map<string, string>();
  const rawMarketValueEstimate =
    product?.marketValueEstimate && typeof product.marketValueEstimate === "object"
      ? (product.marketValueEstimate as Record<string, unknown>)
      : null;

  const bidRows: AuctionBidItem[] = bids.map((bid) => {
    const bidderId = asIdString(bid.bidderId);
    return {
      id: asIdString(bid._id),
      amount: toNumber(bid.amount),
      createdAt: toDate(bid.createdAt),
      bidderId,
      bidderLabel: isOwnerView
        ? bidderNames.get(bidderId) ?? "Unknown bidder"
        : bidderMask(bidderId),
    };
  });

  const sellerRatingData = sellerRatingMap.get(sellerId);
  return {
    ...mapAuctionRow({
      auction: auction as Record<string, unknown>,
      product: (product as Record<string, unknown>) ?? undefined,
      sellerName:
        (seller && typeof seller.name === "string" ? seller.name : usersById.get(sellerId)) ??
        "Seller",
      isSellerVerified: seller?.isSellerVerified === true,
      sellerRating: sellerRatingData?.avg ?? null,
      sellerReviewCount: sellerRatingData?.count ?? 0,
    }),
    productId: asIdString(auction.productId),
    bids: bidRows,
    isOwnerView,
    winnerId,
    winnerLabel,
    isViewerWinner,
    marketValueEstimate: rawMarketValueEstimate
      ? {
          estimatedMarketValue: toNumber(rawMarketValueEstimate.estimatedMarketValue),
          suggestedStartPrice: toNumber(rawMarketValueEstimate.suggestedStartPrice),
          suggestedBidIncrement: toNumber(rawMarketValueEstimate.suggestedBidIncrement, 1),
          confidence:
            rawMarketValueEstimate.confidence === "low" ||
            rawMarketValueEstimate.confidence === "medium" ||
            rawMarketValueEstimate.confidence === "high"
              ? rawMarketValueEstimate.confidence
              : "medium",
          confidenceScore: toNumber(rawMarketValueEstimate.confidenceScore),
          reasonCodes: Array.isArray(rawMarketValueEstimate.reasonCodes)
            ? rawMarketValueEstimate.reasonCodes.map((item) => String(item))
            : [],
          deterministicFingerprint: String(rawMarketValueEstimate.deterministicFingerprint ?? ""),
          usesAiExtraction: rawMarketValueEstimate.usesAiExtraction === true,
          valuationSource:
            rawMarketValueEstimate.valuationSource === "gemini" ? "gemini" : "gemini",
          valuationDebug: String(rawMarketValueEstimate.valuationDebug ?? ""),
          generatedAt: String(rawMarketValueEstimate.generatedAt ?? ""),
        }
      : null,
  };
}
