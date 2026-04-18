import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { COLLECTIONS } from "@/types/entities";

const reviewSchema = z.object({
  auctionId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

function idVariants(id: string): (string | ObjectId)[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = reviewSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid input.", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { auctionId, rating, comment } = parsed.data;
    const reviewerId = session.user.id;

    const { db } = await connectToDatabase();
    const auctionsCol = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
    const reviewsCol = db.collection<Record<string, unknown>>(COLLECTIONS.reviews);

    const auction = await auctionsCol.findOne({
      $or: idVariants(auctionId).map((v) => ({ _id: v })),
    } as never);

    if (!auction) {
      return NextResponse.json({ ok: false, message: "Auction not found." }, { status: 404 });
    }

    if (auction.status !== "ended") {
      return NextResponse.json(
        { ok: false, message: "Reviews can only be submitted for ended auctions." },
        { status: 400 },
      );
    }

    const winnerId = auction.winnerId ? String(auction.winnerId) : null;
    if (!winnerId || winnerId !== reviewerId) {
      return NextResponse.json(
        { ok: false, message: "Only the auction winner can submit a review." },
        { status: 403 },
      );
    }

    const existing = await reviewsCol.findOne({
      auctionId: { $in: idVariants(auctionId) },
    } as never);

    if (existing) {
      return NextResponse.json(
        { ok: false, message: "You have already reviewed this auction." },
        { status: 409 },
      );
    }

    const now = new Date();
    const result = await reviewsCol.insertOne({
      auctionId: auction._id,
      sellerId: auction.sellerId,
      reviewerId,
      rating,
      comment: comment ?? null,
      createdAt: now,
    });

    return NextResponse.json(
      { ok: true, message: "Review submitted.", reviewId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message: "Unable to submit review.", details },
      { status: 500 },
    );
  }
}
