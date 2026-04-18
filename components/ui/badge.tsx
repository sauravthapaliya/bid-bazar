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
          "border-emerald-500 bg-emerald-500 text-white [a&]:hover:bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
        warning:
          "border-amber-500 bg-amber-500 text-white [a&]:hover:bg-amber-500 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        statusLive:
          "border-emerald-500 bg-emerald-500 text-white [a&]:hover:bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
        statusScheduled:
          "border-sky-500 bg-sky-500 text-white [a&]:hover:bg-sky-500 dark:border-sky-400 dark:bg-sky-400 dark:text-sky-950",
        statusExpired:
          "border-amber-500 bg-amber-500 text-white [a&]:hover:bg-amber-500 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950",
        statusEnded:
          "border-indigo-500 bg-indigo-500 text-white [a&]:hover:bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400 dark:text-indigo-950",
        statusCancelled:
          "border-rose-500 bg-rose-500 text-white [a&]:hover:bg-rose-500 dark:border-rose-400 dark:bg-rose-400 dark:text-rose-950",
        bidWinning:
          "border-cyan-500 bg-cyan-500 text-white [a&]:hover:bg-cyan-500 dark:border-cyan-400 dark:bg-cyan-400 dark:text-cyan-950",
        bidOutbid:
          "border-orange-500 bg-orange-500 text-white [a&]:hover:bg-orange-500 dark:border-orange-400 dark:bg-orange-400 dark:text-orange-950",
        bidWon:
          "border-emerald-500 bg-emerald-500 text-white [a&]:hover:bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
        bidLost:
          "border-red-500 bg-red-500 text-white [a&]:hover:bg-red-500 dark:border-red-400 dark:bg-red-400 dark:text-red-950",
        bidCancelled:
          "border-rose-500 bg-rose-500 text-white [a&]:hover:bg-rose-500 dark:border-rose-400 dark:bg-rose-400 dark:text-rose-950",
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
