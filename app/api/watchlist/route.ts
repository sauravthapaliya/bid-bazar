import { NextResponse } from "next/server";
import { MongoServerError, ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserWatchlist } from "@/lib/watchlist-market";
import { COLLECTIONS } from "@/types/entities";

const createWatchlistSchema = z.object({
  auctionId: z.string().trim().min(1),
});

function idVariants(id: string): (ObjectId | string)[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    await finalizeExpiredAuctions();
    const watchlist = await getUserWatchlist(session.user.id, 60);

    return NextResponse.json({ ok: true, watchlist }, { status: 200 });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to load watchlist";
    return NextResponse.json(
      { ok: false, message: "Unable to load watchlist.", details },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const parsed = createWatchlistSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid watchlist payload." },
        { status: 400 },
      );
    }

    const { db } = await connectToDatabase();
    await finalizeExpiredAuctions(db);

    const auctionId = parsed.data.auctionId;
    const auctionCandidates = idVariants(auctionId);
    const auctionQuery =
      auctionCandidates.length === 1
        ? { _id: auctionCandidates[0] }
        : { $or: auctionCandidates.map((value) => ({ _id: value })) };
    const auction = await db
      .collection<Record<string, unknown>>(COLLECTIONS.auctions)
      .findOne(auctionQuery as never);

    if (!auction) {
      return NextResponse.json(
        { ok: false, message: "Auction not found." },
        { status: 404 },
      );
    }

    const sellerId = String(auction.sellerId ?? "");
    if (sellerId === session.user.id) {
      return NextResponse.json(
        { ok: false, message: "You cannot watch your own auction." },
        { status: 400 },
      );
    }

    const status = String(auction.status ?? "unknown");
    if (status === "cancelled") {
      return NextResponse.json(
        { ok: false, message: "Cancelled auctions cannot be added to watchlist." },
        { status: 400 },
      );
    }

    const watchlist = db.collection<Record<string, unknown>>(COLLECTIONS.watchlist);
    const now = new Date();

    try {
      const insert = await watchlist.insertOne({
        userId: session.user.id,
        auctionId: auction._id,
        createdAt: now,
      });

      return NextResponse.json(
        {
          ok: true,
          watched: true,
          watchlistId: insert.insertedId.toString(),
          message: "Added to watchlist.",
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return NextResponse.json(
          { ok: true, watched: true, message: "Already in watchlist." },
          { status: 200 },
        );
      }
      throw error;
    }
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to update watchlist";
    return NextResponse.json(
      { ok: false, message: "Unable to update watchlist.", details },
      { status: 500 },
    );
  }
}
