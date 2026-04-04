import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAuctionValuation } from "@/lib/auction-valuation";

const valuationSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(50),
  condition: z.enum(["new", "like_new", "excellent", "good", "fair", "poor"]),
  conditionAgeDays: z.number().int().min(0).max(36500).nullable().optional(),
  startPrice: z.number().positive(),
  bidIncrement: z.number().positive(),
  durationHours: z.number().int().min(1).max(8640),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = valuationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid valuation input." },
        { status: 400 }
      );
    }

    const valuation = await generateAuctionValuation(parsed.data);
    return NextResponse.json({ ok: true, valuation }, { status: 200 });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to estimate market value";
    return NextResponse.json(
      { ok: false, message: "Unable to estimate market value.", details },
      { status: 500 }
    );
  }
}
