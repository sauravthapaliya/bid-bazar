"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";

type AuctionListItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  conditionAgeDays: number | null;
  status: string;
  currentPrice: number;
  totalBids: number;
  endsAt: string | Date | null;
  imageUrl: string | null;
};

async function fetchLiveAuctions(): Promise<AuctionListItem[]> {
  const res = await fetch("/api/auctions");
  const json = (await res.json()) as {
    ok?: boolean;
    auctions?: AuctionListItem[];
    message?: string;
  };
  if (!res.ok || !json.ok || !json.auctions) {
    throw new Error(json.message ?? "Unable to load auctions.");
  }
  return json.auctions;
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

function conditionLabel(condition: string, conditionAgeDays: number | null) {
  const base = condition.replace("_", " ");
  const shouldShowAge =
    (condition === "new" || condition === "like_new") &&
    typeof conditionAgeDays === "number";
  return shouldShowAge ? `${base} days used` : base;
}

export default function AuctionsPage() {
  const auctionsQuery = useQuery({
    queryKey: queryKeys.liveAuctions(),
    queryFn: fetchLiveAuctions,
  });

  const auctions = auctionsQuery.data ?? [];

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Live Market
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Browse live auctions and place bids in real time
            </p>
          </div>
          <Button asChild variant="outline" size="lg" className="shrink-0">
            <Link href="/dashboard">Seller Dashboard</Link>
          </Button>
        </div>

        {auctionsQuery.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : auctionsQuery.error ? (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-destructive">
              {auctionsQuery.error instanceof Error
                ? auctionsQuery.error.message
                : "Unable to load auctions."}
            </CardContent>
          </Card>
        ) : auctions.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base font-medium text-foreground">
                No live auctions right now
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back soon for new listings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((auction) => (
              <Card
                key={auction.id}
                className="group flex flex-col overflow-hidden border shadow-sm transition-all hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {auction.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={auction.imageUrl}
                      alt={auction.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="line-clamp-1 text-lg font-semibold text-foreground">
                    {auction.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {auction.description || "No description available"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {auction.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {conditionLabel(auction.condition, auction.conditionAgeDays)}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {auction.totalBids} {auction.totalBids === 1 ? "bid" : "bids"}
                    </Badge>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Current Price
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {money.format(auction.currentPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Ends
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {auction.endsAt
                          ? dateTime.format(new Date(auction.endsAt))
                          : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <Button asChild size="lg" className="mt-auto w-full">
                    <Link href={`/auctions/${auction.id}`}>View Auction</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
