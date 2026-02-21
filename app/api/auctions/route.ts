import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { getLiveAuctions } from "@/lib/auction-market";
import { canSell, getCurrentUserRecord } from "@/lib/user-auth";
import { COLLECTIONS } from "@/types/entities";

const createAuctionSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(50),
  condition: z.enum(["new", "like_new", "excellent", "good", "fair", "poor"]),
  conditionAgeDays: z.number().int().min(0).max(36500).optional(),
  startPrice: z.number().positive(),
  bidIncrement: z.number().positive(),
  durationHours: z.number().int().min(1).max(8640),
  fileId: z.string().min(8),
});

function makeSlug(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${base || "auction-item"}-${Date.now().toString(36)}`;
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }
    const viewer = await getCurrentUserRecord();
    if (!viewer) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }
    if (!canSell(viewer)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Complete and approve KYC before creating auctions.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createAuctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid auction input." },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      category,
      condition,
      conditionAgeDays,
      startPrice,
      bidIncrement,
      durationHours,
      fileId,
    } = parsed.data;

    const now = new Date();
    const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const sellerId = viewer.id;

    const { db } = await connectToDatabase();
    const productResult = await db.collection(COLLECTIONS.products).insertOne({
      sellerId,
      title,
      slug: makeSlug(title),
      description,
      category,
      condition,
      conditionAgeDays: typeof conditionAgeDays === "number" ? conditionAgeDays : null,
      images: [{ fileId, alt: title, isPrimary: true }],
      status: "listed",
      tags: [],
      createdAt: now,
      updatedAt: now,
    });

    const auctionResult = await db.collection(COLLECTIONS.auctions).insertOne({
      productId: productResult.insertedId,
      sellerId,
      title,
      status: "live",
      startPrice,
      reservePrice: null,
      bidIncrement,
      currentPrice: startPrice,
      highestBidderId: null,
      startsAt: now,
      endsAt,
      totalBids: 0,
      winnerId: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Auction created.",
        auctionId: auctionResult.insertedId.toString(),
        productId: productResult.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Failed to create auction";

    if (details.includes("E11000")) {
      return NextResponse.json(
        { ok: false, message: "Title conflict. Try again." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Unable to create auction.", details },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await finalizeExpiredAuctions();
    const auctions = await getLiveAuctions(40);
    return NextResponse.json({ ok: true, auctions }, { status: 200 });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to list auctions";
    return NextResponse.json(
      { ok: false, message: "Unable to list auctions.", details },
      { status: 500 }
    );
  }
}
