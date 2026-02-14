import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProtectedNavbar from "@/app/(protected)/protected-navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const userName = session.user.name ?? session.user.email ?? "Account";
  const userEmail = session.user.email ?? null;
  const userImage = session.user.image ?? null;

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
      />
      <main className="pb-8">{children}</main>
    </div>
  );
}
