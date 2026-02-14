import "server-only";

import type { Db } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";

type AuctionRow = {
  _id: unknown;
  productId: unknown;
  highestBidderId?: unknown;
};

function hasWinner(highestBidderId: unknown) {
  return highestBidderId !== null && highestBidderId !== undefined && String(highestBidderId).length > 0;
}

export async function finalizeExpiredAuctions(dbArg?: Db) {
  const db = dbArg ?? (await connectToDatabase()).db;
  const now = new Date();

  const auctions = db.collection<Record<string, unknown>>(COLLECTIONS.auctions);
  const products = db.collection<Record<string, unknown>>(COLLECTIONS.products);

  const expired = (await auctions
    .find(
      {
        status: { $in: ["live", "scheduled"] },
        endsAt: { $lte: now },
      },
      {
        projection: {
          _id: 1,
          productId: 1,
          highestBidderId: 1,
        },
      }
    )
    .toArray()) as AuctionRow[];

  if (expired.length === 0) {
    return { endedCount: 0, soldCount: 0 };
  }

  const auctionOps = expired.map((auction) => ({
    updateOne: {
      filter: { _id: auction._id },
      update: {
        $set: {
          status: "ended",
          winnerId: hasWinner(auction.highestBidderId) ? auction.highestBidderId : null,
          endedAt: now,
          updatedAt: now,
        },
      },
    },
  }));

  await auctions.bulkWrite(auctionOps as never[]);

  const soldProductIds = expired
    .filter((auction) => hasWinner(auction.highestBidderId))
    .map((auction) => auction.productId)
    .filter((id) => id !== null && id !== undefined);

  if (soldProductIds.length === 0) {
    return { endedCount: expired.length, soldCount: 0 };
  }

  const soldResult = await products.updateMany(
    {
      _id: { $in: soldProductIds },
      status: { $ne: "removed" },
    } as never,
    {
      $set: {
        status: "sold",
        updatedAt: now,
      },
    } as never
  );

  return {
    endedCount: expired.length,
    soldCount: soldResult.modifiedCount,
  };
}
