"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VerifyResponse = {
  status?: string;
  message?: string;
  details?: string;
};

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying payment...");
  const [isSuccess, setIsSuccess] = useState(false);
  const method = params.get("method") || "payment";

  const query = useMemo(() => new URLSearchParams(Array.from(params.entries())).toString(), [params]);

  useEffect(() => {
    let ignore = false;

    async function verify() {
      try {
        const res = await fetch(`/api/checkout-session?${query}`, {
          method: "GET",
        });
        const json = (await res.json()) as VerifyResponse;
        if (ignore) return;

        const ok = res.ok && json.status === "success";
        setIsSuccess(ok);
        setMessage(json.message || (ok ? "Payment verified successfully." : "Payment verification failed."));
      } catch {
        if (!ignore) {
          setIsSuccess(false);
          setMessage("Payment verification failed.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    verify();
    return () => {
      ignore = true;
    };
  }, [query]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <Card className="overflow-hidden border shadow-sm">
          <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {loading ? (
                  <Clock3 className="h-7 w-7 text-muted-foreground" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                ) : (
                  <XCircle className="h-7 w-7 text-destructive" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {loading ? "Verifying Payment" : isSuccess ? "Payment Successful" : "Payment Issue"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {method.toUpperCase()} gateway response
                  </p>
                </div>
              </div>
              <Badge variant={isSuccess ? "bidWon" : "neutral"}>
                {loading ? "Processing" : isSuccess ? "Verified" : "Action needed"}
              </Badge>
            </div>
          </div>

          <CardHeader>
            <CardTitle className="text-base font-semibold">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-foreground">{message}</p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              Payment is verified server-side against the gateway before status is finalized.
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/payments">Go to My Payments</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auctions">Back to Auctions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
