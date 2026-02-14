import ProtectedNavbar from "@/app/(protected)/protected-navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="pb-8">{children}</main>
    </div>
  );
}
