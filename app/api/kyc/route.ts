import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";
import { idFilter, idVariants } from "@/lib/user-auth";

const kycSubmitSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(5).max(220),
  panNumber: z.string().trim().min(6).max(40),
  citizenshipNumber: z.string().trim().min(6).max(40),
  documentType: z.enum(["pan", "citizenship"]),
  documentFileId: z.string().trim().min(8),
});

type KycDoc = {
  _id: { toString(): string };
  userId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  panNumber?: unknown;
  citizenshipNumber?: unknown;
  documentType?: unknown;
  documentFileId?: unknown;
  status?: unknown;
  reviewNote?: unknown;
  reviewedById?: unknown;
  reviewedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function asIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
  }
  return null;
}

function mapKyc(doc: KycDoc | null) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.userId ? String(doc.userId) : null,
    name: typeof doc.name === "string" ? doc.name : "",
    email: typeof doc.email === "string" ? doc.email : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    address: typeof doc.address === "string" ? doc.address : "",
    panNumber: typeof doc.panNumber === "string" ? doc.panNumber : "",
    citizenshipNumber:
      typeof doc.citizenshipNumber === "string" ? doc.citizenshipNumber : "",
    documentType: doc.documentType === "citizenship" ? "citizenship" : "pan",
    documentFileId:
      typeof doc.documentFileId === "string" ? doc.documentFileId : "",
    status:
      doc.status === "pending" ||
      doc.status === "approved" ||
      doc.status === "rejected"
        ? doc.status
        : "pending",
    reviewNote: typeof doc.reviewNote === "string" ? doc.reviewNote : null,
    reviewedById: doc.reviewedById ? String(doc.reviewedById) : null,
    reviewedAt: asIso(doc.reviewedAt),
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
  };
}

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const users = db.collection<Record<string, unknown>>(COLLECTIONS.users);
    const submissions = db.collection<KycDoc>(COLLECTIONS.kycSubmissions);
    const user = await users.findOne(
      idFilter(session.user.id),
      {
        projection: {
          name: 1,
          email: 1,
          role: 1,
          isSellerVerified: 1,
          kycStatus: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
    }

    const latest = await submissions
      .find({ userId: { $in: idVariants(session.user.id) } })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    return NextResponse.json(
      {
        ok: true,
        profile: {
          name: typeof user.name === "string" ? user.name : "",
          email: typeof user.email === "string" ? user.email : "",
          role: user.role === "admin" || user.role === "seller" ? user.role : "user",
          isSellerVerified: user.isSellerVerified === true,
          kycStatus:
            user.kycStatus === "pending" ||
            user.kycStatus === "approved" ||
            user.kycStatus === "rejected"
              ? user.kycStatus
              : "not_submitted",
        },
        submission: mapKyc(latest),
      },
      { status: 200 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to load KYC";
    return NextResponse.json(
      { ok: false, message: "Unable to load KYC.", details },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const parsed = kycSubmitSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid KYC payload." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const users = db.collection<Record<string, unknown>>(COLLECTIONS.users);
    const submissions = db.collection<Record<string, unknown>>(COLLECTIONS.kycSubmissions);
    const now = new Date();
    const userIdQuery = idFilter(session.user.id);

    const user = await users.findOne(userIdQuery);
    if (!user) {
      return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
    }

    if (user.kycStatus === "pending") {
      return NextResponse.json(
        {
          ok: false,
          message: "Your KYC is already pending review. Please wait for admin decision.",
        },
        { status: 409 }
      );
    }
    if (user.kycStatus === "approved") {
      return NextResponse.json(
        { ok: false, message: "KYC is already approved for this account." },
        { status: 409 }
      );
    }

    await submissions.insertOne({
      userId: session.user.id,
      email: session.user.email.toLowerCase(),
      ...parsed.data,
      status: "pending",
      reviewNote: null,
      reviewedById: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await users.updateOne(
      userIdQuery,
      {
        $set: {
          kycStatus: "pending",
          isSellerVerified: false,
          updatedAt: now,
          phone: parsed.data.phone,
        },
      }
    );

    return NextResponse.json(
      { ok: true, message: "KYC submitted successfully. Awaiting admin review." },
      { status: 201 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to submit KYC";
    return NextResponse.json(
      { ok: false, message: "Unable to submit KYC.", details },
      { status: 500 }
    );
  }
}
