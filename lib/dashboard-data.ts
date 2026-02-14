import "server-only";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

type SummaryData = {
  activeBids: number;
  wonAuctions: number;
  sellingLive: number;
  unreadNotifications: number;
};

export type DashboardBidItem = {
  auctionId: string;
  title: string;
  myBid: number;
  currentPrice: number;
  endsAt: Date | null;
  status: string;
  bidState: "winning" | "outbid" | "won" | "lost" | "cancelled";
  totalBids: number;
  lastBidAt: Date | null;
};

export type DashboardWatchlistItem = {
  watchlistId: string;
  auctionId: string;
  title: string;
  currentPrice: number;
  status: string;
  endsAt: Date | null;
  addedAt: Date | null;
};

export type DashboardData = {
  summary: SummaryData;
  myBids: DashboardBidItem[];
  watchlist: DashboardWatchlistItem[];
};

function getIdVariants(id: string): IdLike[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

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

function resolveAuctionStatus(status: unknown, endsAt: unknown) {
  const raw = String(status ?? "unknown");
  const ends = toDate(endsAt);
  if ((raw === "live" || raw === "scheduled") && ends && ends <= new Date()) {
    return "expired";
  }
  return raw;
}

function idsFromUnknown(values: unknown[]): { strings: string[]; objectIds: ObjectId[] } {
  const stringSet = new Set<string>();
  const objectIdSet = new Set<string>();

  for (const value of values) {
    if (value == null) continue;
    const idString = asIdString(value);
    stringSet.add(idString);
    if (ObjectId.isValid(idString)) {
      objectIdSet.add(new ObjectId(idString).toHexString());
    }
  }

  return {
    strings: [...stringSet],
    objectIds: [...objectIdSet].map((hex) => new ObjectId(hex)),
  };
}

function buildIdOrQuery(field: string, values: unknown[]) {
  const { strings, objectIds } = idsFromUnknown(values);
  const clauses: Record<string, unknown>[] = [];

  if (strings.length > 0) clauses.push({ [field]: { $in: strings } });
  if (objectIds.length > 0) clauses.push({ [field]: { $in: objectIds } });

  if (clauses.length === 0) return { [field]: "__never__" };
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
}

async function getDashboardSummary(userId: string): Promise<SummaryData> {
  const { db } = await connectToDatabase();
  const userIds = getIdVariants(userId);
  const now = new Date();

  const bids = db.collection(COLLECTIONS.bids);
  const auctions = db.collection(COLLECTIONS.auctions);
  const notifications = db.collection(COLLECTIONS.notifications);

  const distinctAuctionIds = await bids.distinct("auctionId", {
    bidderId: { $in: userIds },
  });

  const [activeBids, wonAuctions, sellingLive, unreadNotifications] = await Promise.all([
    distinctAuctionIds.length === 0
      ? Promise.resolve(0)
      : auctions.countDocuments({
          ...buildIdOrQuery("_id", distinctAuctionIds),
          status: "live",
          endsAt: { $gt: now },
        }),
    auctions.countDocuments({
      winnerId: { $in: userIds },
      status: "ended",
    }),
    auctions.countDocuments({
      sellerId: { $in: userIds },
      status: "live",
      endsAt: { $gt: now },
    }),
    notifications.countDocuments({
      userId: { $in: userIds },
      isRead: false,
    }),
  ]);

  return { activeBids, wonAuctions, sellingLive, unreadNotifications };
}

async function getMyBids(userId: string, limit = 6): Promise<DashboardBidItem[]> {
  const { db } = await connectToDatabase();
  const userIds = getIdVariants(userId);

  const bidDocs = await db
    .collection(COLLECTIONS.bids)
    .find({ bidderId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();

  const latestBidByAuction = new Map<string, (typeof bidDocs)[number]>();
  for (const bid of bidDocs) {
    const auctionKey = asIdString(bid.auctionId);
    if (!latestBidByAuction.has(auctionKey)) {
      latestBidByAuction.set(auctionKey, bid);
    }
  }

  const selectedBids = [...latestBidByAuction.values()].slice(0, limit);
  if (selectedBids.length === 0) return [];

  const auctionsQueryIds = selectedBids.map((bid) => bid.auctionId);
  const auctionDocs = await db
    .collection(COLLECTIONS.auctions)
    .find(buildIdOrQuery("_id", auctionsQueryIds))
    .toArray();

  const auctionById = new Map<string, (typeof auctionDocs)[number]>();
  for (const auction of auctionDocs) {
    auctionById.set(asIdString(auction._id), auction);
  }

  const productIds = auctionDocs.map((auction) => auction.productId);
  const productDocs =
    productIds.length === 0
      ? []
      : await db
          .collection(COLLECTIONS.products)
          .find(buildIdOrQuery("_id", productIds))
          .toArray();

  const productById = new Map<string, (typeof productDocs)[number]>();
  for (const product of productDocs) {
    productById.set(asIdString(product._id), product);
  }

  return selectedBids
    .map((bid) => {
      const auctionId = asIdString(bid.auctionId);
      const auction = auctionById.get(auctionId);
      if (!auction) return null;

      const product = productById.get(asIdString(auction.productId));
      const status = resolveAuctionStatus(auction.status, auction.endsAt);
      const highestBidderId = auction.highestBidderId ? asIdString(auction.highestBidderId) : null;
      const winnerId = auction.winnerId ? asIdString(auction.winnerId) : highestBidderId;
      const isLeading = highestBidderId != null && userIds.some((id) => asIdString(id) === highestBidderId);
      const isWinner = winnerId != null && userIds.some((id) => asIdString(id) === winnerId);
      const bidState =
        status === "ended"
          ? isWinner
            ? "won"
            : "lost"
          : status === "cancelled"
            ? "cancelled"
            : isLeading
              ? "winning"
              : "outbid";

      return {
        auctionId,
        title: auction.title || product?.title || "Untitled Auction",
        myBid: Number(bid.amount ?? 0),
        currentPrice: Number(auction.currentPrice ?? 0),
        endsAt: toDate(auction.endsAt),
        status,
        bidState,
        totalBids: Number(auction.totalBids ?? 0),
        lastBidAt: toDate(bid.createdAt),
      } satisfies DashboardBidItem;
    })
    .filter((item): item is DashboardBidItem => item !== null);
}

async function getWatchlist(userId: string, limit = 6): Promise<DashboardWatchlistItem[]> {
  const { db } = await connectToDatabase();
  const userIds = getIdVariants(userId);

  const watchlistDocs = await db
    .collection(COLLECTIONS.watchlist)
    .find({ userId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  if (watchlistDocs.length === 0) return [];

  const auctionIds = watchlistDocs.map((item) => item.auctionId);
  const auctionDocs = await db
    .collection(COLLECTIONS.auctions)
    .find(buildIdOrQuery("_id", auctionIds))
    .toArray();

  const auctionById = new Map<string, (typeof auctionDocs)[number]>();
  for (const auction of auctionDocs) {
    auctionById.set(asIdString(auction._id), auction);
  }

  const productIds = auctionDocs.map((auction) => auction.productId);
  const productDocs =
    productIds.length === 0
      ? []
      : await db
          .collection(COLLECTIONS.products)
          .find(buildIdOrQuery("_id", productIds))
          .toArray();

  const productById = new Map<string, (typeof productDocs)[number]>();
  for (const product of productDocs) {
    productById.set(asIdString(product._id), product);
  }

  return watchlistDocs
    .map((item) => {
      const auctionId = asIdString(item.auctionId);
      const auction = auctionById.get(auctionId);
      if (!auction) return null;

      const product = productById.get(asIdString(auction.productId));
      return {
        watchlistId: asIdString(item._id),
        auctionId,
        title: auction.title || product?.title || "Untitled Auction",
        currentPrice: Number(auction.currentPrice ?? 0),
        status: resolveAuctionStatus(auction.status, auction.endsAt),
        endsAt: toDate(auction.endsAt),
        addedAt: toDate(item.createdAt),
      } satisfies DashboardWatchlistItem;
    })
    .filter((row): row is DashboardWatchlistItem => row !== null);
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [summary, myBids, watchlist] = await Promise.all([
    getDashboardSummary(userId),
    getMyBids(userId, 6),
    getWatchlist(userId, 6),
  ]);

  return { summary, myBids, watchlist };
}
