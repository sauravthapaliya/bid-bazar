import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { finalizeExpiredAuctions } from "@/lib/auction-finalization";
import { getDashboardData } from "@/lib/dashboard-data";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    await finalizeExpiredAuctions();
    const data = await getDashboardData(session.user.id);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to load dashboard data";
    return NextResponse.json(
      { ok: false, message: "Unable to load dashboard data.", details },
      { status: 500 },
    );
  }
}
