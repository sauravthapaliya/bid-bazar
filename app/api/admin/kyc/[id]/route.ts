import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";
import { getCurrentUserRecord, idFilter, isAdmin } from "@/lib/user-auth";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const viewer = await getCurrentUserRecord();
    if (!viewer) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    if (!isAdmin(viewer)) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Invalid submission id." }, { status: 400 });
    }

    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid review payload." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const submissions = db.collection<Record<string, unknown>>(COLLECTIONS.kycSubmissions);
    const users = db.collection<Record<string, unknown>>(COLLECTIONS.users);

    const submission = await submissions.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return NextResponse.json({ ok: false, message: "KYC submission not found." }, { status: 404 });
    }

    const userId = String(submission.userId ?? "");
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Submission is missing user information." },
        { status: 409 }
      );
    }

    const now = new Date();
    const nextStatus = parsed.data.action === "approve" ? "approved" : "rejected";
    const reviewNote =
      typeof parsed.data.reviewNote === "string" && parsed.data.reviewNote.length > 0
        ? parsed.data.reviewNote
        : null;

    await submissions.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: nextStatus,
          reviewNote,
          reviewedById: viewer.id,
          reviewedAt: now,
          updatedAt: now,
        },
      }
    );

    await users.updateOne(
      idFilter(userId),
      {
        $set: {
          role: nextStatus === "approved" ? "seller" : "user",
          isSellerVerified: nextStatus === "approved",
          kycStatus: nextStatus,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json(
      {
        ok: true,
        message:
          nextStatus === "approved"
            ? "KYC approved and seller verified."
            : "KYC rejected.",
      },
      { status: 200 }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to review KYC";
    return NextResponse.json(
      { ok: false, message: "Unable to review KYC.", details },
      { status: 500 }
    );
  }
}
