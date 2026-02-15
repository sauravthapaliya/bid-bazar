import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type Params = {
  params: Promise<{ auctionId: string }>;
};

function idVariants(id: string): (ObjectId | string)[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

function buildInClauses(id: string) {
  const variants = idVariants(id);
  const strings = variants.filter((row): row is string => typeof row === "string");
  const objectIds = variants.filter((row): row is ObjectId => row instanceof ObjectId);
  return { strings, objectIds };
}

function getWatchlistQuery(userId: string, auctionId: string) {
  const userCandidates = buildInClauses(userId);
  const auctionCandidates = buildInClauses(auctionId);
  const andClauses: Record<string, unknown>[] = [];

  if (userCandidates.strings.length > 0 || userCandidates.objectIds.length > 0) {
    const orClauses: Record<string, unknown>[] = [];
    if (userCandidates.strings.length > 0) orClauses.push({ userId: { $in: userCandidates.strings } });
    if (userCandidates.objectIds.length > 0) orClauses.push({ userId: { $in: userCandidates.objectIds } });
    andClauses.push(orClauses.length === 1 ? orClauses[0] : { $or: orClauses });
  }

  if (auctionCandidates.strings.length > 0 || auctionCandidates.objectIds.length > 0) {
    const orClauses: Record<string, unknown>[] = [];
    if (auctionCandidates.strings.length > 0) orClauses.push({ auctionId: { $in: auctionCandidates.strings } });
    if (auctionCandidates.objectIds.length > 0) orClauses.push({ auctionId: { $in: auctionCandidates.objectIds } });
    andClauses.push(orClauses.length === 1 ? orClauses[0] : { $or: orClauses });
  }

  if (andClauses.length === 0) return { userId: "__never__", auctionId: "__never__" };
  if (andClauses.length === 1) return andClauses[0];
  return { $and: andClauses };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { auctionId } = await params;
    const { db } = await connectToDatabase();
    const watchlist = db.collection<Record<string, unknown>>(COLLECTIONS.watchlist);
    const query = getWatchlistQuery(session.user.id, auctionId);
    const row = await watchlist.findOne(query as never, { projection: { _id: 1 } });

    return NextResponse.json(
      {
        ok: true,
        watched: Boolean(row),
        watchlistId: row?._id ? String(row._id) : null,
      },
      { status: 200 },
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to load watchlist status";
    return NextResponse.json(
      { ok: false, message: "Unable to load watchlist status.", details },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { auctionId } = await params;
    const { db } = await connectToDatabase();
    const watchlist = db.collection<Record<string, unknown>>(COLLECTIONS.watchlist);
    const query = getWatchlistQuery(session.user.id, auctionId);
    const removed = await watchlist.deleteMany(query as never);

    return NextResponse.json(
      {
        ok: true,
        watched: false,
        removed: removed.deletedCount,
        message: removed.deletedCount > 0 ? "Removed from watchlist." : "Item was not in watchlist.",
      },
      { status: 200 },
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to update watchlist";
    return NextResponse.json(
      { ok: false, message: "Unable to update watchlist.", details },
      { status: 500 },
    );
  }
}
