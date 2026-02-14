import Link from "next/link";
import { getLiveAuctions } from "@/lib/auction-market";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export default async function AuctionsPage() {
  const auctions = await getLiveAuctions(30);

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        {/* Header Section */}
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
            <Link href="/dashboard">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Seller Dashboard
            </Link>
          </Button>
        </div>

        {auctions.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-10 w-10 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
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
                {/* Image Section */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {auction.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={auction.imageUrl}
                      alt={auction.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <svg
                        className="h-12 w-12 text-muted-foreground/50"
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        No image
                      </p>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <CardHeader className="pb-4">
                  <CardTitle className="line-clamp-1 text-lg font-semibold text-foreground">
                    {auction.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {auction.description || "No description available"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {auction.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {conditionLabel(
                        auction.condition,
                        auction.conditionAgeDays,
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {auction.totalBids}{" "}
                      {auction.totalBids === 1 ? "bid" : "bids"}
                    </Badge>
                  </div>

                  {/* Price and Time Info */}
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
                          ? dateTime.format(auction.endsAt)
                          : "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button asChild size="lg" className="mt-auto w-full">
                    <Link href={`/auctions/${auction.id}`}>
                      View Auction
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
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
