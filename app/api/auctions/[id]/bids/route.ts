import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { COLLECTIONS } from "@/types/entities";

const bidSchema = z.object({
  amount: z.number().positive(),
});

type Params = {
  params: Promise<{ id: string }>;
};

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const auctionIdCandidates: (ObjectId | string)[] = ObjectId.isValid(id)
      ? [new ObjectId(id), id]
      : [id];
    const auctionIdQuery =
      auctionIdCandidates.length === 1
        ? { _id: auctionIdCandidates[0] }
        : {
            $or: auctionIdCandidates.map((value) => ({ _id: value })),
          };

    const payload = await request.json();
    const parsed = bidSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid bid amount." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    await finalizeExpiredAuctions(db);
    const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
    const bids = db.collection<Record<string, unknown>>(COLLECTIONS.bids);

    const auction = await auctions.findOne(auctionIdQuery as never);
    if (!auction) {
      return NextResponse.json(
        { ok: false, message: "Auction not found." },
        { status: 404 }
      );
    }

    const sellerId = String(auction.sellerId);
    const bidderId = session.user.id;
    if (sellerId === bidderId) {
      return NextResponse.json(
        { ok: false, message: "You cannot bid on your own auction." },
        { status: 400 }
      );
    }

    const now = new Date();
    const endsAt = new Date(auction.endsAt as string | number | Date);
    if (auction.status !== "live" || Number.isNaN(endsAt.valueOf()) || endsAt <= now) {
      return NextResponse.json(
        { ok: false, message: "Auction is not accepting bids." },
        { status: 400 }
      );
    }

    const currentPrice = asNumber(auction.currentPrice);
    const bidIncrement = Math.max(1, asNumber(auction.bidIncrement));
    const minimumAllowed = currentPrice + bidIncrement;
    const amount = Math.round(parsed.data.amount);

    if (amount < minimumAllowed) {
      return NextResponse.json(
        {
          ok: false,
          message: `Bid must be at least NPR ${minimumAllowed}.`,
          minimumAllowed,
        },
        { status: 400 }
      );
    }

    const auctionIdForBid =
      auction._id instanceof ObjectId || typeof auction._id === "string"
        ? auction._id
        : String(auction._id);

    const insertResult = await bids.insertOne({
      auctionId: auctionIdForBid,
      bidderId,
      amount,
      source: "manual",
      isWinning: true,
      createdAt: now,
    });

    await bids.updateMany(
      {
        auctionId: auctionIdForBid,
        _id: { $ne: insertResult.insertedId },
      },
      { $set: { isWinning: false } }
    );

    await auctions.updateOne(
      { _id: auction._id } as never,
      {
        $set: {
          currentPrice: amount,
          highestBidderId: bidderId,
          updatedAt: now,
        },
        $inc: { totalBids: 1 },
      } as never
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Bid placed.",
        bidId: insertResult.insertedId.toString(),
        currentPrice: amount,
      },
      { status: 201 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to place bid";
    return NextResponse.json(
      { ok: false, message: "Unable to place bid.", details },
      { status: 500 }
    );
  }
}
