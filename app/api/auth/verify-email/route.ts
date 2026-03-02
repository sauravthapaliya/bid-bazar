import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { verifyEmailByOtp } from "@/lib/email-verification";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or OTP code." },
        { status: 400 }
      );
    }

    const result = await verifyEmailByOtp(parsed.data.email, parsed.data.code);
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
