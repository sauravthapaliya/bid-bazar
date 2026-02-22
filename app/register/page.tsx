"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { HomeNavbar } from "@/components/home/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Lock, Clock } from "lucide-react";

const RegisterPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.ok) {
      setError(data?.message || "Registration failed.");
      setIsSubmitting(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!loginResult || loginResult.error) {
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    router.push(loginResult.url || "/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <HomeNavbar isAuthenticated={false} />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        {/* ── LEFT PANEL ── */}
        <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-card px-14 py-16 border-r border-border">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative z-10">
            <p className="text-2xl font-extrabold tracking-tighter text-foreground">
              BID<span className="text-primary">BZAR</span>
            </p>
          </div>

          <div className="relative z-10 space-y-5">
            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight text-foreground">
              Your next great
              <br />
              deal is one bid <em className="not-italic text-primary">away.</em>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm font-light">
              Create a free account and instantly access thousands of live
              auctions. No fees to join — only pay when you win.
            </p>

            <ul className="space-y-3 pt-2">
              {[
                "Real-time bidding with instant notifications",
                "Verified sellers and buyer protection",
                "Secure payments via escrow",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <svg
                      viewBox="0 0 12 12"
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-stretch">
            {[
              { value: "48K+", label: "Active Auctions" },
              { value: "$2.4M", label: "Traded Daily" },
              { value: "99.1%", label: "Satisfaction" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-stretch">
                {i > 0 && <div className="w-px bg-border mx-8 self-stretch" />}
                <div className="flex flex-col gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex items-center justify-center bg-background px-6 py-14 sm:px-14">
          <div className="w-full max-w-md space-y-8">
            <div className="flex items-center gap-3">
              <span className="h-px w-5 bg-primary block shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Free Account
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-4xl font-bold tracking-tight text-foreground leading-none">
                Create account
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                Join BIDBZAR and start bidding in minutes
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-xs uppercase tracking-widest text-muted-foreground font-medium"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12 rounded-xl bg-muted/40 border-border focus-visible:ring-primary/50 placeholder:text-muted-foreground/40 text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs uppercase tracking-widest text-muted-foreground font-medium"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="h-12 rounded-xl bg-muted/40 border-border focus-visible:ring-primary/50 placeholder:text-muted-foreground/40 text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-widest text-muted-foreground font-medium"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="h-12 rounded-xl bg-muted/40 border-border focus-visible:ring-primary/50 placeholder:text-muted-foreground/40 text-foreground"
                />
                <p className="text-xs text-muted-foreground/60">
                  Use 8+ characters — mix letters &amp; numbers recommended.
                </p>
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="rounded-xl border-destructive/30 bg-destructive/10"
                >
                  <AlertTitle className="text-destructive text-sm font-semibold">
                    Registration failed
                  </AlertTitle>
                  <AlertDescription className="text-destructive/80 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-sm font-bold tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating account..." : "Create Account →"}
              </Button>
            </form>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-foreground font-medium hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            </p>

            <div className="flex items-center justify-center gap-6">
              {[
                { Icon: ShieldCheck, label: "SSL Secured" },
                { Icon: Lock, label: "Encrypted" },
                { Icon: Clock, label: "24/7 Support" },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
