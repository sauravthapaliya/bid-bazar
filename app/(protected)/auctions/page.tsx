"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/reviews/star-rating";
import { queryKeys } from "@/lib/query-keys";
import {
  Gavel,
  LayoutDashboard,
  TrendingUp,
  Clock,
  Tag,
  PackageSearch,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type AuctionListItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  conditionAgeDays: number | null;
  status: string;
  startPrice: number;
  currentPrice: number;
  totalBids: number;
  endsAt: string | Date | null;
  imageUrl: string | null;
  sellerName: string;
  isSellerVerified: boolean;
  sellerRating: number | null;
  sellerReviewCount: number;
};

async function fetchLiveAuctions(): Promise<AuctionListItem[]> {
  const res = await fetch("/api/auctions");
  const json = (await res.json()) as {
    ok?: boolean;
    auctions?: AuctionListItem[];
    message?: string;
  };
  if (!res.ok || !json.ok || !json.auctions)
    throw new Error(json.message ?? "Unable to load auctions.");
  return json.auctions;
}

// ── Formatters ─────────────────────────────────────────────────────────────

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

function conditionLabel(condition: string, ageDays: number | null) {
  const base = condition
    .replaceAll("_", " ")
    .replace(/\b\w/g, (x) => x.toUpperCase());
  const showAge =
    (condition === "new" || condition === "like_new") &&
    typeof ageDays === "number";
  return showAge ? `${base} · ${ageDays}d used` : base;
}

// ── Skeleton card ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-24 bg-muted rounded-xl mt-2" />
        <div className="h-10 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

// ── Auction card ───────────────────────────────────────────────────────────

function AuctionCard({ auction }: { auction: AuctionListItem }) {
  const priceRise = auction.currentPrice > auction.startPrice;

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {auction.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={auction.imageUrl}
            alt={auction.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/30">
            <PackageSearch className="h-10 w-10" />
            <p className="text-xs">No image</p>
          </div>
        )}

        {/* Bid count pill — top left */}
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 backdrop-blur-sm">
          <Gavel className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {auction.totalBids} {auction.totalBids === 1 ? "bid" : "bids"}
          </span>
        </div>

        {/* Status dot — top right */}
        {/* Status badge */}
        <Badge
          variant="statusLive"
          className="absolute top-3 right-3 border-emerald-500 bg-emerald-500 text-white px-2.5 py-1 text-xs font-semibold shadow-sm shadow-emerald-950/25 dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Title + description */}
        <div className="space-y-1.5">
          <h3 className="font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {auction.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {auction.description || "No description available"}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="text-[11px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border capitalize gap-1"
          >
            <Tag className="h-2.5 w-2.5" />
            {auction.category.replaceAll("_", " ")}
          </Badge>
          <Badge
            variant="outline"
            className="text-[11px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border capitalize"
          >
            {conditionLabel(auction.condition, auction.conditionAgeDays)}
          </Badge>
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate max-w-30 font-medium text-foreground">
            {auction.sellerName}
          </span>
          {auction.isSellerVerified && (
            <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />
          )}
          {auction.sellerRating !== null && auction.sellerReviewCount > 0 && (
            <span className="ml-auto flex items-center gap-1 text-amber-500 font-semibold shrink-0">
              <StarRating value={Math.round(auction.sellerRating)} size="sm" />
              <span className="text-xs">{auction.sellerRating}</span>
            </span>
          )}
        </div>

        {/* Price block */}
        <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Starting</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {money.format(auction.startPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <TrendingUp
                className={`h-3 w-3 ${priceRise ? "text-primary" : "text-muted-foreground"}`}
              />
              Current
            </span>
            <span
              className={`text-base font-bold ${priceRise ? "text-primary" : "text-foreground"}`}
            >
              {money.format(auction.currentPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Ends
            </span>
            <span className="text-xs font-medium text-foreground">
              {auction.endsAt
                ? dateTime.format(new Date(auction.endsAt))
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center justify-between group-hover:bg-primary group-hover:border-primary transition-colors duration-200">
          <span className="text-sm font-semibold text-primary group-hover:text-primary-foreground transition-colors">
            Place Bid
          </span>
          <Gavel className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AuctionsPage() {
  const auctionsQuery = useQuery({
    queryKey: queryKeys.liveAuctions(),
    queryFn: fetchLiveAuctions,
  });
  const auctions = auctionsQuery.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8 space-y-8">
        {/* ── Page header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {/* Eyebrow */}
            <div className="flex items-center gap-2.5">
              <span className="h-px w-5 bg-primary block shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Real-Time Bidding
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Live Market
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse active auctions and place bids in real time.
              {!auctionsQuery.isLoading && auctions.length > 0 && (
                <span className="ml-1.5 font-medium text-foreground">
                  {auctions.length} listings
                </span>
              )}
            </p>
          </div>

          <Button
            asChild
            variant="outline"
            className="h-9 gap-2 text-sm shrink-0 rounded-lg"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Seller Dashboard
            </Link>
          </Button>
        </div>

        {/* ── States ── */}
        {auctionsQuery.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : auctionsQuery.error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">
                Failed to load auctions
              </p>
              <p className="text-xs text-destructive/70 mt-1">
                {auctionsQuery.error instanceof Error
                  ? auctionsQuery.error.message
                  : "Unable to load auctions."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => auctionsQuery.refetch()}
            >
              Try Again
            </Button>
          </div>
        ) : auctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/40">
              <Gavel className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                No live auctions right now
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back soon for new listings
              </p>
            </div>
            <Button asChild size="sm" className="mt-1">
              <Link href="/dashboard#new">List an Item →</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
