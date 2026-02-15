"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Eye, Heart, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/query-keys";

type WatchlistItem = {
  watchlistId: string;
  auctionId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  currentPrice: number;
  startPrice: number;
  bidIncrement: number;
  totalBids: number;
  endsAt: string | null;
  addedAt: string | null;
  imageUrl: string | null;
  sellerName: string;
};

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch("/api/watchlist");
  const json = (await res.json()) as {
    ok?: boolean;
    watchlist?: WatchlistItem[];
    message?: string;
  };

  if (!res.ok || !json.ok || !json.watchlist) {
    throw new Error(json.message ?? "Unable to load watchlist.");
  }

  return json.watchlist;
}

function statusVariant(
  status: string,
): "statusLive" | "statusScheduled" | "statusExpired" | "statusEnded" | "statusCancelled" | "neutral" {
  if (status === "live") return "statusLive";
  if (status === "scheduled") return "statusScheduled";
  if (status === "expired") return "statusExpired";
  if (status === "ended") return "statusEnded";
  if (status === "cancelled") return "statusCancelled";
  return "neutral";
}

const money = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function WatchlistPage() {
  const queryClient = useQueryClient();
  const [removingAuctionId, setRemovingAuctionId] = useState<string | null>(null);
  const watchlistQuery = useQuery({
    queryKey: queryKeys.watchlist(),
    queryFn: fetchWatchlist,
  });

  const watchlist = watchlistQuery.data ?? [];
  const liveCount = watchlist.filter((item) => item.status === "live").length;
  const endingSoon = watchlist.filter((item) => {
    if (!item.endsAt) return false;
    return new Date(item.endsAt).valueOf() - Date.now() < 6 * 60 * 60 * 1000;
  }).length;

  async function removeFromWatchlist(auctionId: string) {
    setRemovingAuctionId(auctionId);
    try {
      const res = await fetch(`/api/watchlist/${auctionId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Unable to update watchlist.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.watchlist() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.watchlistStatus(auctionId) }),
      ]);
    } finally {
      setRemovingAuctionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <section className="mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-primary" />
                Watchlist Center
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Watchlist</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Track auctions, monitor price movement, and jump into bidding at the right moment.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Card className="min-w-28 border bg-background/90">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-foreground">{watchlist.length}</p>
                </CardContent>
              </Card>
              <Card className="min-w-28 border bg-background/90">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Live</p>
                  <p className="text-xl font-bold text-foreground">{liveCount}</p>
                </CardContent>
              </Card>
              <Card className="min-w-28 border bg-background/90">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Ending Soon</p>
                  <p className="text-xl font-bold text-foreground">{endingSoon}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {watchlistQuery.isLoading ? (
          <div className="grid gap-4">
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : watchlistQuery.error ? (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-destructive">
              {watchlistQuery.error instanceof Error
                ? watchlistQuery.error.message
                : "Unable to load watchlist."}
            </CardContent>
          </Card>
        ) : watchlist.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Eye className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-lg font-semibold text-foreground">No watched auctions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save interesting listings to track them from one place.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link href="/auctions">Browse Live Market</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4">
            {watchlist.map((item, index) => (
              <Card key={item.watchlistId} className="overflow-hidden border shadow-sm">
                <CardContent className="p-0">
                  <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                    <div className="relative h-52 bg-muted md:h-full">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No image available
                        </div>
                      )}
                      <div className="absolute left-3 top-3">
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="line-clamp-1 text-lg font-semibold text-foreground">{item.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Seller: {item.sellerName} - Category: {item.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Current Price</p>
                          <p className="text-xl font-bold text-foreground">{money.format(item.currentPrice)}</p>
                        </div>
                      </div>

                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.description || "No description available."}
                      </p>

                      <div className="mt-4 grid gap-3 rounded-xl border bg-muted/30 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Starting</p>
                          <p className="font-semibold text-foreground">{money.format(item.startPrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Increment</p>
                          <p className="font-semibold text-foreground">{money.format(item.bidIncrement)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Bids</p>
                          <p className="font-semibold text-foreground">{item.totalBids}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ends</p>
                          <p className="font-semibold text-foreground">
                            {item.endsAt ? dateTime.format(new Date(item.endsAt)) : "Unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Added {item.addedAt ? dateTime.format(new Date(item.addedAt)) : "recently"}
                        </p>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" className="gap-2">
                            <Link href={`/auctions/${item.auctionId}`}>
                              View Auction
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="gap-2"
                            disabled={removingAuctionId === item.auctionId}
                            onClick={() => removeFromWatchlist(item.auctionId)}
                          >
                            {removingAuctionId === item.auctionId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                {index < watchlist.length - 1 ? <Separator /> : null}
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
