import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getAuctionDetail } from "@/lib/auction-market";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type IdLike = string | ObjectId;

const updateAuctionSchema = z.object({
  title: z.string().trim().min(4).max(120).optional(),
  description: z.string().trim().min(20).max(5000).optional(),
  category: z.string().trim().min(2).max(50).optional(),
  condition: z.enum(["new", "like_new", "excellent", "good", "fair", "poor"]).optional(),
  conditionAgeDays: z.number().int().min(0).max(36500).nullable().optional(),
  bidIncrement: z.number().positive().optional(),
  startPrice: z.number().positive().optional(),
  durationHours: z.number().int().min(1).max(8640).optional(),
  fileId: z.string().min(8).optional(),
});

function idVariants(id: string): IdLike[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

function asIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

async function findOwnedAuction(args: { auctionId: string; userId: string }) {
  const { auctionId, userId } = args;
  const { db } = await connectToDatabase();
  const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
  const auctionIdCandidates = idVariants(auctionId);
  const sellerIdCandidates = idVariants(userId);

  const auction = await auctions.findOne({
    _id: { $in: auctionIdCandidates },
    sellerId: { $in: sellerIdCandidates },
  } as never);

  return { db, auctions, auction };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await finalizeExpiredAuctions();
    const session = await auth();
    const auction = await getAuctionDetail(id, session?.user?.id ?? null);
    if (!auction) {
      return NextResponse.json(
        { ok: false, message: "Auction not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, auction }, { status: 200 });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to load auction";
    return NextResponse.json(
      { ok: false, message: "Unable to load auction.", details },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateAuctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid update payload." }, { status: 400 });
    }

    const { db, auctions, auction } = await findOwnedAuction({
      auctionId: id,
      userId: session.user.id,
    });

    if (!auction) {
      return NextResponse.json({ ok: false, message: "Auction not found." }, { status: 404 });
    }

    const now = new Date();
    const products = db.collection<Record<string, unknown>>(COLLECTIONS.products);
    const productId = auction.productId;
    const product = await products.findOne({
      _id: ObjectId.isValid(String(productId)) ? new ObjectId(String(productId)) : productId,
    } as never);

    if (!product) {
      return NextResponse.json({ ok: false, message: "Product not found." }, { status: 404 });
    }

    const auctionSet: Record<string, unknown> = { updatedAt: now };
    const productSet: Record<string, unknown> = { updatedAt: now };

    const payload = parsed.data;

    if (payload.title) {
      auctionSet.title = payload.title;
      productSet.title = payload.title;
    }
    if (payload.description) productSet.description = payload.description;
    if (payload.category) productSet.category = payload.category;
    if (payload.condition) productSet.condition = payload.condition;
    if (payload.conditionAgeDays !== undefined) {
      productSet.conditionAgeDays = payload.conditionAgeDays;
    }
    if (payload.fileId) {
      productSet.images = [
        {
          fileId: payload.fileId,
          alt: payload.title ?? String(product.title ?? auction.title ?? "Auction image"),
          isPrimary: true,
        },
      ];
    }
    if (payload.bidIncrement !== undefined) auctionSet.bidIncrement = payload.bidIncrement;

    const totalBids =
      typeof auction.totalBids === "number" ? auction.totalBids : Number(auction.totalBids ?? 0);
    if (payload.startPrice !== undefined && totalBids === 0) {
      auctionSet.startPrice = payload.startPrice;
      auctionSet.currentPrice = payload.startPrice;
      auctionSet.highestBidderId = null;
    }

    if (payload.durationHours !== undefined) {
      const rawStartsAt = auction.startsAt;
      const startsAt =
        rawStartsAt instanceof Date ? rawStartsAt : new Date(String(rawStartsAt ?? now.toISOString()));
      const baseTime = startsAt > now ? startsAt : now;
      auctionSet.endsAt = new Date(baseTime.getTime() + payload.durationHours * 60 * 60 * 1000);
    }

    await auctions.updateOne({ _id: auction._id } as never, { $set: auctionSet } as never);
    await products.updateOne({ _id: product._id } as never, { $set: productSet } as never);

    return NextResponse.json({ ok: true, message: "Auction updated." }, { status: 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to update auction";
    return NextResponse.json(
      { ok: false, message: "Unable to update auction.", details },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const { db, auctions, auction } = await findOwnedAuction({
      auctionId: id,
      userId: session.user.id,
    });

    if (!auction) {
      return NextResponse.json({ ok: false, message: "Auction not found." }, { status: 404 });
    }

    const now = new Date();
    const products = db.collection<Record<string, unknown>>(COLLECTIONS.products);

    await auctions.updateOne(
      { _id: auction._id } as never,
      {
        $set: {
          status: "cancelled",
          endedAt: now,
          updatedAt: now,
        },
      } as never
    );

    await products.updateOne(
      {
        _id: ObjectId.isValid(asIdString(auction.productId))
          ? new ObjectId(asIdString(auction.productId))
          : auction.productId,
      } as never,
      { $set: { status: "removed", updatedAt: now } } as never
    );

    return NextResponse.json({ ok: true, message: "Auction cancelled." }, { status: 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to cancel auction";
    return NextResponse.json(
      { ok: false, message: "Unable to cancel auction.", details },
      { status: 500 }
    );
  }
}
