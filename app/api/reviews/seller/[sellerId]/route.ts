import { NextResponse } from "next/server";
import { getSellerReviews } from "@/lib/reviews";
import { ensureDatabaseSchema } from "@/lib/db-schema";

type Params = { params: Promise<{ sellerId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await ensureDatabaseSchema();
    const { sellerId } = await params;
    const data = await getSellerReviews(sellerId);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message: "Unable to load reviews.", details },
      { status: 500 },
    );
  }
}
