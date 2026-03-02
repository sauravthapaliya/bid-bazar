"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { HomeNavbar } from "@/components/home/navbar";
import { OtpVerificationForm } from "@/components/auth/otp-verification-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Lock, Clock, Eye, EyeOff } from "lucide-react";

const RegisterPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [requiresOtpVerification, setRequiresOtpVerification] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok || !data?.ok) {
      setError(data?.message || "Registration failed.");
      return;
    }

    setRequiresOtpVerification(true);
  };

  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsVerifyingOtp(true);

    const verifyResponse = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otpCode }),
    });

    const verifyData = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok || !verifyData?.ok) {
      setError(verifyData?.message || "Invalid or expired OTP code.");
      setIsVerifyingOtp(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsVerifyingOtp(false);

    if (!loginResult || loginResult.error) {
      router.push(
        `/login?verified=1&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
      );
      return;
    }

    router.push(loginResult.url || "/dashboard");
    router.refresh();
  };

  const handleResendOtp = async () => {
    setError("");
    setIsResendingOtp(true);

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));
    setIsResendingOtp(false);

    if (!response.ok || !data?.ok) {
      toast.error(data?.message || "Could not resend OTP. Please try again.");
      return;
    }

    toast.success(data?.message || "Verification OTP sent.");
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <HomeNavbar isAuthenticated={false} />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
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
              auctions. No fees to join - only pay when you win.
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
                {requiresOtpVerification ? "Verify OTP" : "Create account"}
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {requiresOtpVerification
                  ? "Enter the code we sent to your email"
                  : "Join BIDBZAR and start bidding in minutes"}
              </p>
            </div>

            {!requiresOtpVerification ? (
              <form onSubmit={handleRegister} className="space-y-5">
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="h-12 rounded-xl bg-muted/40 border-border pr-12 focus-visible:ring-primary/50 placeholder:text-muted-foreground/40 text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    Use 8+ characters - mix letters &amp; numbers recommended.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-sm font-bold tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating account..." : "Create Account ->"}
                </Button>
              </form>
            ) : (
              <OtpVerificationForm
                email={email}
                otpCode={otpCode}
                isVerifyingOtp={isVerifyingOtp}
                isResendingOtp={isResendingOtp}
                onOtpChange={(value) => setOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                onSubmit={handleVerifyOtp}
                onResend={handleResendOtp}
              />
            )}

            {error && (
              <Alert
                variant="destructive"
                className="rounded-xl border-destructive/30 bg-destructive/10"
              >
                <AlertTitle className="text-destructive text-sm font-semibold">
                  {requiresOtpVerification ? "Verification failed" : "Registration failed"}
                </AlertTitle>
                <AlertDescription className="text-destructive/80 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

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
