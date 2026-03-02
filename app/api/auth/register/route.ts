import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { issueEmailVerificationToken, sendVerificationEmail } from "@/lib/email-verification";
import { COLLECTIONS } from "@/types/entities";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid input." },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hash(parsed.data.password, 12);
    const now = new Date();

    const { db } = await connectToDatabase();
    const users = db.collection(COLLECTIONS.users);

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Email already registered." },
        { status: 409 }
      );
    }

    const result = await users.insertOne({
      name,
      email,
      passwordHash,
      role: "user",
      isBlocked: false,
      isSellerVerified: false,
      kycStatus: "not_submitted",
      phone: null,
      image: null,
      emailVerified: null,
      createdAt: now,
      updatedAt: now,
    });
    const userId = result.insertedId.toString();

    try {
      const token = await issueEmailVerificationToken(userId, email);
      await sendVerificationEmail(email, token);
    } catch (mailError) {
      const details =
        mailError instanceof Error ? mailError.message : "Failed to send verification OTP";
      return NextResponse.json(
        {
          ok: true,
          userId,
          requiresEmailVerification: true,
          message:
            "Account created, but we could not send verification OTP. Please use resend verification.",
          details,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Account created. Please verify with OTP code before signing in.",
        userId,
        requiresEmailVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json(
      { ok: false, message: "Registration failed.", details },
      { status: 500 }
    );
  }
}
