import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentFailedPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-xl p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The payment was cancelled or failed. You can retry from the payment page.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/payments/esewa">Retry eSewa</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/payments/khalti">Retry Khalti</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
