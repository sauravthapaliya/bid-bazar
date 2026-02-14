import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
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

    const sellerIds = idVariants(session.user.id);
    const { db } = await connectToDatabase();
    const auctionsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
    const productsCollection = db.collection<Record<string, unknown>>(COLLECTIONS.products);

    const auctions = await auctionsCollection
      .find({ sellerId: { $in: sellerIds } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const productIds = auctions.map((row) => row.productId).filter(Boolean);
    const products =
      productIds.length === 0
        ? []
        : await productsCollection
            .find({
              _id: {
                $in: productIds.map((id) =>
                  ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id
                ),
              },
            } as never)
            .toArray();

    const productById = new Map<string, Record<string, unknown>>();
    for (const product of products) {
      productById.set(asIdString(product._id), product as Record<string, unknown>);
    }

    const now = new Date();
    const items = auctions.map((auction) => {
      const product = productById.get(asIdString(auction.productId));
      const imageId = getPrimaryImageFileId(product?.images);
      const endsAtIso = toDate(auction.endsAt);
      const endsAtDate = endsAtIso ? new Date(endsAtIso) : null;
      const rawStatus = String(auction.status ?? "unknown");
      const status =
        (rawStatus === "live" || rawStatus === "scheduled") &&
        endsAtDate &&
        endsAtDate <= now
          ? "expired"
          : rawStatus;

      return {
        auctionId: asIdString(auction._id),
        productId: asIdString(auction.productId),
        title: String(auction.title ?? product?.title ?? "Untitled Auction"),
        description: String(product?.description ?? ""),
        category: String(product?.category ?? "general"),
        condition: String(product?.condition ?? "good"),
        conditionAgeDays:
          typeof product?.conditionAgeDays === "number" ? product.conditionAgeDays : null,
        status,
        startPrice: toNumber(auction.startPrice),
        currentPrice: toNumber(auction.currentPrice),
        bidIncrement: toNumber(auction.bidIncrement, 1),
        totalBids: toNumber(auction.totalBids),
        createdAt: toDate(auction.createdAt),
        endsAt: endsAtIso,
        imageUrl: imageId ? `/api/uploads/${imageId}` : null,
      };
    });

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to load your auctions";
    return NextResponse.json(
      { ok: false, message: "Unable to load your auctions.", details },
      { status: 500 }
    );
  }
}
