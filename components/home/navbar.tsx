"use client";

import Link from "next/link";
import { Gavel, Menu, X, Zap, BookOpen, Rocket } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type HomeNavbarProps = {
  isAuthenticated: boolean;
};

export function HomeNavbar({ isAuthenticated }: HomeNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#live-market", label: "Live Market", icon: Gavel },
    { href: "/#features", label: "Features", icon: Zap },
    { href: "/#how-it-works", label: "How It Works", icon: BookOpen },
    { href: "/#cta", label: "Get Started", icon: Rocket },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 shadow-sm">
      <div className="mx-auto flex h-20 w-full max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform hover:scale-105"
          onClick={() => setMenuOpen(false)}
        >
          <div className="relative flex items-center justify-center rounded-xl bg-primary p-2.5 shadow-lg transition-all group-hover:shadow-xl">
            <Gavel className="size-5 text-primary-foreground" />
          </div>
          <BrandLogo
            subtitle="Auction Platform"
            textClassName="text-lg"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <link.icon className="size-4 transition-transform group-hover:scale-110" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button
              asChild
              size="default"
              className="rounded-full bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="default"
                variant="ghost"
                className="rounded-full font-semibold"
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                size="default"
                className="rounded-full bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
              >
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-full border-2"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div id="mobile-nav" className="border-t bg-background md:hidden">
          <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-2 px-4 py-6 sm:px-6">
            {/* Mobile Navigation Links */}
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  <link.icon className="size-5" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Auth Buttons */}
            <div className="mt-4 space-y-3 border-t pt-4">
              {isAuthenticated ? (
                <Button
                  asChild
                  className="w-full rounded-full bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
                  size="lg"
                >
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-full border-2 font-semibold"
                    size="lg"
                  >
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full rounded-full bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
                    size="lg"
                  >
                    <Link href="/register" onClick={() => setMenuOpen(false)}>
                      Get Started Free
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
