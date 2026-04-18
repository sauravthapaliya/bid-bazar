"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Gavel, HandCoins, Loader2, Trophy } from "lucide-react";
import { AuctionContactRequestForm } from "@/components/auctions/auction-contact-request-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodButton } from "@/components/payments/payment-method-button";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/query-keys";

type MyBidItem = {
  auctionId: string;
  title: string;
  sellerName: string;
  category: string;
  status: string;
  bidState: "winning" | "outbid" | "won" | "lost" | "cancelled";
  myBid: number;
  currentPrice: number;
  totalBids: number;
  bidPlacedAt: string | null;
  endsAt: string | null;
  imageUrl: string | null;
  transactionId: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "authorized" | "refunded" | "unknown";
  paymentProvider: "esewa" | "khalti" | null;
  paidAt: string | null;
  contactRequestSentAt: string | null;
};

async function fetchMyBids(): Promise<MyBidItem[]> {
  const res = await fetch("/api/bids/mine");
  const json = (await res.json()) as {
    ok?: boolean;
    items?: MyBidItem[];
    message?: string;
  };
  if (!res.ok || !json.ok || !json.items) {
    throw new Error(json.message ?? "Unable to load your bids.");
  }
  return json.items;
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

function bidStateVariant(
  bidState: MyBidItem["bidState"],
): "bidWinning" | "bidOutbid" | "bidWon" | "bidLost" | "bidCancelled" {
  if (bidState === "winning") return "bidWinning";
  if (bidState === "outbid") return "bidOutbid";
  if (bidState === "won") return "bidWon";
  if (bidState === "lost") return "bidLost";
  return "bidCancelled";
}

function bidStateLabel(bidState: MyBidItem["bidState"]) {
  if (bidState === "winning") return "Winning";
  if (bidState === "outbid") return "Outbid";
  if (bidState === "won") return "Won";
  if (bidState === "lost") return "Lost";
  return "Cancelled";
}

export default function MyBidsPage() {
  const router = useRouter();
  const myBidsQuery = useQuery({
    queryKey: queryKeys.myBids(),
    queryFn: fetchMyBids,
  });

  const items = useMemo(() => myBidsQuery.data ?? [], [myBidsQuery.data]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  const summary = useMemo(() => {
    const active = items.filter((item) => item.status === "live" || item.status === "scheduled").length;
    const winning = items.filter((item) => item.bidState === "winning").length;
    const won = items.filter((item) => item.bidState === "won").length;
    return { active, winning, won, total: items.length };
  }, [items]);

  async function proceedToPayment(item: MyBidItem, method: "esewa" | "khalti") {
    const query = new URLSearchParams({
      auctionId: item.auctionId,
      amount: String(item.currentPrice),
      productName: item.title,
    });
    if (item.transactionId) {
      query.set("transactionId", item.transactionId);
    }
    router.push(`/payments/${method}?${query.toString()}`);
  }

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Bids</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track every auction you participated in and see your final outcomes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/auctions">Browse Live Market</Link>
          </Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Auctions", value: summary.total, icon: Gavel },
            { label: "Active", value: summary.active, icon: Clock3 },
            { label: "Currently Winning", value: summary.winning, icon: HandCoins },
            { label: "Won", value: summary.won, icon: Trophy },
          ].map((item) => (
            <Card key={item.label} className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {myBidsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading your bid history...
          </div>
        ) : myBidsQuery.error ? (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-destructive">
              {myBidsQuery.error instanceof Error
                ? myBidsQuery.error.message
                : "Unable to load your bids."}
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              No bids yet. Start bidding from the Live Market.
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Bid History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.auctionId}>
                    <div className="rounded-xl border bg-card p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">{item.title}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                              <Badge variant={bidStateVariant(item.bidState)}>{bidStateLabel(item.bidState)}</Badge>
                              <Badge variant="neutral">{item.category}</Badge>
                            </div>
                          </div>
                        </div>

                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link href={`/auctions/${item.auctionId}`}>View Auction</Link>
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">My Bid</p>
                          <p className="font-semibold text-foreground">{money.format(item.myBid)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Current Price</p>
                          <p className="font-semibold text-foreground">{money.format(item.currentPrice)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Total Bids</p>
                          <p className="font-semibold text-foreground">{item.totalBids}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            {item.status === "ended" || item.status === "cancelled" ? "Ended At" : "Ends At"}
                          </p>
                          <p className="font-semibold text-foreground">
                            {item.endsAt ? dateTime.format(new Date(item.endsAt)) : "Unknown"}
                          </p>
                        </div>
                      </div>

                      {item.bidState === "won" ? (
                        <div className="mt-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                item.paymentStatus === "paid"
                                  ? "bidWon"
                                  : item.paymentStatus === "pending" ||
                                      item.paymentStatus === "authorized"
                                    ? "bidWinning"
                                    : "neutral"
                              }
                            >
                              payment: {item.paymentStatus}
                            </Badge>
                            {item.paymentProvider ? (
                              <Badge variant="outline">via {item.paymentProvider}</Badge>
                            ) : null}
                            {item.paymentStatus === "paid" ? (
                              <Badge variant="outline">
                                paid {item.paidAt ? dateTime.format(new Date(item.paidAt)) : ""}
                              </Badge>
                            ) : (
                              <>
                                <PaymentMethodButton
                                  method="esewa"
                                  size="sm"
                                  onClick={() => proceedToPayment(item, "esewa")}
                                />
                                <PaymentMethodButton
                                  method="khalti"
                                  size="sm"
                                  emphasis="soft"
                                  onClick={() => proceedToPayment(item, "khalti")}
                                />
                              </>
                            )}
                          </div>
                          <AuctionContactRequestForm
                            auctionId={item.auctionId}
                            auctionTitle={item.title}
                            counterpartyLabel={item.sellerName}
                            existingSentAt={item.contactRequestSentAt}
                            buttonLabel="Contact Seller"
                          />
                        </div>
                      ) : null}

                      <p className="mt-3 text-xs text-muted-foreground">
                        Last bid placed:{" "}
                        {item.bidPlacedAt ? dateTime.format(new Date(item.bidPlacedAt)) : "Unknown"}
                      </p>
                    </div>
                    {index < items.length - 1 ? <Separator className="my-4" /> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
