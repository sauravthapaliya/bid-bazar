import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { getSellerProfile } from "@/lib/seller-profile";

type Params = { params: Promise<{ sellerId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await ensureDatabaseSchema();
    const { sellerId } = await params;
    const profile = await getSellerProfile(sellerId);

    if (!profile) {
      return NextResponse.json(
        { ok: false, message: "Seller not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to load seller profile";
    return NextResponse.json(
      { ok: false, message: "Unable to load seller profile.", details },
      { status: 500 },
    );
  }
}
