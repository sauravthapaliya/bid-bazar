"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, CreditCard, Loader2, ReceiptText, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodButton } from "@/components/payments/payment-method-button";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/query-keys";

type PaymentItem = {
  auctionId: string;
  title: string;
  imageUrl: string | null;
  amount: number;
  currency: string;
  auctionEndedAt: string | null;
  transactionId: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "authorized" | "refunded" | "unknown";
  provider: "esewa" | "khalti" | null;
  paidAt: string | null;
};

async function fetchMyPayments(): Promise<PaymentItem[]> {
  const res = await fetch("/api/payments/mine");
  const json = (await res.json()) as { ok?: boolean; items?: PaymentItem[]; message?: string };
  if (!res.ok || !json.ok || !json.items) {
    throw new Error(json.message ?? "Unable to load your payments.");
  }
  return json.items;
}

async function createOrGetTransaction(auctionId: string): Promise<{ transactionId: string; amount: number }> {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auctionId }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    message?: string;
    transactionId?: string;
    amount?: number;
  };

  if (!res.ok || !json.ok || !json.transactionId || typeof json.amount !== "number") {
    throw new Error(json.message ?? "Unable to prepare transaction.");
  }
  return { transactionId: json.transactionId, amount: json.amount };
}

function paymentBadgeVariant(status: PaymentItem["paymentStatus"]) {
  if (status === "paid") return "bidWon" as const;
  if (status === "pending" || status === "authorized") return "bidWinning" as const;
  if (status === "failed") return "bidOutbid" as const;
  if (status === "refunded") return "bidCancelled" as const;
  return "neutral" as const;
}

export default function MyPaymentsPage() {
  const router = useRouter();
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const paymentsQuery = useQuery({
    queryKey: queryKeys.myPayments(),
    queryFn: fetchMyPayments,
  });

  const items = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const summary = useMemo(() => {
    const pending = items.filter((item) => item.paymentStatus === "pending" || item.paymentStatus === "authorized").length;
    const paid = items.filter((item) => item.paymentStatus === "paid").length;
    const totalDue = items
      .filter((item) => item.paymentStatus === "pending" || item.paymentStatus === "authorized")
      .reduce((sum, item) => sum + item.amount, 0);
    return {
      total: items.length,
      pending,
      paid,
      totalDue,
    };
  }, [items]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  async function proceedToGateway(item: PaymentItem, method: "esewa" | "khalti") {
    try {
      setActionError(null);
      setActiveAuctionId(item.auctionId);
      const tx =
        item.transactionId && item.paymentStatus !== "unknown"
          ? { transactionId: item.transactionId, amount: item.amount }
          : await createOrGetTransaction(item.auctionId);
      const query = new URLSearchParams({
        transactionId: tx.transactionId,
        amount: String(tx.amount),
        productName: item.title,
      });
      router.push(`/payments/${method}?${query.toString()}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to proceed to payment.");
    } finally {
      setActiveAuctionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background scroll-mt-20">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Payments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete payments for won auctions and track paid transactions.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/my-bids">View My Bids</Link>
          </Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Won Auctions", value: summary.total, icon: ReceiptText },
            { label: "Pending Payments", value: summary.pending, icon: Clock3 },
            { label: "Paid", value: summary.paid, icon: CheckCircle2 },
            { label: "Total Due", value: money.format(summary.totalDue), icon: Wallet },
          ].map((item) => (
            <Card key={item.label} className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {actionError ? (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">{actionError}</CardContent>
          </Card>
        ) : null}

        {paymentsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading payment records...
          </div>
        ) : paymentsQuery.error ? (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-destructive">
              {paymentsQuery.error instanceof Error
                ? paymentsQuery.error.message
                : "Unable to load payments."}
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              No won auctions yet. Win an auction and payments will appear here.
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Payment Queue</CardTitle>
              <CardDescription>Pay pending wins directly from this page.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {items.map((item, index) => {
                  const isPending = item.paymentStatus === "pending" || item.paymentStatus === "authorized";
                  const isBusy = activeAuctionId === item.auctionId;
                  return (
                    <div key={item.auctionId}>
                      <div className="rounded-xl border bg-card p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-foreground">{item.title}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={paymentBadgeVariant(item.paymentStatus)}>
                                  {item.paymentStatus}
                                </Badge>
                                <Badge variant="neutral">{money.format(item.amount)}</Badge>
                                {item.provider ? <Badge variant="outline">via {item.provider}</Badge> : null}
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Auction ended:{" "}
                                {item.auctionEndedAt ? dateTime.format(new Date(item.auctionEndedAt)) : "Unknown"}
                              </p>
                              {item.paidAt ? (
                                <p className="text-xs text-muted-foreground">
                                  Paid at: {dateTime.format(new Date(item.paidAt))}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/auctions/${item.auctionId}`}>Auction</Link>
                            </Button>
                            {isPending ? (
                              <>
                                <PaymentMethodButton
                                  method="esewa"
                                  size="sm"
                                  disabled={isBusy}
                                  loading={isBusy}
                                  loadingText="Opening..."
                                  onClick={() => proceedToGateway(item, "esewa")}
                                />
                                <PaymentMethodButton
                                  method="khalti"
                                  size="sm"
                                  disabled={isBusy}
                                  emphasis="soft"
                                  onClick={() => proceedToGateway(item, "khalti")}
                                />
                              </>
                            ) : (
                              <Button size="sm" variant="secondary" disabled>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Payment Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < items.length - 1 ? <Separator className="my-4" /> : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
