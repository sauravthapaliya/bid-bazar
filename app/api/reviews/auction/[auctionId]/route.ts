import { NextResponse } from "next/server";
import { getReviewForAuction } from "@/lib/reviews";
import { ensureDatabaseSchema } from "@/lib/db-schema";

type Params = { params: Promise<{ auctionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await ensureDatabaseSchema();
    const { auctionId } = await params;
    const review = await getReviewForAuction(auctionId);
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message: "Unable to load review.", details },
      { status: 500 },
    );
  }
}
