"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EsewaApiResponse = {
  method: "esewa";
  formUrl: string;
  esewaConfig: Record<string, string>;
};

export default function EsewaPaymentPage() {
  const params = useSearchParams();
  const [amount, setAmount] = useState(params.get("amount") || "100");
  const [productName, setProductName] = useState(params.get("productName") || "Auction Payment");
  const [transactionId, setTransactionId] = useState(params.get("transactionId") || "");
  const [auctionId, setAuctionId] = useState(params.get("auctionId") || "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      let effectiveTransactionId = transactionId;
      if (!effectiveTransactionId && auctionId) {
        const txRes = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auctionId }),
        });
        const txJson = (await txRes.json()) as {
          ok?: boolean;
          message?: string;
          transactionId?: string;
          amount?: number;
        };
        if (!txRes.ok || !txJson.ok || !txJson.transactionId) {
          throw new Error(txJson.message || "Unable to prepare transaction.");
        }
        effectiveTransactionId = txJson.transactionId;
        setTransactionId(txJson.transactionId);
        if (typeof txJson.amount === "number") {
          setAmount(String(txJson.amount));
        }
      }

      if (!effectiveTransactionId) {
        throw new Error("Missing transaction ID.");
      }

      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "esewa",
          amount,
          productName,
          transactionId: effectiveTransactionId,
        }),
      });

      const json = (await res.json()) as EsewaApiResponse | { error?: string; details?: string };
      if (!res.ok || !("esewaConfig" in json)) {
        const message = "error" in json && json.error ? json.error : "Payment initiation failed";
        throw new Error(message);
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = json.formUrl;

      for (const [key, value] of Object.entries(json.esewaConfig)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start eSewa payment";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-xl p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Pay with eSewa</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Mongo ObjectId from transactions collection"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auctionId">Auction ID (optional)</Label>
              <Input
                id="auctionId"
                value={auctionId}
                onChange={(e) => setAuctionId(e.target.value)}
                placeholder="Used to auto-create transaction when empty above"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NPR)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Continue to eSewa"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
