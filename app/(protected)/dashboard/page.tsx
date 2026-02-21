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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";

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

async function fetchDashboardData(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard/data");
  const json = (await res.json()) as {
    ok?: boolean;
    data?: DashboardResponse;
    message?: string;
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.message ?? "Unable to load dashboard data.");
  }
  return json.data;
}

const CONDITIONS = ["new", "like_new", "excellent", "good", "fair", "poor"] as const;
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

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

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

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboardData(),
    queryFn: fetchDashboardData,
  });

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
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

  const imageName = useMemo(() => imageFile?.name ?? "No file selected", [imageFile]);
  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "Unknown";
  const bidderId = session?.user?.id ? String(session.user.id) : "Unavailable";
  const canCreateAuction =
    session?.user?.role === "admin" || session?.user?.isSellerVerified === true;
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "U";

  const dashboard = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  const summary = dashboard?.summary ?? {
    activeBids: 0,
    wonAuctions: 0,
    sellingLive: 0,
    unreadNotifications: 0,
  };
  const myBids = dashboard?.myBids ?? [];
  const latestMyBids = myBids.slice(0, 2);
  const watchlist = dashboard?.watchlist ?? [];

  const statusVariant = (
    status: string,
  ): "statusLive" | "statusScheduled" | "statusExpired" | "statusEnded" | "statusCancelled" | "neutral" => {
    if (status === "live") return "statusLive";
    if (status === "scheduled") return "statusScheduled";
    if (status === "expired") return "statusExpired";
    if (status === "ended") return "statusEnded";
    if (status === "cancelled") return "statusCancelled";
    return "neutral";
  };
  const bidStateVariant = (
    bidState: BidRow["bidState"],
  ): "bidWinning" | "bidOutbid" | "bidWon" | "bidLost" | "bidCancelled" => {
    if (bidState === "winning") return "bidWinning";
    if (bidState === "outbid") return "bidOutbid";
    if (bidState === "won") return "bidWon";
    if (bidState === "lost") return "bidLost";
    return "bidCancelled";
  };
  const bidStateLabel = (bidState: BidRow["bidState"]) => {
    if (bidState === "winning") return "Winning";
    if (bidState === "outbid") return "Outbid";
    if (bidState === "won") return "Won";
    if (bidState === "lost") return "Lost";
    return "Cancelled";
  };

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
    const resolvedCategory =
      categoryOption === "other" ? customCategory.trim() : categoryOption.trim();
    const parsedDurationValue = Number(durationValue);
    const durationHours = (() => {
      if (!Number.isFinite(parsedDurationValue) || parsedDurationValue <= 0) return 0;
      if (durationUnit === "minutes") return Math.max(1, Math.ceil(parsedDurationValue / 60));
      if (durationUnit === "days") return Math.round(parsedDurationValue * 24);
      if (durationUnit === "months") return Math.round(parsedDurationValue * 24 * 30);
      return Math.round(parsedDurationValue);
    })();
    const requiresConditionAge = condition === "new" || condition === "like_new";
    const parsedConditionAge = requiresConditionAge ? Number(conditionAgeDays) : null;
    if (!imageFile || isSubmitting || !resolvedCategory) return;
    if (!durationHours) return;
    if (
      requiresConditionAge &&
      (parsedConditionAge === null || !Number.isFinite(parsedConditionAge) || parsedConditionAge < 0)
    ) return;
    setIsSubmitting(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", imageFile);
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: uploadForm });
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
          conditionAgeDays: requiresConditionAge ? parsedConditionAge : undefined,
          startPrice: Number(startPrice),
          bidIncrement: Number(bidIncrement),
          durationHours,
          fileId: uploadJson.fileId,
        }),
      });
      const createJson = (await createRes.json()) as { auctionId?: string };
      if (createRes.ok) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData() }),
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
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        {/* Profile/Header Section */}
        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-base text-muted-foreground">
              Manage your auctions, track bids, and monitor your activity
            </p>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-base font-semibold text-foreground">
                    {name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {email}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    Bidder ID: {bidderId}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {isLoading ? "Loading..." : "Active"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Active Bids",
              val: summary.activeBids,
              icon: ClipboardList,
            },
            {
              label: "Won Auctions",
              val: summary.wonAuctions,
              icon: CircleCheckBig,
            },
            { label: "Selling Live", val: summary.sellingLive, icon: Zap },
            {
              label: "Unread Alerts",
              val: summary.unreadNotifications,
              icon: Bell,
            },
          ].map((stat, i) => (
            <Card
              key={i}
              className="border shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {stat.val}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* REFACTORED CREATE AUCTION SECTION */}
          <Card
            id="new"
            className="border shadow-sm lg:col-span-2 overflow-hidden scroll-mt-20"
          >
            <CardHeader className="border-b pb-5 bg-muted/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl font-semibold">
                    Create New Auction
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!canCreateAuction ? (
                <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                  Complete KYC approval before publishing auctions.{" "}
                  <Link href="/kyc" className="font-semibold underline">
                    Go to Complete KYC
                  </Link>
                </div>
              ) : null}
              <form onSubmit={submitAuction} className="flex flex-col gap-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* LEFT COLUMN: 2/3 Width (Details) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* SIDE BY SIDE: Headline & Category */}
                      <div className="space-y-2">
                        <Label htmlFor="title">Product Name</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., iPhone 15 Pro - Titanium"
                          required
                          minLength={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <div
                          className={`grid gap-3 ${categoryOption === "other" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
                        >
                          <Select
                            value={categoryOption}
                            onValueChange={(value) => {
                              setCategoryOption(value as CategoryOption);
                              if (value !== "other") setCustomCategory("");
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item === "other"
                                    ? "Other"
                                    : item
                                        .replaceAll("_", " ")
                                        .replace(/\b\w/g, (x) =>
                                          x.toUpperCase(),
                                        )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {categoryOption === "other" ? (
                            <Input
                              value={customCategory}
                              onChange={(e) =>
                                setCustomCategory(e.target.value)
                              }
                              placeholder="Type your category"
                              required
                            />
                          ) : null}
                        </div>
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
                      </div>

                      {/* FULL WIDTH: Description */}
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="desc">Item Description</Label>
                        <textarea
                          id="desc"
                          rows={4}
                          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Provide details about condition, accessories, and any defects..."
                          required
                        />
                      </div>

                      {/* SIDE BY SIDE: Condition & Duration */}
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <div
                          className={`grid gap-3 ${condition === "new" || condition === "like_new" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
                        >
                          <Select
                            value={condition}
                            onValueChange={(value) => {
                              const nextCondition = value as Condition;
                              setCondition(nextCondition);
                              if (
                                nextCondition !== "new" &&
                                nextCondition !== "like_new"
                              ) {
                                setConditionAgeDays("");
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
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
                          {condition === "new" || condition === "like_new" ? (
                            <Input
                              type="number"
                              min={0}
                              value={conditionAgeDays}
                              onChange={(e) =>
                                setConditionAgeDays(e.target.value)
                              }
                              placeholder="Days used"
                              required
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Auction Duration</Label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            type="number"
                            min={1}
                            value={durationValue}
                            onChange={(e) => setDurationValue(e.target.value)}
                            placeholder="24"
                            required
                          />
                          <Select
                            value={durationUnit}
                            onValueChange={(value) =>
                              setDurationUnit(value as DurationUnit)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit.replace(/\b\w/g, (x) =>
                                    x.toUpperCase(),
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* SIDE BY SIDE: Pricing */}
                      <div className="space-y-2">
                        <Label>Starting Price (NPR)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={startPrice}
                          onChange={(e) => setStartPrice(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bid Increment (NPR)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={bidIncrement}
                          onChange={(e) => setBidIncrement(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: 1/3 Width (Image Upload) */}
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <Label className="font-semibold">Gallery Image</Label>
                    {!previewUrl ? (
                      <label
                        className={`flex flex-col items-center justify-center w-full h-[320px] border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/10 hover:bg-muted/20"}`}
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
                        <div className="p-4 text-center">
                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">
                            Upload Item Photo
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            JPG, PNG or WebP
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            applyFile(e.target.files?.[0] || null)
                          }
                          required={!imageFile}
                        />
                      </label>
                    ) : (
                      <div className="relative group w-full h-[320px] rounded-xl border bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-sm">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground italic truncate">
                      File: {imageName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t">
                  <p className="text-xs text-muted-foreground">
                    Double-check your pricing and duration before publishing.
                  </p>
                    <Button
                      type="submit"
                      size="lg"
                      className="px-12 font-bold shadow-md"
                      disabled={isSubmitting || !canCreateAuction}
                    >
                    {isSubmitting ? "Publishing..." : "Publish Auction"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* My Bids Section (Original Design) */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold">
                    My Bids
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    Latest 2 bids from your activity
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/my-bids">Browse All Bidding</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {latestMyBids.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm italic">No bids yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {latestMyBids.map((item, index) => (
                    <div key={item.auctionId + index}>
                      <div className="flex flex-col gap-3 rounded-lg border p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="truncate text-sm font-semibold">
                            {item.title}
                          </h4>
                          <Badge variant={bidStateVariant(item.bidState)}>
                            {bidStateLabel(item.bidState)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                          <Badge variant={statusVariant(item.status)}>
                            {item.status}
                          </Badge>
                          <span>
                            My Bid:{" "}
                            <span className="text-foreground font-medium">
                              {currency.format(item.myBid)}
                            </span>
                          </span>
                          <span>
                            Current:{" "}
                            <span className="text-foreground font-medium">
                              {currency.format(item.currentPrice)}
                            </span>
                          </span>
                          <span>
                            {item.status === "ended" || item.status === "cancelled"
                              ? "Ended "
                              : "Ends "}
                            {item.endsAt
                              ? dateTime.format(new Date(item.endsAt))
                              : "Unknown"}
                          </span>
                        </div>
                      </div>
                      {index < latestMyBids.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watchlist Section (Original Design) */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Eye className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold">
                    Watchlist
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    Auctions you are monitoring
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/watchlist">Manage Watchlist</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Heart className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm italic">No items in watchlist</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {watchlist.map((item, index) => (
                    <div key={item.watchlistId}>
                      <div className="flex flex-col gap-3 rounded-lg border p-4 hover:shadow-sm transition-shadow bg-gradient-to-r from-background via-background to-primary/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="truncate text-sm font-semibold">
                            {item.title}
                          </h4>
                          <Badge variant={statusVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                          <span>
                            Current:{" "}
                            <span className="text-foreground font-medium">
                              {currency.format(item.currentPrice)}
                            </span>
                          </span>
                          <span>
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
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <Link href={`/auctions/${item.auctionId}`}>
                              View
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                      {index < watchlist.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

