"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Gavel,
  GavelIcon,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  userName?: string;
  userEmail?: string | null;
  userImage?: string | null;
  userId?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-bids", label: "My Bids", icon: HandCoins },
  { href: "/my-auctions", label: "My Auctions", icon: ListChecks },
  { href: "/auctions", label: "Live Market", icon: GavelIcon },
];

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((v) => v[0]?.toUpperCase() ?? "").join("") || "U";
}

function maskBidderId(id: string) {
  if (id.length <= 6) return id;
  return `${id.slice(0, 3)}***${id.slice(-3)}`;
}

function UserMenu({
  userName,
  userEmail,
  userImage,
  userId,
  setLogoutConfirmOpen,
}: {
  userName: string;
  userEmail?: string | null;
  userImage?: string | null;
  userId?: string | null;
  setLogoutConfirmOpen: (open: boolean) => void;
}) {
  const initials = getInitials(userName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "group relative h-12 rounded-2xl border border-transparent bg-background/50 px-2 transition-all duration-300 hover:border-border/50 hover:bg-accent/70 hover:shadow-lg hover:shadow-black/5 sm:px-4",
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9 ring-2 ring-background shadow-md transition-all duration-300 group-hover:ring-primary/30">
                <AvatarImage src={userImage ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-primary/90 font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-32 truncate text-sm font-bold leading-tight text-foreground">
                {userName}
              </p>
              <p className="max-w-32 truncate text-xs font-medium text-muted-foreground">
                {userEmail || "Signed in"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "w-72 rounded-2xl border-border/50 bg-background/95 p-3 shadow-xl shadow-black/10 backdrop-blur-2xl",
        )}
        align="end"
        sideOffset={12}
      >
        <div className="mb-3 flex items-center gap-4 rounded-xl border border-border/30 bg-gradient-to-r from-accent/50 to-accent/30 p-3">
          <Avatar className="h-12 w-12 ring-2 ring-background/80">
            <AvatarImage src={userImage ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-base font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-foreground">
              {userName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {userEmail || "Signed in"}
            </p>
            {userId ? (
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                Bidder ID: {maskBidderId(userId)}
              </p>
            ) : null}
          </div>
        </div>

        <DropdownMenuItem
          className="h-10 cursor-pointer rounded-xl font-medium"
          asChild
        >
          <Link href="/my-bids">
            <HandCoins className="mr-3 h-4 w-4" />
            <span>My Bids</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-10 cursor-pointer rounded-xl font-medium"
          asChild
        >
          <Link href="/dashboard">
            <LayoutDashboard className="mr-3 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-10 cursor-pointer rounded-xl font-medium"
          asChild
        >
          <Link href="/my-auctions">
            <ListChecks className="mr-3 h-4 w-4" />
            <span>My Auctions</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-10 cursor-pointer rounded-xl font-medium"
          asChild
        >
          <Link href="/auctions">
            <GavelIcon className="mr-3 h-4 w-4" />
            <span>Live Market</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-3" />

        <DropdownMenuItem
          onSelect={() => setLogoutConfirmOpen(true)}
          variant="destructive"
          className="h-10 cursor-pointer rounded-xl font-medium hover:bg-destructive/10"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ProtectedNavbar({
  userName: userNameProp,
  userEmail: userEmailProp,
  userImage: userImageProp,
  userId: userIdProp,
}: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const userName =
    userNameProp ?? session?.user?.name ?? session?.user?.email ?? "Account";
  const userEmail = userEmailProp ?? session?.user?.email ?? null;
  const userImage = userImageProp ?? session?.user?.image ?? null;
  const userId = userIdProp ?? (session?.user?.id ? String(session.user.id) : null);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <Link
          href="/dashboard"
          className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-colors">
            <Gavel className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-lg font-bold leading-none tracking-tight text-foreground">
              BIDBZAR
            </p>
            <p className="mt-1 text-xs font-medium leading-none text-muted-foreground">
              Auction Platform
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-[17px] h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <UserMenu
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            userId={userId}
            setLogoutConfirmOpen={setLogoutConfirmOpen}
          />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="protected-mobile-nav"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div
          id="protected-mobile-nav"
          className="border-t bg-background md:hidden"
        >
          <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-4 sm:px-6">
            {/* User Info */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out */}
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLogoutConfirmOpen(true)}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page and need to sign in
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
