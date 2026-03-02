import { NextResponse } from "next/server";
import {
  verifyEmailVerificationOtp,
} from "@/lib/auth/email-verification-service";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { verifyEmailOtpSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const parsed = verifyEmailOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or OTP code." },
        { status: 400 }
      );
    }

    const result = await verifyEmailVerificationOtp({
      email: parsed.data.email,
      code: parsed.data.code,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: "Invalid or expired OTP code." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, message: "Email verified." });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json(
      { ok: false, message: "Verification failed.", details },
      { status: 500 }
    );
  }
}
