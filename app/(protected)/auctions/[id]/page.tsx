"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Clock3,
  HandCoins,
  Heart,
  Loader2,
  Trophy,
  ArrowLeft,
  CreditCard,
  TrendingUp,
  Gavel,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  PackageSearch,
  ChevronRight,
} from "lucide-react";
import { AuctionContactRequestForm } from "@/components/auctions/auction-contact-request-form";
import { ReviewForm } from "@/components/reviews/review-form";
import { StarRating } from "@/components/reviews/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { queryKeys } from "@/lib/query-keys";

// ── Types ──────────────────────────────────────────────────────────────────

type AuctionBidItem = {
  id: string;
  amount: number;
  createdAt: string | Date | null;
  bidderId: string;
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
  sellerId: string;
  sellerName: string;
  isSellerVerified: boolean;
  imageUrl: string | null;
  isOwnerView: boolean;
  bids: AuctionBidItem[];
  winnerId: string | null;
  winnerLabel: string | null;
  isViewerWinner: boolean;
  contactRequestSentAt?: string | null;
  sellerRating: number | null;
  sellerReviewCount: number;
  marketValueEstimate: {
    estimatedMarketValue: number;
    suggestedStartPrice: number;
    suggestedBidIncrement: number;
    confidence: "low" | "medium" | "high";
    confidenceScore: number;
    reasonCodes: string[];
    deterministicFingerprint: string;
    usesAiExtraction: boolean;
    valuationSource: "gemini";
    valuationDebug: string;
    generatedAt: string;
  } | null;
};

type Params = { params: Promise<{ id: string }> };
type WatchlistStatusResponse = { watched: boolean };
type AuctionPaymentStatus = {
  id: string;
  status: string;
  amount: number;
  provider: string | null;
  paidAt: string | Date | null;
} | null;

// ── Fetchers ───────────────────────────────────────────────────────────────

async function fetchAuctionDetail(id: string): Promise<AuctionDetail> {
  const res = await fetch(`/api/auctions/${id}`);
  const json = (await res.json()) as {
    ok?: boolean;
    auction?: AuctionDetail;
    message?: string;
  };
  if (!res.ok || !json.ok || !json.auction)
    throw new Error(json.message ?? "Unable to load auction.");
  return json.auction;
}

async function fetchAuctionPaymentStatus(
  id: string,
): Promise<AuctionPaymentStatus> {
  const res = await fetch(
    `/api/transactions?auctionId=${encodeURIComponent(id)}`,
  );
  const json = (await res.json()) as {
    ok?: boolean;
    transaction?: AuctionPaymentStatus;
    message?: string;
  };
  if (!res.ok || !json.ok)
    throw new Error(json.message ?? "Unable to load payment status.");
  return json.transaction ?? null;
}

async function fetchWatchlistStatus(
  id: string,
): Promise<WatchlistStatusResponse> {
  const res = await fetch(`/api/watchlist/${id}`);
  const json = (await res.json()) as {
    ok?: boolean;
    watched?: boolean;
    message?: string;
  };
  if (!res.ok || !json.ok || typeof json.watched !== "boolean")
    throw new Error(json.message ?? "Unable to load watchlist status.");
  return { watched: json.watched };
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
  const show =
    (condition === "new" || condition === "like_new") &&
    typeof ageDays === "number";
  return show ? `${base} · ${ageDays}d used` : base;
}
function bidderMask(id: string) {
  if (id.length <= 6) return id;
  return `${id.slice(0, 3)}···${id.slice(-3)}`;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
  > = {
  live: {
    label: "Live",
    className:
      "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
    dot: "bg-current animate-pulse",
  },
  scheduled: {
    label: "Scheduled",
    className:
      "border-sky-500 bg-sky-500 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-sky-950",
    dot: "bg-current",
  },
  ended: {
    label: "Ended",
    className:
      "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-indigo-950",
    dot: "bg-current",
  },
  expired: {
    label: "Expired",
    className:
      "border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950",
    dot: "bg-current",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-400 dark:text-rose-950",
    dot: "bg-current",
  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ended;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SideCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function SideCardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-border px-5 py-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-xs font-semibold text-right ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AuctionDetailPage({ params }: Params) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [isBidding, setIsBidding] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);

  const auctionQuery = useQuery({
    queryKey: queryKeys.auctionDetail(id),
    queryFn: () => fetchAuctionDetail(id),
  });
  const auction = auctionQuery.data;

  const watchlistStatusQuery = useQuery({
    queryKey: queryKeys.watchlistStatus(id),
    queryFn: () => fetchWatchlistStatus(id),
    enabled: Boolean(session?.user?.id && auction && !auction.isOwnerView),
  });

  const now = new Date();
  const endsAt = auction?.endsAt ? new Date(auction.endsAt) : null;
  const hasExpired = Boolean(
    auction &&
    (auction.status === "live" || auction.status === "scheduled") &&
    endsAt &&
    endsAt <= now,
  );
  const effectiveStatus = hasExpired ? "expired" : auction?.status;
  const isFinalized =
    effectiveStatus === "ended" || effectiveStatus === "cancelled";

  const paymentStatusQuery = useQuery({
    queryKey: queryKeys.auctionPaymentStatus(id),
    queryFn: () => fetchAuctionPaymentStatus(id),
    enabled: Boolean(
      session?.user?.id && auction?.isViewerWinner && isFinalized,
    ),
  });

  const isLive = Boolean(
    auction &&
    auction.status === "live" &&
    endsAt &&
    endsAt > now &&
    !auction.isOwnerView,
  );
  const minimumAllowed = useMemo(
    () =>
      auction ? Math.round(auction.currentPrice + auction.bidIncrement) : 0,
    [auction],
  );
  const viewerId = session?.user?.id ? String(session.user.id) : null;
  const isWatched = Boolean(watchlistStatusQuery.data?.watched);
  const isViewerLastBidder = Boolean(
    viewerId &&
      auction?.bids?.[0] &&
      String(auction.bids[0].bidderId) === viewerId
  );

  const winnerBid = useMemo(() => {
    if (!auction?.winnerId) return null;
    let selected: AuctionBidItem | null = null;
    for (const bid of auction.bids) {
      if (bid.bidderId !== auction.winnerId) continue;
      if (!selected || bid.amount > selected.amount) {
        selected = bid;
        continue;
      }
      if (bid.amount === selected.amount) {
        const bt = bid.createdAt ? new Date(bid.createdAt).valueOf() : 0;
        const st = selected.createdAt
          ? new Date(selected.createdAt).valueOf()
          : 0;
        if (bt > st) selected = bid;
      }
    }
    return selected;
  }, [auction]);

  const reviewQuery = useQuery({
    queryKey: queryKeys.auctionReview(id),
    queryFn: async () => {
      const res = await fetch(`/api/reviews/auction/${encodeURIComponent(id)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        review?: { id: string; rating: number; comment: string | null } | null;
      };
      return json.review ?? null;
    },
    enabled: Boolean(session?.user?.id && auction?.isViewerWinner && isFinalized),
  });

  const winnerPayment = paymentStatusQuery.data;
  const isWinnerPaymentPaid = winnerPayment?.status === "paid";
  const hasReviewed = Boolean(reviewQuery.data);

  async function submitBid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        queryClient.invalidateQueries({
          queryKey: queryKeys.auctionDetail(id),
        }),
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

  async function toggleWatchlist() {
    if (
      !session?.user?.id ||
      !auction ||
      auction.isOwnerView ||
      isTogglingWatchlist
    )
      return;
    setIsTogglingWatchlist(true);
    try {
      const nextWatchedState = !isWatched;
      const res = await fetch(
        isWatched ? `/api/watchlist/${id}` : "/api/watchlist",
        isWatched
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ auctionId: id }),
            },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok)
        throw new Error(json.message ?? "Unable to update watchlist.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.watchlistStatus(id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.watchlist() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData() }),
      ]);
      toast.success(
        nextWatchedState
          ? "Added to watchlist."
          : "Removed from watchlist.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update watchlist.",
      );
    } finally {
      setIsTogglingWatchlist(false);
    }
  }

  async function startCheckout(method: "esewa" | "khalti") {
    if (
      !auction ||
      !auction.isViewerWinner ||
      !isFinalized ||
      isPreparingPayment
    )
      return;
    setIsPreparingPayment(true);
    try {
      const txRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId: auction.id }),
      });
      const txJson = (await txRes.json()) as {
        ok?: boolean;
        message?: string;
        transactionId?: string;
        amount?: number;
      };
      if (!txRes.ok || !txJson.ok || !txJson.transactionId) {
        return;
      }
      const amount =
        typeof txJson.amount === "number"
          ? txJson.amount
          : auction.currentPrice;
      router.push(
        `/payments/${method}?${new URLSearchParams({ transactionId: txJson.transactionId, amount: String(amount), productName: auction.title })}`,
      );
    } catch {
    } finally {
      setIsPreparingPayment(false);
    }
  }

  // ── Loading ──
  if (auctionQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-360 px-4 py-8 md:px-6 lg:px-8 space-y-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <div className="aspect-video animate-pulse rounded-2xl bg-muted" />
              <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="space-y-4">
              <div className="h-48 animate-pulse rounded-2xl bg-muted" />
              <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Error ──
  if (auctionQuery.error || !auction) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-360 px-4 py-8 md:px-6 lg:px-8 space-y-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
          >
            <Link href="/auctions">
              <ArrowLeft className="h-4 w-4" />
              Back to Auctions
            </Link>
          </Button>
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-destructive">
              {auctionQuery.error instanceof Error
                ? auctionQuery.error.message
                : "Unable to load auction."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-360 px-4 py-6 md:px-6 lg:px-8 lg:py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            href="/auctions"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Live Market
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          <span className="text-foreground font-medium truncate max-w-xs">
            {auction.title}
          </span>
        </div>

        {/* Expired banner */}
        {hasExpired && (
          <Alert className="rounded-xl border-yellow-500/30 bg-yellow-500/8">
            <Clock3 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400 font-semibold">
              Auction Expired
            </AlertTitle>
            <AlertDescription className="text-yellow-700/80 dark:text-yellow-400/70">
              This auction has expired and is no longer accepting bids.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">
            {/* Image card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {auction.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={auction.imageUrl}
                    alt={auction.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/30">
                    <PackageSearch className="h-12 w-12" />
                    <p className="text-xs">No image uploaded</p>
                  </div>
                )}
                {/* Status overlay */}
                <div className="absolute top-4 left-4">
                  <StatusPill status={effectiveStatus ?? "ended"} />
                </div>
                {/* Top-right overlay cluster */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1 backdrop-blur-sm">
                    <Gavel className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">
                      {auction.totalBids}{" "}
                      {auction.totalBids === 1 ? "bid" : "bids"}
                    </span>
                  </div>
                  {(session?.user && !auction.isOwnerView) ||
                  (isFinalized && auction.isViewerWinner) ? (
                    <TooltipProvider delayDuration={100}>
                      <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/92 px-2 py-2 shadow-sm backdrop-blur-sm">
                        {session?.user && !auction.isOwnerView ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={toggleWatchlist}
                                disabled={isTogglingWatchlist || watchlistStatusQuery.isLoading}
                                className="h-8 w-8 cursor-pointer rounded-full"
                              >
                                {isTogglingWatchlist || watchlistStatusQuery.isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`h-4 w-4 ${isWatched ? "fill-current text-primary" : "text-foreground"}`}
                                  />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isWatched ? "Remove from watchlist" : "Add to watchlist"}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        {session?.user &&
                        !auction.isOwnerView &&
                        isFinalized &&
                        auction.isViewerWinner ? (
                          <div className="h-5 w-px bg-border" />
                        ) : null}
                        {isFinalized && auction.isViewerWinner ? (
                          paymentStatusQuery.isLoading || isPreparingPayment ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex h-8 w-8 cursor-progress items-center justify-center rounded-full text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Loading payment status</TooltipContent>
                            </Tooltip>
                          ) : isWinnerPaymentPaid ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex h-8 w-8 cursor-help items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {winnerPayment?.provider
                                  ? `Payment complete via ${winnerPayment.provider}`
                                  : "Payment complete"}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startCheckout("esewa")}
                                    className="h-8 w-8 cursor-pointer rounded-full text-foreground"
                                  >
                                    <HandCoins className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pay with eSewa</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startCheckout("khalti")}
                                    className="h-8 w-8 cursor-pointer rounded-full text-foreground"
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pay with Khalti</TooltipContent>
                              </Tooltip>
                            </>
                          )
                        ) : null}
                      </div>
                    </TooltipProvider>
                  ) : null}
                </div>
              </div>

              {/* Title + meta */}
              <div className="p-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
                  <div className="min-w-0 space-y-5">
                    <div className="space-y-3">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                        {auction.title}
                      </h1>
                      <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                        {auction.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-semibold capitalize text-foreground">
                          {auction.category.replaceAll("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Condition:</span>
                        <span className="font-semibold text-foreground">
                          {conditionLabel(auction.condition, auction.conditionAgeDays)}
                        </span>
                      </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground">Seller:</span>
                          <span className="font-semibold text-foreground">
                            {auction.sellerName}
                          </span>
                        {auction.isSellerVerified && (
                          <Badge
                            variant="outline"
                            className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 text-[10px]"
                          >
                            Verified Seller
                          </Badge>
                        )}
                          {auction.sellerRating !== null && auction.sellerReviewCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-semibold">
                              <StarRating value={Math.round(auction.sellerRating)} size="sm" />
                              {auction.sellerRating} ({auction.sellerReviewCount})
                            </span>
                          )}
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3"
                          >
                            <Link href={`/sellers/${auction.sellerId}`}>View Profile</Link>
                          </Button>
                        </div>
                    </div>
                  </div>

                  {auction.marketValueEstimate ? (
                    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary/6 to-background shadow-sm">
                      <div className="border-b border-primary/10 px-5 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/90">
                          Estimated Market Value
                        </p>
                      </div>
                      <div className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <p className="text-3xl font-bold tracking-tight text-foreground">
                            {money.format(auction.marketValueEstimate.estimatedMarketValue)}
                          </p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          Confidence{" "}
                          <span className="font-semibold capitalize text-foreground">
                            {auction.marketValueEstimate.confidence}
                          </span>{" "}
                          · Score{" "}
                          <span className="font-semibold text-foreground">
                            {Math.round(auction.marketValueEstimate.confidenceScore * 100)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Bid history */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-5 py-4 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Gavel className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bid History
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isFinalized && auction.winnerLabel && winnerBid
                      ? `Winner: ${auction.winnerLabel} · ${money.format(winnerBid.amount)}`
                      : auction.isOwnerView
                        ? "Full bidder details visible as seller"
                        : "Bidder identities are protected"}
                  </p>
                </div>
              </div>

              <div className="p-5">
                {auction.bids.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground/40">
                    <Gavel className="h-7 w-7" />
                    <p className="text-sm italic">
                      No bids yet — be the first!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auction.bids.map((bid, index) => {
                      const isViewer = viewerId && bid.bidderId === viewerId;
                      const isWinner =
                        isFinalized && winnerBid && bid.id === winnerBid.id;
                      return (
                        <div
                          key={bid.id}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${isWinner ? "border-primary/30 bg-primary/5" : isViewer ? "border-border bg-muted/30" : "border-border bg-background"}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isWinner ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                            >
                              {isWinner ? (
                                <Trophy className="h-4 w-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground">
                                {money.format(bid.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {auction.isOwnerView
                                  ? `${bid.bidderLabel} (${bidderMask(bid.bidderId)})`
                                  : bid.bidderLabel}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isViewer && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                              >
                                You
                              </Badge>
                            )}
                            {isWinner && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                              >
                                Winner
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {bid.createdAt
                                ? dateTime.format(new Date(bid.createdAt))
                                : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            {/* Price card */}
            <SideCard>
              <div className="p-5 space-y-4">
                {/* Current price hero */}
                <div className="rounded-xl bg-primary/8 border border-primary/20 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                    Current Price
                  </p>
                  <p className="text-4xl font-bold tracking-tight text-foreground">
                    {money.format(auction.currentPrice)}
                  </p>
                  {auction.currentPrice > auction.startPrice && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary font-medium">
                        +
                        {money.format(
                          auction.currentPrice - auction.startPrice,
                        )}{" "}
                        above start
                      </span>
                    </div>
                  )}
                </div>

                {/* Meta rows */}
                <div className="space-y-2.5">
                  <MetaRow
                    label="Starting Price"
                    value={money.format(auction.startPrice)}
                  />
                  <MetaRow
                    label="Min. Next Bid"
                    value={money.format(minimumAllowed)}
                    highlight
                  />
                  <MetaRow
                    label="Bid Increment"
                    value={money.format(auction.bidIncrement)}
                  />
                  <Separator />
                  <MetaRow
                    label="Total Bids"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Gavel className="h-3 w-3 text-muted-foreground" />
                        {auction.totalBids}
                      </span>
                    }
                  />
                  <MetaRow
                    label={isFinalized ? "Winner" : "Highest Bidder"}
                    value={
                      auction.winnerLabel ? (
                        <span className="flex items-center gap-1.5 text-primary">
                          {isFinalized ? (
                            <Trophy className="h-3 w-3" />
                          ) : (
                            <HandCoins className="h-3 w-3" />
                          )}
                          {auction.winnerLabel}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">
                          {isFinalized ? "No winner" : "No bids yet"}
                        </span>
                      )
                    }
                  />
                  <MetaRow
                    label="Auction Ends"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3 text-muted-foreground" />
                        {auction.endsAt
                          ? dateTime.format(new Date(auction.endsAt))
                          : "Unknown"}
                      </span>
                    }
                  />
                </div>
              </div>
            </SideCard>

            {/* Place bid card */}
            <SideCard>
              <SideCardHeader
                title="Place Your Bid"
                subtitle={
                  isLive
                    ? "Enter an amount to participate"
                    : "This auction is not accepting bids"
                }
              />
              <div className="p-5">
                {!session?.user ? (
                  <Button asChild className="w-full h-11 rounded-xl font-bold">
                    <Link href="/login">Sign In to Bid →</Link>
                  </Button>
                ) : auction.isOwnerView ? (
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      You own this listing. Sellers cannot bid on their own
                      auctions.
                    </p>
                  </div>
                ) : isLive ? (
                  <form className="space-y-4" onSubmit={submitBid}>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="bid-amount"
                        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                      >
                        Your Bid (NPR)
                      </Label>
                      <Input
                        id="bid-amount"
                        type="number"
                        min={minimumAllowed}
                        step={1}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={String(minimumAllowed)}
                        required
                        disabled={isViewerLastBidder}
                        className="h-12 rounded-xl text-lg font-bold bg-background border-border focus-visible:ring-primary/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum:{" "}
                        <span className="font-semibold text-primary">
                          {money.format(minimumAllowed)}
                        </span>
                      </p>
                    </div>
                    {bidError && (
                      <Alert
                        variant="destructive"
                        className="rounded-xl border-destructive/30 bg-destructive/8 py-3"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        <AlertDescription className="text-xs">
                          {bidError}
                        </AlertDescription>
                      </Alert>
                    )}
                    {isViewerLastBidder && !bidError ? (
                      <Alert className="rounded-xl border-yellow-500/30 bg-yellow-500/8 py-3">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-400">
                          You already placed the latest bid. Another bidder must bid before you can bid again.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={isBidding || isViewerLastBidder}
                      className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-px active:translate-y-0 gap-2"
                    >
                      {isBidding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Placing Bid…
                        </>
                      ) : (
                        <>
                          <Gavel className="h-4 w-4" />
                          Place Bid
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <Clock3 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Bidding is closed for this auction.
                    </p>
                  </div>
                )}
              </div>
            </SideCard>


            {isFinalized && session?.user && (auction.isOwnerView || auction.isViewerWinner) && (
              <AuctionContactRequestForm
                auctionId={auction.id}
                auctionTitle={auction.title}
                counterpartyLabel={
                  auction.isOwnerView
                    ? auction.winnerLabel ?? "winning bidder"
                    : auction.sellerName
                }
                existingSentAt={auction.contactRequestSentAt ?? null}
                buttonLabel={auction.isOwnerView ? "Contact Bidder" : "Contact Seller"}
              />
            )}

            {isFinalized && auction.isViewerWinner && (
              <SideCard>
                <div className="border-b border-border px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Your Experience
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    {hasReviewed ? "Review Submitted" : "Leave a Review"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Share feedback for auctions you won from this seller.
                  </p>
                </div>
                <div className="p-5">
                  {reviewQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading review status...
                    </div>
                  ) : hasReviewed && reviewQuery.data ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <StarRating value={reviewQuery.data.rating} size="sm" />
                        <span className="text-xs text-muted-foreground">Your rating</span>
                      </div>
                      {reviewQuery.data.comment ? (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {reviewQuery.data.comment}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <ReviewForm
                      auctionId={auction.id}
                      sellerId={auction.sellerId}
                      sellerName={auction.sellerName}
                    />
                  )}
                </div>
              </SideCard>
            )}

          </aside>
        </div>
      </div>
    </main>
  );
}
