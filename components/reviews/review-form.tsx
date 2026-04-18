"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { StarRating } from "@/components/reviews/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";

interface ReviewFormProps {
  auctionId: string;
  sellerId: string;
  sellerName: string;
}

export function ReviewForm({ auctionId, sellerId, sellerName }: ReviewFormProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId, rating, comment: comment.trim() || undefined }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Unable to submit review.");
        return;
      }
      setSubmitted(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionReview(auctionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerReviews(sellerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerProfile(sellerId) }),
      ]);
    } catch {
      setError("Unable to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/8 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
        <p className="text-xs font-medium text-green-700 dark:text-green-400">
          Your review has been submitted. Thank you!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your Rating
        </p>
        <div className="flex items-center gap-3">
          <StarRating value={rating} interactive onChange={setRating} size="lg" />
          {rating > 0 && (
            <span className="text-sm font-semibold text-foreground">
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Comment <span className="font-normal normal-case">(optional)</span>
        </p>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Share your experience with ${sellerName}…`}
          maxLength={1000}
          rows={3}
          className="rounded-xl resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full h-10 rounded-xl font-semibold gap-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Star className="h-4 w-4" />
            Submit Review
          </>
        )}
      </Button>
    </form>
  );
}
