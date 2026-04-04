"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  CircleCheckBig,
  ClipboardList,
  Eye,
  HandCoins,
  Heart,
  Zap,
  Upload,
  X,
  PlusCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";

// ── Types ──────────────────────────────────────────────────────────────────

type Summary = {
  activeBids: number;
  wonAuctions: number;
  sellingLive: number;
  unreadNotifications: number;
};

type BidRow = {
  auctionId: string;
  title: string;
  myBid: number;
  currentPrice: number;
  endsAt: string | null;
  status: string;
  bidState: "winning" | "outbid" | "won" | "lost" | "cancelled";
  totalBids: number;
  lastBidAt: string | null;
};

type WatchlistRow = {
  watchlistId: string;
  auctionId: string;
  title: string;
  currentPrice: number;
  status: string;
  endsAt: string | null;
  addedAt: string | null;
};

type DashboardResponse = {
  summary: Summary;
  myBids: BidRow[];
  watchlist: WatchlistRow[];
};

type AuctionValuationPreview = {
  estimatedMarketValue: number;
  suggestedStartPrice: number;
  suggestedBidIncrement: number;
  confidence: "low" | "medium" | "high";
  confidenceScore: number;
  reasonCodes: string[];
  deterministicFingerprint: string;
  usesAiExtraction: boolean;
  valuationSource: "openai" | "fallback_no_api_key" | "fallback_openai_error";
  valuationDebug: string;
};

async function fetchDashboardData(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard/data");
  const json = (await res.json()) as {
    ok?: boolean;
    data?: DashboardResponse;
    message?: string;
  };
  if (!res.ok || !json.ok || !json.data)
    throw new Error(json.message ?? "Unable to load dashboard data.");
  return json.data;
}

function toDurationHours(value: string, unit: DurationUnit) {
  const parsedDurationValue = Number(value);
  if (!Number.isFinite(parsedDurationValue) || parsedDurationValue <= 0) {
    return 0;
  }
  if (unit === "minutes") {
    return Math.max(1, Math.ceil(parsedDurationValue / 60));
  }
  if (unit === "days") return Math.round(parsedDurationValue * 24);
  if (unit === "months") return Math.round(parsedDurationValue * 24 * 30);
  return Math.round(parsedDurationValue);
}

// ── Constants ──────────────────────────────────────────────────────────────

const CONDITIONS = [
  "new",
  "like_new",
  "excellent",
  "good",
  "fair",
  "poor",
] as const;
type Condition = (typeof CONDITIONS)[number];
const DURATION_UNITS = ["minutes", "hours", "days", "months"] as const;
type DurationUnit = (typeof DURATION_UNITS)[number];
const CATEGORY_OPTIONS = [
  "smartphones",
  "laptops",
  "tablets",
  "cameras",
  "audio",
  "gaming",
  "home_appliances",
  "fashion",
  "collectibles",
  "other",
] as const;
type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

// ── Badge helpers ──────────────────────────────────────────────────────────

const BID_STATE_CONFIG: Record<
  BidRow["bidState"],
  { label: string; className: string }
> = {
  winning: {
    label: "Winning",
    className:
      "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  },
  outbid: {
    label: "Outbid",
    className:
      "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  },
  won: {
    label: "Won",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  lost: {
    label: "Lost",
    className: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const STATUS_CONFIG: Record<string, string> = {
  live: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  scheduled:
    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  ended: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

function BidStateBadge({ state }: { state: BidRow["bidState"] }) {
  const c = BID_STATE_CONFIG[state];
  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${c.className}`}>
      {c.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_CONFIG[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge
      variant="outline"
      className={`text-xs px-2 py-0.5 capitalize ${cls}`}
    >
      {status}
    </Badge>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground/40 mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm text-muted-foreground italic">{label}</p>
    </div>
  );
}

// ── Form field ─────────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryOption, setCategoryOption] = useState<CategoryOption | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [conditionAgeDays, setConditionAgeDays] = useState("");
  const [durationValue, setDurationValue] = useState("24");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [startPrice, setStartPrice] = useState("100");
  const [bidIncrement, setBidIncrement] = useState("10");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [valuation, setValuation] = useState<AuctionValuationPreview | null>(
    null
  );
  const [isValuationLoading, setIsValuationLoading] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboardData(),
    queryFn: fetchDashboardData,
  });

  const resolvedCategory = useMemo(
    () =>
      categoryOption === "other" ? customCategory.trim() : categoryOption.trim(),
    [categoryOption, customCategory]
  );
  const durationHours = useMemo(
    () => toDurationHours(durationValue, durationUnit),
    [durationUnit, durationValue]
  );
  const requiresConditionAge =
    condition === "new" || condition === "like_new";
  const parsedConditionAge = useMemo(() => {
    if (!requiresConditionAge) return null;
    const parsed = Number(conditionAgeDays);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }, [conditionAgeDays, requiresConditionAge]);

  useEffect(() => {
    const hasEnoughData =
      title.trim().length >= 4 &&
      description.trim().length >= 20 &&
      resolvedCategory.length >= 2 &&
      durationHours > 0 &&
      Number(startPrice) > 0 &&
      Number(bidIncrement) > 0 &&
      (!requiresConditionAge || parsedConditionAge !== null);

    if (!hasEnoughData) {
      setValuation(null);
      setValuationError(null);
      setIsValuationLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsValuationLoading(true);
      setValuationError(null);

      try {
        const res = await fetch("/api/auctions/valuation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            category: resolvedCategory,
            condition,
            conditionAgeDays: parsedConditionAge,
            startPrice: Number(startPrice),
            bidIncrement: Number(bidIncrement),
            durationHours,
          }),
          signal: controller.signal,
        });

        const json = (await res.json()) as {
          ok?: boolean;
          valuation?: AuctionValuationPreview;
          message?: string;
        };

        if (!res.ok || !json.ok || !json.valuation) {
          throw new Error(json.message ?? "Unable to estimate market value.");
        }

        setValuation(json.valuation);
      } catch (error) {
        if (controller.signal.aborted) return;
        setValuation(null);
        setValuationError(
          error instanceof Error
            ? error.message
            : "Unable to estimate market value."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsValuationLoading(false);
        }
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    bidIncrement,
    condition,
    description,
    durationHours,
    parsedConditionAge,
    requiresConditionAge,
    resolvedCategory,
    startPrice,
    title,
  ]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currency = new Intl.NumberFormat("en-NP", {
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

  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "";
  const bidderId = session?.user?.id ? String(session.user.id) : "—";
  const canCreateAuction =
    session?.user?.role === "admin" || session?.user?.isSellerVerified === true;
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "U";
  const sellerVerified = session?.user?.isSellerVerified === true;
  const sellerBadgeClass =
    sessionStatus === "loading"
      ? "border-border text-muted-foreground"
      : sellerVerified
        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  const sellerBadgeLabel =
    sessionStatus === "loading"
      ? "Loading"
      : sellerVerified
        ? "Seller Verified"
        : "Not Verified";

  const dashboard = dashboardQuery.data;
  const summary = dashboard?.summary ?? {
    activeBids: 0,
    wonAuctions: 0,
    sellingLive: 0,
    unreadNotifications: 0,
  };
  const myBids = dashboard?.myBids ?? [];
  const latestMyBids = myBids.slice(0, 2);
  const watchlist = dashboard?.watchlist ?? [];
  const imageName = useMemo(() => imageFile?.name ?? null, [imageFile]);

  function applyFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function removeImage() {
    setImageFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function submitAuction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateAuction) return;
    if (!imageFile || isSubmitting || !resolvedCategory || !durationHours)
      return;
    if (
      requiresConditionAge &&
      (parsedConditionAge === null ||
        !Number.isFinite(parsedConditionAge) ||
        parsedConditionAge < 0)
    )
      return;
    setIsSubmitting(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", imageFile);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: uploadForm,
      });
      const uploadJson = (await uploadRes.json()) as { fileId?: string };
      if (!uploadRes.ok || !uploadJson.fileId) throw new Error("Upload failed");
      const createRes = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: resolvedCategory,
          condition,
          conditionAgeDays: requiresConditionAge
            ? parsedConditionAge
            : undefined,
          startPrice: Number(startPrice),
          bidIncrement: Number(bidIncrement),
          durationHours,
          fileId: uploadJson.fileId,
        }),
      });
      const createJson = (await createRes.json()) as { auctionId?: string };
      if (createRes.ok) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboardData(),
          }),
          queryClient.invalidateQueries({ queryKey: queryKeys.myAuctions() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.liveAuctions() }),
        ]);
        router.push(`/auctions/${createJson.auctionId}`);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8 space-y-8">
        {/* ── Page header ── */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your auctions, track bids, and monitor activity.
            </p>
          </div>

          {/* Profile chip */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                ID: {bidderId}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`ml-2 shrink-0 text-xs ${sellerBadgeClass}`}
            >
              {sellerBadgeLabel}
            </Badge>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Active Bids",
              value: summary.activeBids,
              icon: ClipboardList,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              label: "Won Auctions",
              value: summary.wonAuctions,
              icon: CircleCheckBig,
              color: "text-green-600 dark:text-green-400",
              bg: "bg-green-500/10",
            },
            {
              label: "Selling Live",
              value: summary.sellingLive,
              icon: Zap,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Unread Alerts",
              value: summary.unreadNotifications,
              icon: Bell,
              color: "text-yellow-600 dark:text-yellow-400",
              bg: "bg-yellow-500/10",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom grid: Create Auction (full width) + Bids + Watchlist ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Create Auction ── */}
          <div
            id="new"
            className="scroll-mt-20 rounded-xl border border-border bg-card overflow-hidden lg:col-span-2"
          >
            <SectionHeader
              icon={PlusCircle}
              title="Create New Auction"
              description="List an item and start receiving bids immediately"
            />

            {/* KYC warning */}
            {!canCreateAuction && (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Complete KYC approval before publishing auctions.{" "}
                  <Link href="/kyc" className="font-semibold underline">
                    Go to KYC →
                  </Link>
                </p>
              </div>
            )}

            <form onSubmit={submitAuction} className="p-5">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left: form fields (2/3) */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Row 1: title + category */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Product Name" htmlFor="title">
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. iPhone 15 Pro — Titanium"
                        required
                        minLength={4}
                        className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                      />
                    </Field>

                    <Field label="Category">
                      <div
                        className={`grid gap-2 ${categoryOption === "other" ? "grid-cols-2" : "grid-cols-1"}`}
                      >
                        <Select
                          value={categoryOption}
                          onValueChange={(v) => {
                            setCategoryOption(v as CategoryOption);
                            if (v !== "other") setCustomCategory("");
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-background border-border focus:ring-primary/50">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item === "other"
                                  ? "Other"
                                  : item
                                      .replaceAll("_", " ")
                                      .replace(/\b\w/g, (x) => x.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {categoryOption === "other" && (
                          <Input
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Custom category"
                            required
                            className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                          />
                        )}
                      </div>
                      {/* hidden required validator */}
                      <input
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
                        readOnly
                        required
                        value={
                          categoryOption === "other"
                            ? customCategory.trim()
                            : categoryOption
                        }
                      />
                    </Field>
                  </div>

                  {/* Row 2: description */}
                  <Field label="Item Description" htmlFor="desc">
                    <Textarea
                      id="desc"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe condition, included accessories, known defects…"
                      required
                      className="rounded-xl bg-background border-border focus-visible:ring-primary/50 resize-none"
                    />
                  </Field>

                  {/* Row 3: condition + duration */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Condition">
                      <div
                        className={`grid gap-2 ${condition === "new" || condition === "like_new" ? "grid-cols-2" : "grid-cols-1"}`}
                      >
                        <Select
                          value={condition}
                          onValueChange={(v) => {
                            setCondition(v as Condition);
                            if (v !== "new" && v !== "like_new")
                              setConditionAgeDays("");
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-background border-border focus:ring-primary/50">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item
                                  .replaceAll("_", " ")
                                  .replace(/\b\w/g, (x) => x.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(condition === "new" || condition === "like_new") && (
                          <Input
                            type="number"
                            min={0}
                            value={conditionAgeDays}
                            onChange={(e) =>
                              setConditionAgeDays(e.target.value)
                            }
                            placeholder="Days used"
                            required
                            className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                          />
                        )}
                      </div>
                    </Field>

                    <Field label="Auction Duration">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={durationValue}
                          onChange={(e) => setDurationValue(e.target.value)}
                          placeholder="24"
                          required
                          className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                        />
                        <Select
                          value={durationUnit}
                          onValueChange={(v) =>
                            setDurationUnit(v as DurationUnit)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-background border-border focus:ring-primary/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u.replace(/\b\w/g, (x) => x.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </Field>
                  </div>

                  {/* Row 4: pricing */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Starting Price (NPR)" htmlFor="startPrice">
                      <Input
                        id="startPrice"
                        type="number"
                        min={1}
                        value={startPrice}
                        onChange={(e) => setStartPrice(e.target.value)}
                        required
                        className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                      />
                    </Field>
                    <Field label="Bid Increment (NPR)" htmlFor="bidIncrement">
                      <Input
                        id="bidIncrement"
                        type="number"
                        min={1}
                        value={bidIncrement}
                        onChange={(e) => setBidIncrement(e.target.value)}
                        required
                        className="h-11 rounded-xl bg-background border-border focus-visible:ring-primary/50"
                      />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          AI Predicted Market Value
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          OpenAI estimates the market value from the details
                          entered in this form.
                        </p>
                      </div>
                      {isValuationLoading && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Calculating
                        </span>
                      )}
                    </div>

                    {valuation ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-border bg-background p-3">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Market Value
                            </p>
                            <p className="mt-1 text-lg font-bold text-foreground">
                              {currency.format(valuation.estimatedMarketValue)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-3">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Suggested Start
                            </p>
                            <p className="mt-1 text-lg font-bold text-foreground">
                              {currency.format(valuation.suggestedStartPrice)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-3">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Suggested Increment
                            </p>
                            <p className="mt-1 text-lg font-bold text-foreground">
                              {currency.format(valuation.suggestedBidIncrement)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            Confidence: {valuation.confidence}
                          </Badge>
                          <Badge variant="outline">
                            {valuation.valuationSource === "openai"
                              ? "OpenAI"
                              : "Fallback"}
                          </Badge>
                          <span>
                            Score {Math.round(valuation.confidenceScore * 100)}%
                          </span>
                          <span className="font-mono">
                            Ref {valuation.deterministicFingerprint}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Signals used: {valuation.reasonCodes.join(" • ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Debug: {valuation.valuationDebug}
                        </p>
                      </div>
                    ) : valuationError ? (
                      <p className="mt-4 text-sm text-destructive">
                        {valuationError}
                      </p>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Fill in the form to generate a price estimate.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: image upload (1/3) */}
                <div className="lg:col-span-1 flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Gallery Image
                  </p>

                  {!previewUrl ? (
                    <label
                      className={`flex flex-col items-center justify-center w-full flex-1 min-h-[280px] border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/5"}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        applyFile(e.dataTransfer.files?.[0]);
                      }}
                    >
                      <div className="flex flex-col items-center gap-2 p-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Drop image here
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            JPG, PNG, WebP
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => applyFile(e.target.files?.[0] || null)}
                        required={!imageFile}
                      />
                    </label>
                  ) : (
                    <div className="relative group w-full flex-1 min-h-[280px] rounded-xl border border-border bg-muted/20 overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-opacity opacity-80 hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {imageName && (
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                      <Package className="h-3 w-3 shrink-0" />
                      {imageName}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit bar */}
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
                <p className="text-xs text-muted-foreground max-w-xs hidden sm:block">
                  Compare your starting price with the predicted market value
                  before publishing.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting || !canCreateAuction}
                  className="ml-auto h-11 px-10 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing…
                    </span>
                  ) : (
                    "Publish Auction →"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* ── My Bids ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <SectionHeader
              icon={HandCoins}
              title="My Bids"
              description="Latest 2 bids from your activity"
              action={
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                >
                  <Link href="/my-bids">View All</Link>
                </Button>
              }
            />
            <div className="p-5">
              {latestMyBids.length === 0 ? (
                <EmptyState icon={ClipboardList} label="No bids yet" />
              ) : (
                <div className="space-y-3">
                  {latestMyBids.map((item, index) => (
                    <div key={item.auctionId + index}>
                      <div className="rounded-xl border border-border bg-background p-4 space-y-3 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">
                            {item.title}
                          </p>
                          <BidStateBadge state={item.bidState} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          <Separator orientation="vertical" className="h-3" />
                          <span className="text-xs text-muted-foreground">
                            My bid:{" "}
                            <span className="font-semibold text-foreground">
                              {currency.format(item.myBid)}
                            </span>
                          </span>
                          <Separator orientation="vertical" className="h-3" />
                          <span className="text-xs text-muted-foreground">
                            Current:{" "}
                            <span className="font-semibold text-foreground">
                              {currency.format(item.currentPrice)}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.status === "ended" ||
                          item.status === "cancelled"
                            ? "Ended "
                            : "Ends "}
                          {item.endsAt
                            ? dateTime.format(new Date(item.endsAt))
                            : "Unknown"}
                        </p>
                      </div>
                      {index < latestMyBids.length - 1 && (
                        <div className="h-3" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Watchlist ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <SectionHeader
              icon={Eye}
              title="Watchlist"
              description="Auctions you are monitoring"
              action={
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                >
                  <Link href="/watchlist">Manage</Link>
                </Button>
              }
            />
            <div className="p-5">
              {watchlist.length === 0 ? (
                <EmptyState icon={Heart} label="No items in watchlist" />
              ) : (
                <div className="space-y-3">
                  {watchlist.map((item, index) => (
                    <div key={item.watchlistId}>
                      <div className="rounded-xl border border-border bg-background p-4 space-y-3 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">
                            {item.title}
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Current:{" "}
                            <span className="font-semibold text-foreground">
                              {currency.format(item.currentPrice)}
                            </span>
                          </span>
                          <Separator orientation="vertical" className="h-3" />
                          <span className="text-xs text-muted-foreground">
                            Ends{" "}
                            {item.endsAt
                              ? dateTime.format(new Date(item.endsAt))
                              : "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Added{" "}
                            {item.addedAt
                              ? dateTime.format(new Date(item.addedAt))
                              : "recently"}
                          </p>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                          >
                            <Link href={`/auctions/${item.auctionId}`}>
                              View <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                      {index < watchlist.length - 1 && <div className="h-3" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
