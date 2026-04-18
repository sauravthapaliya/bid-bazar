import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { connectToDatabase } from "@/lib/mongodb";
import { findUserById } from "@/lib/user-auth";
import {
  asIdString,
  sendAuctionContactRequestEmails,
  toIsoDate,
} from "@/lib/auction-contact";
import { COLLECTIONS } from "@/types/entities";

const createAuctionContactSchema = z.object({
  auctionId: z.string().min(1),
  senderName: z.string().trim().min(2).max(120),
  senderPhone: z.string().trim().min(7).max(30),
  meetingLocation: z.string().trim().min(3).max(240),
  preferredContactTime: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
});

type AuctionDoc = {
  _id: ObjectId;
  sellerId: unknown;
  winnerId?: unknown;
  title?: string;
  status?: string;
};

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createAuctionContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid contact request details." },
        { status: 400 }
      );
    }

    const auctionObjectId = ObjectId.isValid(parsed.data.auctionId)
      ? new ObjectId(parsed.data.auctionId)
      : null;
    if (!auctionObjectId) {
      return NextResponse.json({ ok: false, message: "Invalid auction id." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);

    const auction = (await auctions.findOne({
      _id: auctionObjectId,
    })) as AuctionDoc | null;

    if (!auction) {
      return NextResponse.json({ ok: false, message: "Auction not found." }, { status: 404 });
    }

    const sellerId = asIdString(auction.sellerId);
    const winnerId = auction.winnerId ? asIdString(auction.winnerId) : "";
    if (auction.status !== "ended" || !winnerId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Contact details can be shared only after the auction ends with a winner.",
        },
        { status: 400 }
      );
    }

    if (session.user.id !== sellerId && session.user.id !== winnerId) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    const recipientId = session.user.id === sellerId ? winnerId : sellerId;
    const [sender, recipient] = await Promise.all([
      findUserById(db, session.user.id),
      findUserById(db, recipientId),
    ]);

    if (!sender?.email || !recipient?.email) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing sender or recipient email address for this contact request.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const auctionTitle = String(auction.title ?? "Auction item");
    const payload = {
      sellerId,
      winnerId,
      submittedById: session.user.id,
      recipientId,
      auctionTitle,
      senderName: parsed.data.senderName,
      senderEmail: sender.email,
      senderPhone: parsed.data.senderPhone,
      meetingLocation: parsed.data.meetingLocation,
      preferredContactTime: parsed.data.preferredContactTime?.trim() || null,
      note: parsed.data.note?.trim() || null,
      sentAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.auctionContactRequests).updateOne(
      {
        auctionId: auctionObjectId,
        submittedById: session.user.id,
      },
      {
        $set: payload,
        $setOnInsert: {
          auctionId: auctionObjectId,
          createdAt: now,
        },
      }
    , { upsert: true });

    await sendAuctionContactRequestEmails({
      recipientEmail: recipient.email,
      recipientName: recipient.name ?? "BIDBZAR user",
      senderEmail: sender.email,
      senderName: parsed.data.senderName,
      auctionTitle,
      senderPhone: parsed.data.senderPhone,
      meetingLocation: parsed.data.meetingLocation,
      preferredContactTime: parsed.data.preferredContactTime?.trim() || null,
      note: parsed.data.note?.trim() || null,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Your contact details were emailed successfully.",
        contactRequest: {
          auctionId: auctionObjectId.toHexString(),
          sentAt: now.toISOString(),
          recipientName: recipient.name ?? "BIDBZAR user",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to send contact request";
    return NextResponse.json(
      { ok: false, message: "Unable to send contact request.", details },
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
    const doc = await db.collection<Record<string, unknown>>(COLLECTIONS.auctionContactRequests).findOne({
      auctionId: auctionObjectId,
      submittedById: session.user.id,
    });

    return NextResponse.json(
      {
        ok: true,
        contactRequest: doc
          ? {
              auctionId: asIdString(doc.auctionId),
              sentAt: toIsoDate(doc.sentAt),
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to load contact request";
    return NextResponse.json(
      { ok: false, message: "Unable to load contact request.", details },
      { status: 500 }
    );
  }
}
