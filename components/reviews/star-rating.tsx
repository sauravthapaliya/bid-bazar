"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  max?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" };

export function StarRating({
  value,
  max = 5,
  interactive = false,
  onChange,
  size = "md",
}: StarRatingProps) {
  const iconClass = SIZE_MAP[size];

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= value;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={interactive ? "cursor-pointer transition-transform hover:scale-110 focus:outline-none" : "cursor-default"}
            aria-label={interactive ? `Rate ${i + 1} out of ${max}` : undefined}
          >
            <Star
              className={`${iconClass} transition-colors ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
