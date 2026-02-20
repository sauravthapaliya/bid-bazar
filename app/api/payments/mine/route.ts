import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

type PaymentListItem = {
  auctionId: string;
  title: string;
  imageUrl: string | null;
  amount: number;
  currency: string;
  auctionEndedAt: string | null;
  transactionId: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "authorized" | "refunded" | "unknown";
  provider: "esewa" | "khalti" | null;
  paidAt: string | null;
};

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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const userIds = idVariants(session.user.id);
    const { db } = await connectToDatabase();
    await finalizeExpiredAuctions(db);

    const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
    const products = db.collection<Record<string, unknown>>(COLLECTIONS.products);
    const transactions = db.collection<Record<string, unknown>>(COLLECTIONS.transactions);

    const wonAuctions = await auctions
      .find({
        status: "ended",
        winnerId: { $in: userIds },
      })
      .sort({ endedAt: -1, updatedAt: -1 })
      .limit(300)
      .toArray();

    if (wonAuctions.length === 0) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    const auctionIdStrings = wonAuctions.map((a) => asIdString(a._id));
    const auctionIdObjectIds = auctionIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const productIds = wonAuctions.map((a) => a.productId).filter(Boolean);
    const productIdStrings = [...new Set(productIds.map((id) => asIdString(id)))];
    const productIdObjectIds = productIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const [productRows, txRows] = await Promise.all([
      products
        .find({
          $or: [{ _id: { $in: productIdStrings } }, { _id: { $in: productIdObjectIds } }],
        } as never)
        .toArray(),
      transactions
        .find({
          buyerId: { $in: userIds },
          $or: [{ auctionId: { $in: auctionIdStrings } }, { auctionId: { $in: auctionIdObjectIds } }],
        } as never)
        .toArray(),
    ]);

    const productById = new Map<string, (typeof productRows)[number]>();
    for (const product of productRows) {
      productById.set(asIdString(product._id), product);
    }

    const txByAuctionId = new Map<string, (typeof txRows)[number]>();
    for (const tx of txRows) {
      txByAuctionId.set(asIdString(tx.auctionId), tx);
    }

    const items: PaymentListItem[] = wonAuctions.map((auction) => {
      const product = productById.get(asIdString(auction.productId));
      const tx = txByAuctionId.get(asIdString(auction._id));
      const imageId = getPrimaryImageFileId(product?.images);

      const rawStatus = String(tx?.status ?? "unknown");
      const paymentStatus =
        rawStatus === "pending" ||
        rawStatus === "paid" ||
        rawStatus === "failed" ||
        rawStatus === "authorized" ||
        rawStatus === "refunded"
          ? rawStatus
          : "unknown";
      const providerRaw = tx?.provider ? String(tx.provider) : null;
      const provider = providerRaw === "esewa" || providerRaw === "khalti" ? providerRaw : null;

      return {
        auctionId: asIdString(auction._id),
        title: String(auction.title ?? product?.title ?? "Won Auction"),
        imageUrl: imageId ? `/api/uploads/${imageId}` : null,
        amount: toNumber(tx?.amount, toNumber(auction.currentPrice)),
        currency: String(tx?.currency ?? "NPR"),
        auctionEndedAt: toDate(auction.endedAt),
        transactionId: tx?._id ? asIdString(tx._id) : null,
        paymentStatus,
        provider,
        paidAt: toDate(tx?.paidAt),
      };
    });

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to load your payments";
    return NextResponse.json(
      { ok: false, message: "Unable to load your payments.", details },
      { status: 500 }
    );
  }
}
