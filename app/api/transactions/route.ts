import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

const createTransactionSchema = z.object({
  auctionId: z.string().min(1),
});

type AuctionDoc = {
  _id: ObjectId;
  sellerId: unknown;
  winnerId?: unknown;
  status?: string;
  endedAt?: Date | null;
  currentPrice?: number;
};

type TransactionDoc = {
  _id: ObjectId;
  auctionId: unknown;
  buyerId: unknown;
  amount: number;
  status: string;
  provider?: string;
  paidAt?: Date | null;
};

function asString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid auction id." }, { status: 400 });
    }

    const auctionObjectId = ObjectId.isValid(parsed.data.auctionId)
      ? new ObjectId(parsed.data.auctionId)
      : null;
    if (!auctionObjectId) {
      return NextResponse.json({ ok: false, message: "Invalid auction id." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const auction = (await db.collection(COLLECTIONS.auctions).findOne({
      _id: auctionObjectId,
    })) as AuctionDoc | null;

    if (!auction) {
      return NextResponse.json({ ok: false, message: "Auction not found." }, { status: 404 });
    }

    if (auction.status !== "ended" || !auction.endedAt) {
      return NextResponse.json(
        { ok: false, message: "Transaction can be created only after auction ends." },
        { status: 400 }
      );
    }

    const winnerId = auction.winnerId ? asString(auction.winnerId) : "";
    if (!winnerId || winnerId !== session.user.id) {
      return NextResponse.json(
        { ok: false, message: "Only winner can create payment transaction." },
        { status: 403 }
      );
    }

    const existing = (await db.collection(COLLECTIONS.transactions).findOne({
      auctionId: auctionObjectId,
    })) as TransactionDoc | null;

    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          transactionId: existing._id.toHexString(),
          amount: existing.amount,
          status: existing.status,
        },
        { status: 200 }
      );
    }

    const now = new Date();
    const amount = Number(auction.currentPrice || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, message: "Invalid auction amount." }, { status: 400 });
    }

    const insertResult = await db.collection(COLLECTIONS.transactions).insertOne({
      auctionId: auctionObjectId,
      buyerId: winnerId,
      sellerId: auction.sellerId,
      amount,
      currency: "NPR",
      status: "pending",
      provider: "esewa",
      providerRef: null,
      paidAt: null,
      esewaTransactionUuid: null,
      esewaRefId: null,
      khaltiPidx: null,
      gatewayPayloadHash: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        ok: true,
        transactionId: insertResult.insertedId.toHexString(),
        amount,
        status: "pending",
      },
      { status: 201 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to create transaction";
    if (details.includes("E11000")) {
      return NextResponse.json(
        { ok: false, message: "Transaction already exists for this auction." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "Unable to create transaction.", details },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const auctionId = searchParams.get("auctionId");
    if (!auctionId) {
      return NextResponse.json({ ok: false, message: "Missing auctionId." }, { status: 400 });
    }

    const auctionObjectId = ObjectId.isValid(auctionId) ? new ObjectId(auctionId) : null;
    if (!auctionObjectId) {
      return NextResponse.json({ ok: false, message: "Invalid auctionId." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const tx = (await db.collection(COLLECTIONS.transactions).findOne({
      auctionId: auctionObjectId,
      buyerId: { $in: [session.user.id, ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : session.user.id] },
    })) as TransactionDoc | null;

    if (!tx) {
      return NextResponse.json({ ok: true, transaction: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        transaction: {
          id: tx._id.toHexString(),
          status: tx.status,
          amount: tx.amount,
          provider: tx.provider ?? null,
          paidAt: tx.paidAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to load transaction";
    return NextResponse.json(
      { ok: false, message: "Unable to load transaction.", details },
      { status: 500 }
    );
  }
}
