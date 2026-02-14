import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        neutral:
          "border-slate-300/70 bg-slate-100 text-slate-800 [a&]:hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200",
        success:
          "border-emerald-300/70 bg-emerald-100 text-emerald-900 [a&]:hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200",
        warning:
          "border-amber-300/70 bg-amber-100 text-amber-900 [a&]:hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-900/30 dark:text-amber-200",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        statusLive:
          "border-emerald-300/70 bg-emerald-100 text-emerald-900 [a&]:hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200",
        statusScheduled:
          "border-sky-300/70 bg-sky-100 text-sky-900 [a&]:hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-900/30 dark:text-sky-200",
        statusExpired:
          "border-amber-300/70 bg-amber-100 text-amber-900 [a&]:hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-900/30 dark:text-amber-200",
        statusEnded:
          "border-indigo-300/70 bg-indigo-100 text-indigo-900 [a&]:hover:bg-indigo-100 dark:border-indigo-800/70 dark:bg-indigo-900/30 dark:text-indigo-200",
        statusCancelled:
          "border-rose-300/70 bg-rose-100 text-rose-900 [a&]:hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-900/30 dark:text-rose-200",
        bidWinning:
          "border-cyan-300/70 bg-cyan-100 text-cyan-900 [a&]:hover:bg-cyan-100 dark:border-cyan-800/70 dark:bg-cyan-900/30 dark:text-cyan-200",
        bidOutbid:
          "border-orange-300/70 bg-orange-100 text-orange-900 [a&]:hover:bg-orange-100 dark:border-orange-800/70 dark:bg-orange-900/30 dark:text-orange-200",
        bidWon:
          "border-emerald-300/70 bg-emerald-100 text-emerald-900 [a&]:hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200",
        bidLost:
          "border-red-300/70 bg-red-100 text-red-900 [a&]:hover:bg-red-100 dark:border-red-800/70 dark:bg-red-900/30 dark:text-red-200",
        bidCancelled:
          "border-rose-300/70 bg-rose-100 text-rose-900 [a&]:hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-900/30 dark:text-rose-200",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
