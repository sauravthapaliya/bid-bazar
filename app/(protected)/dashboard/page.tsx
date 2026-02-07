import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignOutButton from "@/app/(protected)/dashboard/sign-out-button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DashboardPage = async () => {
  const session = await auth();

  if (!session?.user) redirect("/");

  const email = session.user.email ?? "Unknown";
  const name = session.user.name ?? "User";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "U";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Dashboard</CardTitle>
            <Badge variant="secondary">Logged in</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your account is active.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* User info */}
          <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background text-sm font-semibold">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {name}
              </p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          {/* Sign out */}
          <div className="flex justify-end">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default DashboardPage;
