"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Star } from "lucide-react";
import { StarRating } from "@/components/reviews/star-rating";
import { queryKeys } from "@/lib/query-keys";

type ReviewItem = {
  id: string;
  auctionId: string;
  auctionTitle: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string | Date | null;
};

type SellerRatingSummary = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
};

async function fetchSellerReviews(sellerId: string): Promise<{
  reviews: ReviewItem[];
  summary: SellerRatingSummary;
}> {
  const res = await fetch(`/api/reviews/seller/${encodeURIComponent(sellerId)}`);
  const json = (await res.json()) as {
    ok?: boolean;
    reviews?: ReviewItem[];
    summary?: SellerRatingSummary;
  };
  if (!res.ok || !json.ok)
    return { reviews: [], summary: { averageRating: 0, totalReviews: 0, distribution: {} } };
  return {
    reviews: json.reviews ?? [],
    summary: json.summary ?? { averageRating: 0, totalReviews: 0, distribution: {} },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

interface SellerReviewsProps {
  sellerId: string;
  sellerName: string;
}

export function SellerReviews({ sellerId, sellerName }: SellerReviewsProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sellerReviews(sellerId),
    queryFn: () => fetchSellerReviews(sellerId),
  });

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="p-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Star className="h-4 w-4 fill-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Seller Reviews</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary && summary.totalReviews > 0
              ? `${summary.averageRating} avg · ${summary.totalReviews} ${summary.totalReviews === 1 ? "review" : "reviews"}`
              : `No reviews yet for ${sellerName}`}
          </p>
        </div>
        {summary && summary.totalReviews > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <StarRating value={Math.round(summary.averageRating)} size="sm" />
          </div>
        )}
      </div>

      <div className="p-5">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground/40">
            <MessageSquare className="h-7 w-7" />
            <p className="text-sm italic">Be the first to review this seller.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary && summary.totalReviews >= 3 && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-bold text-foreground leading-none">
                    {summary.averageRating}
                  </p>
                  <div className="pb-0.5 space-y-1">
                    <StarRating value={Math.round(summary.averageRating)} size="sm" />
                    <p className="text-xs text-muted-foreground">{summary.totalReviews} reviews</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const count = summary.distribution[star] ?? 0;
                    const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-3 text-right">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-background p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{review.reviewerName}</p>
                    <p className="text-xs text-muted-foreground">{review.auctionTitle}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-0.5">
                    <StarRating value={review.rating} size="sm" />
                    <p className="text-xs text-muted-foreground">
                      {review.createdAt ? dateFormat.format(new Date(review.createdAt)) : ""}
                    </p>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
