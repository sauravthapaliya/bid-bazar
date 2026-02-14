"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { queryKeys } from "@/lib/query-keys";

type AuctionBidItem = {
  id: string;
  amount: number;
  createdAt: string | Date | null;
  bidderLabel: string;
};

type AuctionDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  conditionAgeDays: number | null;
  status: string;
  currentPrice: number;
  startPrice: number;
  bidIncrement: number;
  totalBids: number;
  endsAt: string | Date | null;
  sellerName: string;
  imageUrl: string | null;
  isOwnerView: boolean;
  bids: AuctionBidItem[];
};

type Params = {
  params: Promise<{
    id: string;
  }>;
};

async function fetchAuctionDetail(id: string): Promise<AuctionDetail> {
  const res = await fetch(`/api/auctions/${id}`);
  const json = (await res.json()) as {
    ok?: boolean;
    auction?: AuctionDetail;
    message?: string;
  };
  if (!res.ok || !json.ok || !json.auction) {
    throw new Error(json.message ?? "Unable to load auction.");
  }
  return json.auction;
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

export default function AuctionDetailPage({ params }: Params) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [isBidding, setIsBidding] = useState(false);

  const auctionQuery = useQuery({
    queryKey: queryKeys.auctionDetail(id),
    queryFn: () => fetchAuctionDetail(id),
  });

  const auction = auctionQuery.data;
  const now = new Date();
  const endsAt = auction?.endsAt ? new Date(auction.endsAt) : null;
  const hasExpired = Boolean(
    auction &&
      (auction.status === "live" || auction.status === "scheduled") &&
      endsAt &&
      endsAt <= now,
  );
  const effectiveStatus = hasExpired ? "expired" : auction?.status;
  const isLive = Boolean(
    auction &&
      auction.status === "live" &&
      endsAt &&
      endsAt > now &&
      !auction.isOwnerView,
  );
  const minimumAllowed = useMemo(() => {
    if (!auction) return 0;
    return Math.round(auction.currentPrice + auction.bidIncrement);
  }, [auction]);

  async function submitBid(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLive || !auction) return;
    const amount = Number(bidAmount || minimumAllowed);
    if (!Number.isFinite(amount) || amount < minimumAllowed) {
      setBidError(`Bid must be at least ${money.format(minimumAllowed)}.`);
      return;
    }

    setIsBidding(true);
    setBidError(null);
    try {
      const res = await fetch(`/api/auctions/${id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setBidError(json.message ?? "Unable to place bid.");
        return;
      }

      setBidAmount("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionDetail(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.liveAuctions() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myAuctions() }),
      ]);
    } catch {
      setBidError("Unable to place bid.");
    } finally {
      setIsBidding(false);
    }
  }

  if (auctionQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background scroll-mt-20">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
          <div className="mt-6 h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </main>
    );
  }

  if (auctionQuery.error || !auction) {
    return (
      <main className="min-h-screen bg-background scroll-mt-20">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auctions">Back to Auctions</Link>
          </Button>
          <Card className="mt-4 border-destructive/30">
            <CardContent className="p-6 text-destructive">
              {auctionQuery.error instanceof Error
                ? auctionQuery.error.message
                : "Unable to load auction."}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/auctions">Back to Auctions</Link>
          </Button>
        </div>

        {hasExpired ? (
          <Alert className="mb-6 border-amber-300/60 bg-amber-50/70 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            <Clock3 className="h-4 w-4" />
            <AlertTitle>Auction expired</AlertTitle>
            <AlertDescription>
              This auction has expired and is no longer accepting bids.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <Card className="overflow-hidden border shadow-sm">
              <div className="relative aspect-video bg-muted">
                {auction.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={auction.imageUrl}
                    alt={auction.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No image uploaded
                  </div>
                )}
                <div className="absolute right-4 top-4">
                  <Badge
                    variant={
                      effectiveStatus === "live"
                        ? "success"
                        : effectiveStatus === "expired"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {effectiveStatus}
                  </Badge>
                </div>
              </div>

              <CardHeader className="space-y-4 pb-6">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {auction.title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base leading-relaxed">
                    {auction.description || "No description provided."}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{auction.category}</Badge>
                  <Badge variant="outline">
                    {conditionLabel(auction.condition, auction.conditionAgeDays)}
                  </Badge>
                  <Badge variant="outline">Seller: {auction.sellerName}</Badge>
                </div>
              </CardHeader>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Bid History
                </CardTitle>
                <CardDescription className="text-sm">
                  {auction.isOwnerView
                    ? "Full bidder details visible to you as the seller"
                    : "Bidder identities are protected"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {auction.bids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bids yet</p>
                ) : (
                  <div className="space-y-4">
                    {auction.bids.map((bid, index) => (
                      <div key={bid.id}>
                        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                          <div>
                            <p className="text-lg font-bold text-foreground">
                              {money.format(bid.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bid.bidderLabel}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {bid.createdAt
                              ? dateTime.format(new Date(bid.createdAt))
                              : "Unknown"}
                          </p>
                        </div>
                        {index < auction.bids.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Auction Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Price
                  </p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {money.format(auction.currentPrice)}
                  </p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Starting Price
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {money.format(auction.startPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Minimum Next Bid
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {money.format(minimumAllowed)}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Bids
                    </span>
                    <Badge variant="secondary">{auction.totalBids}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Auction Ends
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {auction.endsAt
                        ? dateTime.format(new Date(auction.endsAt))
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Place Your Bid
                </CardTitle>
                <CardDescription className="text-sm">
                  {isLive
                    ? "Enter your bid amount to participate"
                    : "This auction is not currently accepting bids"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!session?.user ? (
                  <Button asChild size="lg" className="w-full">
                    <Link href="/login">Sign In to Bid</Link>
                  </Button>
                ) : auction.isOwnerView ? (
                  <p className="text-sm text-muted-foreground">
                    You own this auction. Sellers cannot bid on their own items.
                  </p>
                ) : isLive ? (
                  <form className="space-y-4" onSubmit={submitBid}>
                    <div className="space-y-2">
                      <Label htmlFor="bid-amount" className="text-sm font-medium">
                        Your Bid Amount (NPR)
                      </Label>
                      <Input
                        id="bid-amount"
                        type="number"
                        min={minimumAllowed}
                        step={1}
                        value={bidAmount}
                        onChange={(event) => setBidAmount(event.target.value)}
                        placeholder={String(minimumAllowed)}
                        required
                        className="text-lg font-semibold"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum bid: {money.format(minimumAllowed)}
                      </p>
                    </div>
                    {bidError ? (
                      <p className="text-sm text-destructive">{bidError}</p>
                    ) : null}
                    <Button type="submit" size="lg" className="w-full" disabled={isBidding}>
                      {isBidding ? "Placing..." : "Place Bid"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">Bidding is closed.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
