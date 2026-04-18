"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Gavel,
  MessageSquare,
  PackageSearch,
  ShoppingBag,
  Star,
} from "lucide-react";
import { SellerReviews } from "@/components/reviews/seller-reviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";

type SellerProfileResponse = {
  seller: {
    id: string;
    name: string;
    imageUrl: string | null;
    isSellerVerified: boolean;
    memberSince: string | Date | null;
  };
  summary: {
    averageRating: number;
    totalReviews: number;
    activeAuctions: number;
    completedAuctions: number;
    successfulSales: number;
  };
  recentAuctions: Array<{
    id: string;
    title: string;
    status: string;
    currentPrice: number;
    totalBids: number;
    endsAt: string | Date | null;
    imageUrl: string | null;
  }>;
  eligibleReviewAuctions: Array<{
    id: string;
    title: string;
    endedAt: string | Date | null;
  }>;
};

async function fetchSellerProfile(sellerId: string): Promise<SellerProfileResponse> {
  const res = await fetch(`/api/sellers/${encodeURIComponent(sellerId)}`);
  const json = (await res.json()) as {
    ok?: boolean;
    profile?: SellerProfileResponse;
    message?: string;
  };

  if (!res.ok || !json.ok || !json.profile) {
    throw new Error(json.message ?? "Unable to load seller profile.");
  }

  return json.profile;
}

const money = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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

type Params = { params: Promise<{ sellerId: string }> };

export default function SellerProfilePage({ params }: Params) {
  const { sellerId } = use(params);
  const profileQuery = useQuery({
    queryKey: queryKeys.sellerProfile(sellerId),
    queryFn: () => fetchSellerProfile(sellerId),
  });

  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8 lg:py-8 space-y-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-2xl bg-muted" />
            <div className="h-28 animate-pulse rounded-2xl bg-muted" />
            <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </main>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8 lg:py-8 space-y-4">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/auctions">
              <ArrowLeft className="h-4 w-4" />
              Back to Auctions
            </Link>
          </Button>
          <Card className="border-destructive/30">
            <CardContent className="flex items-center gap-3 p-6 text-destructive">
              <MessageSquare className="h-5 w-5 shrink-0" />
              <p>
                {profileQuery.error instanceof Error
                  ? profileQuery.error.message
                  : "Unable to load seller profile."}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8 lg:py-10">
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Link href="/auctions">
                <ArrowLeft className="h-4 w-4" />
                Back to Auctions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/auctions">Browse Live Market</Link>
            </Button>
          </div>

          <section className="rounded-[2rem] border border-border bg-card px-6 py-10 shadow-sm md:px-10 md:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <Avatar size="lg" className="mx-auto size-24 border border-border bg-muted">
                <AvatarImage src={profile.seller.imageUrl ?? undefined} alt={profile.seller.name} />
                <AvatarFallback className="text-xl">{initials(profile.seller.name)}</AvatarFallback>
              </Avatar>

              <div className="mt-6 space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {profile.seller.name}
                  </h1>
                  {profile.seller.isSellerVerified ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-green-500/30 bg-green-500/10 px-3 py-1 text-green-700 dark:text-green-400"
                    >
                      <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                      Verified Seller
                    </Badge>
                  ) : null}
                </div>

                <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  {profile.summary.totalReviews > 0
                    ? `${profile.seller.name} has a ${profile.summary.averageRating.toFixed(1)} average rating across ${profile.summary.totalReviews} review${profile.summary.totalReviews === 1 ? "" : "s"}.`
                    : `${profile.seller.name} is building their reputation on Bid Bazar. Reviews from completed buyers will appear here.`}
                </p>

                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Member since{" "}
                  {profile.seller.memberSince
                    ? dateFormat.format(new Date(profile.seller.memberSince))
                    : "recently"}
                </p>
              </div>

              <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/35 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Rating
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-semibold text-foreground">
                      {profile.summary.totalReviews > 0
                        ? profile.summary.averageRating.toFixed(1)
                        : "New"}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/35 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Active Listings
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {profile.summary.activeAuctions}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/35 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Successful Sales
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {profile.summary.successfulSales}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:sticky lg:top-32 lg:h-[calc(100vh-10rem)] lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-start">
            <div className="space-y-8 lg:h-full">
              <section className="space-y-4 lg:flex lg:h-full lg:flex-col">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Buyer Feedback
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Reviews and seller reputation
                  </h2>
                </div>
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                  <SellerReviews sellerId={profile.seller.id} sellerName={profile.seller.name} />
                </div>
              </section>

            </div>

            <aside className="space-y-5 lg:h-full">
              <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm lg:max-h-full lg:overflow-y-auto">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Seller Snapshot
                  </p>
                  <h2 className="text-base font-semibold text-foreground">
                    Activity overview
                  </h2>
                </div>

                <div className="mt-4 space-y-2.5">
                  {[
                    {
                      label: "Completed auctions",
                      value: profile.summary.completedAuctions,
                      icon: PackageSearch,
                    },
                    {
                      label: "Active auctions",
                      value: profile.summary.activeAuctions,
                      icon: Gavel,
                    },
                    {
                      label: "Successful sales",
                      value: profile.summary.successfulSales,
                      icon: ShoppingBag,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl bg-muted/35 px-3.5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-muted-foreground">
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm text-foreground">{item.label}</p>
                      </div>
                      <span className="text-base font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Recent Auctions
                    </p>
                    <h3 className="text-base font-semibold text-foreground">
                      Listings from this seller
                    </h3>
                  </div>

                  {profile.recentAuctions.length === 0 ? (
                    <div className="mt-4 rounded-2xl bg-muted/35 px-4 py-8 text-center text-sm text-muted-foreground">
                      No auctions to show yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      {profile.recentAuctions.slice(0, 2).map((auction) => (
                      <Link
                        key={auction.id}
                        href={`/auctions/${auction.id}`}
                        className="block rounded-2xl border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                            {auction.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={auction.imageUrl}
                                alt={auction.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {auction.title}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {money.format(auction.currentPrice)} • {auction.totalBids} bids
                                </p>
                              </div>
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant={statusVariant(auction.status)}>{auction.status}</Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {auction.endsAt
                                  ? dateFormat.format(new Date(auction.endsAt))
                                  : "Date unavailable"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
