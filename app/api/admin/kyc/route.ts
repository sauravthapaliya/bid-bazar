import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";
import { getCurrentUserRecord, isAdmin } from "@/lib/user-auth";

type KycDoc = {
  _id: ObjectId;
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

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const user = await getCurrentUserRecord();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const kycSubmissions = db.collection<KycDoc>(COLLECTIONS.kycSubmissions);
    const users = db.collection<Record<string, unknown>>(COLLECTIONS.users);

    const [allUsers, submissions] = await Promise.all([
      users
        .find(
          {},
          {
            projection: {
              name: 1,
              email: 1,
              role: 1,
              isSellerVerified: 1,
              kycStatus: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .toArray(),
      kycSubmissions.find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const latestByUser = new Map<string, KycDoc>();
    for (const submission of submissions) {
      const userId = submission.userId ? String(submission.userId) : "";
      if (!userId || latestByUser.has(userId)) continue;
      latestByUser.set(userId, submission);
    }

    const items = allUsers.map((u) => {
      const userId = String(u._id);
      const submission = latestByUser.get(userId);
      return {
        userId,
        name: typeof u.name === "string" ? u.name : "",
        email: typeof u.email === "string" ? u.email : "",
        role: u.role === "admin" || u.role === "seller" ? u.role : "user",
        isSellerVerified: u.isSellerVerified === true,
        kycStatus:
          u.kycStatus === "pending" || u.kycStatus === "approved" || u.kycStatus === "rejected"
            ? u.kycStatus
            : "not_submitted",
        createdAt: asIso(u.createdAt),
        submission: submission
          ? {
              id: submission._id.toHexString(),
              name: typeof submission.name === "string" ? submission.name : "",
              email: typeof submission.email === "string" ? submission.email : "",
              phone: typeof submission.phone === "string" ? submission.phone : "",
              address: typeof submission.address === "string" ? submission.address : "",
              panNumber: typeof submission.panNumber === "string" ? submission.panNumber : "",
              citizenshipNumber:
                typeof submission.citizenshipNumber === "string"
                  ? submission.citizenshipNumber
                  : "",
              documentType:
                submission.documentType === "citizenship" ? "citizenship" : "pan",
              documentFileId:
                typeof submission.documentFileId === "string"
                  ? submission.documentFileId
                  : "",
              status:
                submission.status === "pending" ||
                submission.status === "approved" ||
                submission.status === "rejected"
                  ? submission.status
                  : "pending",
              reviewNote:
                typeof submission.reviewNote === "string" ? submission.reviewNote : null,
              reviewedById: submission.reviewedById ? String(submission.reviewedById) : null,
              reviewedAt: asIso(submission.reviewedAt),
              createdAt: asIso(submission.createdAt),
              updatedAt: asIso(submission.updatedAt),
            }
          : null,
      };
    });

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to load admin KYC data";
    return NextResponse.json(
      { ok: false, message: "Unable to load admin KYC data.", details },
      { status: 500 }
    );
  }
}
