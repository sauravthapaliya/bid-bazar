import { ensureDatabaseSchema } from "@/lib/db-schema";
import {
  issueEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";
import { NextResponse } from "next/server";
import { z } from "zod";

const resendSchema = z.object({
  email: z.string().email(),
});

type UserDoc = {
  _id: { toString(): string };
  email?: string;
  emailVerified?: Date | null;
};

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        ok: true,
        message: "Verification OTP was sent.",
      });
    }

    const email = parsed.data.email.toLowerCase();
    const { db } = await connectToDatabase();
    const user = (await db
      .collection(COLLECTIONS.users)
      .findOne(
        { email },
        { projection: { email: 1, emailVerified: 1 } },
      )) as UserDoc | null;

    if (!user || user.emailVerified || !user.email) {
      return NextResponse.json({
        ok: true,
        message: "Verification OTP was sent.",
      });
    }

    const token = await issueEmailVerificationToken(
      user._id.toString(),
      user.email,
    );
    await sendVerificationEmail(user.email, token);

    return NextResponse.json({
      ok: true,
      message: "Verification OTP was sent.",
    });
  } catch {
    return NextResponse.json({
      ok: true,
      message: "Verification OTP was sent.",
    });
  }
}
