import "server-only";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

export type WatchlistListItem = {
  watchlistId: string;
  auctionId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  currentPrice: number;
  startPrice: number;
  bidIncrement: number;
  totalBids: number;
  endsAt: Date | null;
  addedAt: Date | null;
  imageUrl: string | null;
  sellerName: string;
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

async function getUsersMapByIds(ids: unknown[]) {
  const idRows = ids.map((row) => asIdString(row));
  const { db } = await connectToDatabase();
  const users = await db
    .collection<Record<string, unknown>>(COLLECTIONS.users)
    .find(buildIdOrQuery("_id", idRows), { projection: { name: 1 } })
    .toArray();

  const map = new Map<string, string>();
  for (const user of users) {
    map.set(asIdString(user._id), String(user.name ?? "Seller"));
  }
  return map;
}

export async function getUserWatchlist(userId: string, limit = 40): Promise<WatchlistListItem[]> {
  const { db } = await connectToDatabase();
  const userIds = idVariants(userId);

  const watchlistDocs = await db
    .collection<Record<string, unknown>>(COLLECTIONS.watchlist)
    .find({ userId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  if (watchlistDocs.length === 0) return [];

  const auctionIds = watchlistDocs.map((item) => item.auctionId);
  const auctionDocs = await db
    .collection<Record<string, unknown>>(COLLECTIONS.auctions)
    .find(buildIdOrQuery("_id", auctionIds))
    .toArray();

  const auctionById = new Map<string, Record<string, unknown>>();
  for (const auction of auctionDocs) {
    auctionById.set(asIdString(auction._id), auction);
  }

  const productIds = auctionDocs.map((auction) => auction.productId).filter(Boolean);
  const productDocs =
    productIds.length === 0
      ? []
      : await db
          .collection<Record<string, unknown>>(COLLECTIONS.products)
          .find(buildIdOrQuery("_id", productIds))
          .toArray();

  const productById = new Map<string, Record<string, unknown>>();
  for (const product of productDocs) {
    productById.set(asIdString(product._id), product);
  }

  const usersById = await getUsersMapByIds(auctionDocs.map((row) => row.sellerId));

  return watchlistDocs
    .map((item) => {
      const auctionId = asIdString(item.auctionId);
      const auction = auctionById.get(auctionId);
      if (!auction) return null;
      const product = productById.get(asIdString(auction.productId));
      const imageId = getPrimaryImageFileId(product?.images);
      const sellerId = asIdString(auction.sellerId);

      return {
        watchlistId: asIdString(item._id),
        auctionId,
        title: String(auction.title ?? product?.title ?? "Untitled Auction"),
        description: String(product?.description ?? ""),
        category: String(product?.category ?? "General"),
        status: resolveAuctionStatus(auction.status, auction.endsAt),
        currentPrice: toNumber(auction.currentPrice),
        startPrice: toNumber(auction.startPrice),
        bidIncrement: toNumber(auction.bidIncrement, 1),
        totalBids: toNumber(auction.totalBids),
        endsAt: toDate(auction.endsAt),
        addedAt: toDate(item.createdAt),
        imageUrl: imageId ? `/api/uploads/${imageId}` : null,
        sellerName: usersById.get(sellerId) ?? "Seller",
      } satisfies WatchlistListItem;
    })
    .filter((row): row is WatchlistListItem => row !== null);
}
