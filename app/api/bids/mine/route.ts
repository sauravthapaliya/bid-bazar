import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getAuctionContactStatuses } from "@/lib/auction-contact";
import { connectToDatabase } from "@/lib/mongodb";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

function idVariants(id: string): IdLike[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

function asIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

function toDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
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

async function getUsersMapByIds(db: Awaited<ReturnType<typeof connectToDatabase>>["db"], ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map<string, string>();

  const objectIds = uniqueIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const clauses: Record<string, unknown>[] = [];
  if (uniqueIds.length > 0) clauses.push({ _id: { $in: uniqueIds } });
  if (objectIds.length > 0) clauses.push({ _id: { $in: objectIds } });

  const users = await db
    .collection<Record<string, unknown>>(COLLECTIONS.users)
    .find(clauses.length === 1 ? clauses[0] : { $or: clauses }, { projection: { name: 1 } })
    .toArray();

  const map = new Map<string, string>();
  for (const user of users) {
    map.set(asIdString(user._id), String(user.name ?? "User"));
  }
  return map;
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

function resolveStatus(status: unknown, endsAt: unknown) {
  const raw = String(status ?? "unknown");
  const ends = toDate(endsAt);
  const endsDate = ends ? new Date(ends) : null;
  if ((raw === "live" || raw === "scheduled") && endsDate && endsDate <= new Date()) {
    return "expired";
  }
  return raw;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const userIds = idVariants(session.user.id);
    const { db } = await connectToDatabase();
    await finalizeExpiredAuctions(db);

    const bids = db.collection<Record<string, unknown>>(COLLECTIONS.bids);
    const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
    const products = db.collection<Record<string, unknown>>(COLLECTIONS.products);
    const transactions = db.collection<Record<string, unknown>>(COLLECTIONS.transactions);

    const bidDocs = await bids
      .find({ bidderId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .limit(600)
      .toArray();

    if (bidDocs.length === 0) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    const latestBidByAuction = new Map<string, (typeof bidDocs)[number]>();
    for (const bid of bidDocs) {
      const auctionKey = asIdString(bid.auctionId);
      if (!latestBidByAuction.has(auctionKey)) {
        latestBidByAuction.set(auctionKey, bid);
      }
    }

    const selectedBids = [...latestBidByAuction.values()].slice(0, 250);
    const auctionIds = selectedBids.map((bid) => bid.auctionId);
    const auctionIdStrings = [...new Set(auctionIds.map((id) => asIdString(id)))];
    const auctionIdObjectIds = auctionIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const auctionRows = await auctions
      .find({
        $or: [
          { _id: { $in: auctionIdStrings } },
          { _id: { $in: auctionIdObjectIds } },
        ],
      } as never)
      .toArray();

    const auctionById = new Map<string, (typeof auctionRows)[number]>();
    for (const auction of auctionRows) {
      auctionById.set(asIdString(auction._id), auction);
    }

    const productIds = auctionRows.map((auction) => auction.productId).filter(Boolean);
    const productIdStrings = [...new Set(productIds.map((id) => asIdString(id)))];
    const productIdObjectIds = productIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const productRows = productIds.length
      ? await products
          .find({
            $or: [
              { _id: { $in: productIdStrings } },
              { _id: { $in: productIdObjectIds } },
            ],
          } as never)
          .toArray()
      : [];

    const productById = new Map<string, (typeof productRows)[number]>();
    for (const product of productRows) {
      productById.set(asIdString(product._id), product);
    }

    const txRows = await transactions
      .find({
        buyerId: { $in: userIds },
        $or: [
          { auctionId: { $in: auctionIdStrings } },
          { auctionId: { $in: auctionIdObjectIds } },
        ],
      } as never)
      .toArray();

    const sellerNamesById = await getUsersMapByIds(
      db,
      auctionRows.map((auction) => asIdString(auction.sellerId))
    );
    const contactRequestsByAuctionId = await getAuctionContactStatuses(db, {
      auctionIds: auctionById.size > 0 ? [...auctionById.keys()] : [],
      submittedById: session.user.id,
    });

    const txByAuctionId = new Map<string, (typeof txRows)[number]>();
    for (const tx of txRows) {
      txByAuctionId.set(asIdString(tx.auctionId), tx);
    }

    const items = selectedBids
      .map((bid) => {
        const auctionKey = asIdString(bid.auctionId);
        const auction = auctionById.get(auctionKey);
        if (!auction) return null;

        const product = productById.get(asIdString(auction.productId));
        const status = resolveStatus(auction.status, auction.endsAt);
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
        const imageId = getPrimaryImageFileId(product?.images);
        const tx = txByAuctionId.get(auctionKey);
        const rawPaymentStatus = String(tx?.status ?? "unknown");
        const paymentStatus =
          rawPaymentStatus === "pending" ||
          rawPaymentStatus === "paid" ||
          rawPaymentStatus === "failed" ||
          rawPaymentStatus === "authorized" ||
          rawPaymentStatus === "refunded"
            ? rawPaymentStatus
            : "unknown";
        const providerRaw = tx?.provider ? String(tx.provider) : null;
        const paymentProvider =
          providerRaw === "esewa" || providerRaw === "khalti" ? providerRaw : null;

        return {
          auctionId: auctionKey,
          title: String(auction.title ?? product?.title ?? "Untitled Auction"),
          sellerName: sellerNamesById.get(asIdString(auction.sellerId)) ?? "Seller",
          category: String(product?.category ?? "General"),
          status,
          bidState,
          myBid: toNumber(bid.amount),
          currentPrice: toNumber(auction.currentPrice),
          totalBids: toNumber(auction.totalBids),
          bidPlacedAt: toDate(bid.createdAt),
          endsAt: toDate(auction.endsAt),
          imageUrl: imageId ? `/api/uploads/${imageId}` : null,
          transactionId: tx?._id ? asIdString(tx._id) : null,
          paymentStatus,
          paymentProvider,
          paidAt: toDate(tx?.paidAt),
          contactRequestSentAt: contactRequestsByAuctionId.get(auctionKey)?.sentAt ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to load your bids";
    return NextResponse.json(
      { ok: false, message: "Unable to load your bids.", details },
      { status: 500 }
    );
  }
}
