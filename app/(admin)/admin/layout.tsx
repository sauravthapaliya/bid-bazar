import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRecord, isAdmin } from "@/lib/user-auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/kyc");
  }

  const user = await getCurrentUserRecord();
  if (!user || !isAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm text-muted-foreground">Admin Console</p>
            <h1 className="text-lg font-semibold">KYC Review</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Back to app</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/kyc">KYC Queue</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
