import { ensureDatabaseSchema } from "@/lib/db-schema";
import { resendEmailVerificationOtpForEmail } from "@/lib/auth/email-verification-service";
import { NextResponse } from "next/server";
import { resendVerificationSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const parsed = resendVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        ok: true,
        message: "Verification OTP was sent.",
      });
    }

    await resendEmailVerificationOtpForEmail(parsed.data.email);

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
