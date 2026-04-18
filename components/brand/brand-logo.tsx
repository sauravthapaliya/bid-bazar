"use client";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  subtitle?: string | null;
  textClassName?: string;
  subtitleClassName?: string;
};

export function BrandLogo({
  className,
  subtitle = null,
  textClassName,
  subtitleClassName,
}: BrandLogoProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "text-2xl font-extrabold tracking-tighter text-foreground",
          textClassName
        )}
      >
        BID<span className="text-primary">BZAR</span>
      </p>
      {subtitle ? (
        <p
          className={cn(
            "mt-1 text-xs font-medium leading-none text-muted-foreground",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
