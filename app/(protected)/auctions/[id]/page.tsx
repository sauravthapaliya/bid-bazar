import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { Clock3 } from "lucide-react";
import { auth } from "@/auth";
import { getAuctionDetail } from "@/lib/auction-market";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS } from "@/types/entities";
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

type Params = {
  params: Promise<{ id: string }>;
};

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
  return shouldShowAge ? `${base} • ${conditionAgeDays} days used` : base;
}

export default async function AuctionDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const auction = await getAuctionDetail(id, session?.user?.id ?? null);

  if (!auction) notFound();

  const now = new Date();
  const endsAt = auction.endsAt;
  const hasExpired =
    (auction.status === "live" || auction.status === "scheduled") &&
    Boolean(endsAt && endsAt <= now);
  const effectiveStatus = hasExpired ? "expired" : auction.status;
  const isLive = auction.status === "live" && Boolean(endsAt && endsAt > now);
  const minimumAllowed = Math.round(
    auction.currentPrice + auction.bidIncrement,
  );

  const placeBidAction = async (formData: FormData) => {
    "use server";

    const currentSession = await auth();
    if (!currentSession?.user?.id) redirect("/login");

    const amount = Number(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const auctionIdCandidates: (ObjectId | string)[] = ObjectId.isValid(id)
      ? [new ObjectId(id), id]
      : [id];
    const auctionIdQuery =
      auctionIdCandidates.length === 1
        ? { _id: auctionIdCandidates[0] }
        : { $or: auctionIdCandidates.map((value) => ({ _id: value })) };

    const { db } = await connectToDatabase();
    const auctions = db.collection<Record<string, unknown>>(
      COLLECTIONS.auctions,
    );
    const bids = db.collection<Record<string, unknown>>(COLLECTIONS.bids);
    const auctionDoc = await auctions.findOne(auctionIdQuery as never);
    if (!auctionDoc) return;

    const sellerId = String(auctionDoc.sellerId);
    const bidderId = currentSession.user.id;
    if (sellerId === bidderId) return;

    const nowTime = new Date();
    const endsAtDoc = new Date(auctionDoc.endsAt as string | number | Date);
    if (
      auctionDoc.status !== "live" ||
      Number.isNaN(endsAtDoc.valueOf()) ||
      endsAtDoc <= nowTime
    ) {
      return;
    }

    const currentPrice =
      typeof auctionDoc.currentPrice === "number"
        ? auctionDoc.currentPrice
        : Number(auctionDoc.currentPrice ?? 0);
    const bidIncrement =
      typeof auctionDoc.bidIncrement === "number"
        ? auctionDoc.bidIncrement
        : Number(auctionDoc.bidIncrement ?? 0);
    const minimum = currentPrice + Math.max(1, bidIncrement);
    const roundedAmount = Math.round(amount);
    if (roundedAmount < minimum) return;

    const auctionIdForBid =
      auctionDoc._id instanceof ObjectId || typeof auctionDoc._id === "string"
        ? auctionDoc._id
        : String(auctionDoc._id);

    const insertResult = await bids.insertOne({
      auctionId: auctionIdForBid,
      bidderId,
      amount: roundedAmount,
      source: "manual",
      isWinning: true,
      createdAt: nowTime,
    });

    await bids.updateMany(
      {
        auctionId: auctionIdForBid,
        _id: { $ne: insertResult.insertedId },
      },
      { $set: { isWinning: false } },
    );

    await auctions.updateOne(
      { _id: auctionDoc._id } as never,
      {
        $set: {
          currentPrice: roundedAmount,
          highestBidderId: bidderId,
          updatedAt: nowTime,
        },
        $inc: { totalBids: 1 },
      } as never,
    );

    redirect(`/auctions/${id}`);
  };

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/auctions">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Auctions
            </Link>
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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left Column - Product Info & Bids */}
          <div className="space-y-6">
            {/* Product Card */}
            <Card className="overflow-hidden border shadow-sm">
              {/* Image Section */}
              <div className="relative aspect-video bg-muted">
                {auction.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={auction.imageUrl}
                    alt={auction.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    <svg
                      className="h-16 w-16 text-muted-foreground/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-3 text-sm text-muted-foreground">
                      No image uploaded
                    </p>
                  </div>
                )}

                {/* Status Badge Overlay */}
                <div className="absolute right-4 top-4">
                  <Badge
                    variant={
                      effectiveStatus === "live"
                        ? "success"
                        : effectiveStatus === "expired"
                          ? "warning"
                          : "secondary"
                    }
                    className="font-semibold shadow-sm backdrop-blur-sm"
                  >
                    {effectiveStatus}
                  </Badge>
                </div>
              </div>

              {/* Product Details */}
              <CardHeader className="space-y-4 pb-6">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {auction.title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base leading-relaxed">
                    {auction.description || "No description provided."}
                  </CardDescription>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="font-medium">
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {auction.category}
                  </Badge>
                  <Badge variant="outline" className="font-medium">
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {conditionLabel(
                      auction.condition,
                      auction.conditionAgeDays,
                    )}
                  </Badge>
                  <Badge variant="outline" className="font-medium">
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Seller: {auction.sellerName}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Bid History Card */}
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Bid History
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {auction.isOwnerView
                        ? "Full bidder details visible to you as the seller"
                        : "Bidder identities are protected"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {auction.bids.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <svg
                        className="h-8 w-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No bids yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Be the first to place a bid!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auction.bids.map((bid, index) => (
                      <div key={bid.id}>
                        <div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                #{auction.bids.length - index}
                              </div>
                              <div>
                                <p className="text-lg font-bold text-foreground">
                                  {money.format(bid.amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bid.bidderLabel}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">
                              {bid.createdAt
                                ? dateTime.format(bid.createdAt)
                                : "Unknown"}
                            </p>
                          </div>
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

          {/* Right Column - Sticky Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
            {/* Auction Status Card */}
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Auction Status
                  </CardTitle>
                  {hasExpired ? <Badge variant="warning">Expired</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* Current Price - Highlighted */}
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Price
                  </p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {money.format(auction.currentPrice)}
                  </p>
                </div>

                <Separator />

                {/* Price Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Starting Price
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {money.format(auction.startPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Minimum Next Bid
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {money.format(minimumAllowed)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Bid Increment
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {money.format(auction.bidIncrement)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Time & Bids */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Bids
                    </span>
                    <Badge variant="secondary" className="font-semibold">
                      {auction.totalBids}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Auction Ends
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {auction.endsAt
                        ? dateTime.format(auction.endsAt)
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Place Bid Card */}
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Place Your Bid
                </CardTitle>
                <CardDescription className="text-sm">
                  {isLive
                    ? "Enter your bid amount to participate"
                    : hasExpired
                      ? "This auction has expired."
                      : "This auction is not currently accepting bids"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!session?.user ? (
                  <div className="space-y-4 text-center">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted">
                      <svg
                        className="h-8 w-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Sign in to bid
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You need to be logged in to place bids
                      </p>
                    </div>
                    <Button asChild size="lg" className="w-full">
                      <Link href="/login">Sign In to Bid</Link>
                    </Button>
                  </div>
                ) : auction.isOwnerView ? (
                  <div className="space-y-3 rounded-lg border bg-muted/50 p-4 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-foreground">
                      You own this auction
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sellers cannot bid on their own items
                    </p>
                  </div>
                ) : isLive ? (
                  <form className="space-y-4" action={placeBidAction}>
                    <div className="space-y-2">
                      <Label
                        htmlFor="bid-amount"
                        className="text-sm font-medium"
                      >
                        Your Bid Amount (NPR)
                      </Label>
                      <Input
                        id="bid-amount"
                        type="number"
                        name="amount"
                        min={minimumAllowed}
                        step={1}
                        defaultValue={minimumAllowed}
                        required
                        className="text-lg font-semibold"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum bid: {money.format(minimumAllowed)}
                      </p>
                    </div>
                    <Button type="submit" size="lg" className="w-full">
                      <svg
                        className="mr-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Place Bid
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-3 rounded-lg border bg-muted/50 p-4 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-foreground">
                      Bidding is closed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This auction is no longer accepting bids
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
