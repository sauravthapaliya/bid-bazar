import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Gavel,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Users,
  Zap,
  Globe,
  Award,
  CheckCircle2,
  Lock,
  Clock,
  BarChart3,
  Star,
  Wallet,
  PlayCircle,
} from "lucide-react";
import { auth } from "@/auth";
import { HomeFooter } from "@/components/home/footer";
import { HomeNavbar } from "@/components/home/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLiveAuctions } from "@/lib/auction-market";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    label: "Live Auctions",
    value: "120+",
    icon: TrendingUp,
    description: "Happening now",
    color: "blue",
  },
  {
    label: "Verified Users",
    value: "8.5K+",
    icon: Users,
    description: "Trusted community",
    color: "green",
  },
  {
    label: "Items Sold",
    value: "15K+",
    icon: Trophy,
    description: "Successful deals",
    color: "violet",
  },
  {
    label: "Satisfaction Rate",
    value: "98%",
    icon: Star,
    description: "Happy bidders",
    color: "amber",
  },
];

const featureCards = [
  {
    icon: Zap,
    title: "Lightning-Fast Bidding",
    description:
      "Experience real-time auction updates with zero lag. Watch bids flow in as they happen with our advanced websocket technology.",
    color: "blue",
    highlight: "Real-time updates",
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description:
      "Your data and transactions are protected with end-to-end encryption. Every bid is verified and recorded immutably.",
    color: "green",
    highlight: "100% Secure",
  },
  {
    icon: Clock,
    title: "Smart Time Extensions",
    description:
      "Fair play guaranteed with automatic auction extensions. Last-second bids trigger countdown resets to ensure everyone gets a fair chance.",
    color: "orange",
    highlight: "Anti-sniping",
  },
  {
    icon: BarChart3,
    title: "Transparent Analytics",
    description:
      "Access complete bid history, price trends, and market insights. Make informed decisions with comprehensive data at your fingertips.",
    color: "violet",
    highlight: "Data-driven",
  },
  {
    icon: Wallet,
    title: "Flexible Payments",
    description:
      "Multiple payment methods supported including cards, bank transfers, and digital wallets. Quick checkout, instant confirmation.",
    color: "rose",
    highlight: "Easy checkout",
  },
  {
    icon: Award,
    title: "Verified Listings",
    description:
      "Every item undergoes quality verification. Detailed descriptions, authentic photos, and condition reports you can trust.",
    color: "cyan",
    highlight: "Quality assured",
  },
];

const processCards = [
  {
    step: "01",
    title: "Sign Up in Seconds",
    description:
      "Create your account with email or social login. Complete profile verification to unlock full bidding privileges.",
    icon: Users,
    color: "blue",
  },
  {
    step: "02",
    title: "Browse & Watchlist",
    description:
      "Explore curated categories from electronics to collectibles. Save favorites and get alerts when auctions are about to start.",
    icon: Globe,
    color: "violet",
  },
  {
    step: "03",
    title: "Bid with Confidence",
    description:
      "Place manual bids or set automatic bid limits. Win your item and complete secure checkout with seller protection.",
    icon: Gavel,
    color: "green",
  },
];

const trustIndicators = [
  { icon: CheckCircle2, text: "SSL Encrypted" },
  { icon: Lock, text: "Secure Payments" },
  { icon: ShieldCheck, text: "Verified Sellers" },
  { icon: Award, text: "Money-Back Guarantee" },
];

const money = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const Homepage = async () => {
  const session = await auth();
  const auctions = await getLiveAuctions(4);
  const featuredAuctions = auctions.slice(0, 4);
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="relative min-h-screen bg-background">
      <HomeNavbar isAuthenticated={isAuthenticated} />

      <div className="mx-auto w-full max-w-[90rem] px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative mb-24 sm:mb-32">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="inline-flex animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="group relative inline-flex items-center gap-2 rounded-full border-2 border-border bg-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent">
                  <span>Nepal's Most Trusted Auction Platform</span>
                </div>
              </div>

              {/* Main Headline */}
              <div className="space-y-6">
                <h1
                  className="animate-in fade-in slide-in-from-bottom-6 text-balance text-4xl font-extrabold tracking-tight duration-1000 sm:text-5xl lg:text-6xl xl:text-7xl"
                  style={{ animationDelay: "100ms" }}
                >
                  Where Every Bid
                  <br />
                  <span className="relative inline-block">
                    <span className="bg-primary bg-clip-text text-transparent">
                      Tells a Story
                    </span>
                    <svg
                      className="absolute -bottom-2 left-0 w-full"
                      height="12"
                      viewBox="0 0 400 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 10C100 2 200 2 398 10"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0"
                          y1="0"
                          x2="400"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                          <stop offset="50%" stopColor="rgb(139, 92, 246)" />
                          <stop offset="100%" stopColor="rgb(59, 130, 246)" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </h1>

                {/* Subheadline */}
                <p
                  className="animate-in fade-in slide-in-from-bottom-8 text-balance text-lg leading-relaxed text-muted-foreground duration-1000 sm:text-xl"
                  style={{ animationDelay: "200ms" }}
                >
                  Join thousands of buyers and sellers in Nepal's premier online
                  auction marketplace. Discover incredible deals through
                  transparent, competitive bidding.
                </p>
              </div>

              {/* CTA Buttons */}
              <div
                className="flex animate-in fade-in slide-in-from-bottom-10 flex-col items-start gap-4 duration-1000 sm:flex-row"
                style={{ animationDelay: "300ms" }}
              >
                {session?.user ? (
                  <Button
                    asChild
                    size="lg"
                    className="group h-14 gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                  >
                    <Link href="/dashboard">
                      <span>Open Dashboard</span>
                      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="group h-14 gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                    >
                      <Link href="/register">
                        <span>Start Bidding Free</span>
                        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="group h-14 gap-2 rounded-full border-2 px-8 text-base font-semibold transition-all hover:border-border hover:bg-accent"
                    >
                      <Link href="/login">
                        <PlayCircle className="size-5" />
                        <span>Watch Demo</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Trust Indicators */}
              <div
                className="flex animate-in fade-in slide-in-from-bottom-12 flex-wrap items-center gap-x-6 gap-y-3 pt-4 text-sm duration-1000"
                style={{ animationDelay: "400ms" }}
              >
                {trustIndicators.map((indicator, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <indicator.icon className="size-4 text-primary" />
                    <span className="font-medium">{indicator.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div
              className="relative animate-in fade-in slide-in-from-right duration-1000 lg:order-last"
              style={{ animationDelay: "200ms" }}
            >
              <div className="relative px-6 py-8">
                {/* Image Card */}
                <div className="relative overflow-hidden rounded-3xl border-2 border-muted bg-card p-8 shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src="/images/Auction_hummer_preview.jpg"
                      alt="Live auction platform showcase"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Floating Stats Cards */}
                  <div className="absolute -bottom-2 -right-2 rounded-2xl border-2 border-background bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <TrendingUp className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">120+</p>
                        <p className="text-xs text-muted-foreground">
                          Active Now
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -left-2 top-1/4 rounded-2xl border-2 border-background bg-card p-4 shadow-sm sm:-left-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Users className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">8.5K+</p>
                        <p className="text-xs text-muted-foreground">Users</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            className="mt-20 grid animate-in fade-in slide-in-from-bottom-14 gap-6 duration-1000 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animationDelay: "500ms" }}
          >
            {stats.map((stat, idx) => (
              <Card
                key={idx}
                className="group relative overflow-hidden border-2 border-border bg-card transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-xl bg-primary p-3 shadow-sm">
                    <stat.icon className="size-6 text-primary-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-4xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="font-semibold text-foreground">
                      {stat.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Live Market Section */}
        {featuredAuctions.length > 0 ? (
          <section id="live-market" className="mb-24 scroll-mt-24 sm:mb-32">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge
                  variant="secondary"
                  className="mb-4 rounded-full px-4 py-2 text-sm font-medium"
                >
                  <Gavel className="mr-2 inline size-4" />
                  Live Market Auctions
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Place Your Bid
                </h2>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  See the latest live auctions. To participate in bidding, sign
                  in or create your account first.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild variant="outline">
                  <Link href={isAuthenticated ? "/auctions" : "/login"}>
                    Browse All Auctions
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featuredAuctions.map((auction) => (
                <Card
                  key={auction.id}
                  className="group flex h-full flex-col overflow-hidden border shadow-sm transition-all"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {auction.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={auction.imageUrl}
                        alt={auction.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="line-clamp-1 text-lg">
                      {auction.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-1 text-sm">
                      {auction.description || "No description available"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral" className="text-xs font-medium">
                        {auction.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-medium">
                        {auction.totalBids}{" "}
                        {auction.totalBids === 1 ? "bid" : "bids"}
                      </Badge>
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Starting Price
                        </span>
                        <span className="font-semibold text-foreground">
                          {money.format(auction.startPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Current Price
                        </span>
                        <span className="font-semibold text-foreground">
                          {money.format(auction.currentPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Auction Ends
                        </span>
                        <span className="font-semibold text-foreground">
                          {auction.endsAt
                            ? dateTime.format(new Date(auction.endsAt))
                            : "Unknown"}
                        </span>
                      </div>
                    </div>

                    <Button asChild className="mt-auto w-full">
                      <Link
                        href={
                          isAuthenticated ? `/auctions/${auction.id}` : "/login"
                        }
                      >
                        View Auction
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* Features Section */}
        <section id="features" className="mb-24 scroll-mt-24 sm:mb-32">
          <div className="mb-16 text-center">
            <Badge
              variant="secondary"
              className="mb-4 rounded-full px-4 py-2 text-sm font-medium"
            >
              <Trophy className="mr-2 inline size-4" />
              Platform Features
            </Badge>
            <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Built for Modern Auctions
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Advanced technology meets intuitive design. Everything you need to
              bid, sell, and win.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, idx) => (
              <Card
                key={idx}
                className="group relative overflow-hidden border-2 border-border transition-all duration-300 hover:scale-105"
              >
                <CardHeader className="space-y-4 p-8">
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-primary/10 p-3 ring-2 ring-border">
                      <feature.icon className="size-7 text-primary" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold"
                    >
                      {feature.highlight}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mb-24 scroll-mt-24 sm:mb-32">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Start Bidding in Minutes
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Our streamlined process gets you from signup to your first winning
              bid in no time.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {processCards.map((item, idx) => (
              <div key={idx} className="relative">
                {/* Connector Line */}
                {idx < processCards.length - 1 && (
                  <div className="absolute left-full top-20 hidden w-full md:block">
                    <div className="mx-4 border-t-2 border-dashed border-muted-foreground/30" />
                  </div>
                )}

                <Card className="group relative h-full overflow-hidden border-2 border-border bg-card transition-all duration-300 hover:scale-95">
                  <CardHeader className="space-y-6 p-8">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-3 rounded-full bg-primary px-5 py-2.5 text-primary-foreground shadow-sm">
                        <span className="text-sm font-bold">STEP</span>
                        <span className="text-2xl font-bold">{item.step}</span>
                      </div>
                      <div className="rounded-xl bg-primary/10 p-3">
                        <item.icon className="size-6 text-primary" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <CardTitle className="text-2xl">{item.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial/Social Proof Section */}
        <section className="mb-24 sm:mb-32">
          <div className="rounded-3xl border-2 border-muted bg-muted p-12 text-center shadow-sm">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-8 fill-current text-chart-4" />
                ))}
              </div>
              <blockquote className="text-2xl font-semibold leading-relaxed sm:text-3xl">
                "BIDBZAR transformed how we buy and sell in Nepal. The platform
                is incredibly fast, transparent, and trustworthy. I've won over
                20 auctions!"
              </blockquote>
              <div className="space-y-1">
                <p className="font-semibold">Rajesh Sharma</p>
                <p className="text-sm text-muted-foreground">
                  Kathmandu • Active Bidder Since 2023
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section
          id="cta"
          className="relative overflow-hidden rounded-3xl border bg-primary p-12 text-primary-foreground shadow-sm sm:p-16 lg:p-20"
        >
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-8 space-y-4">
              <h3 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Ready to Win Your Next Auction?
              </h3>
              <p className="mx-auto max-w-2xl text-xl text-primary-foreground/90">
                Join 8,500+ verified bidders and sellers on Nepal's most trusted
                auction platform. Sign up free and start exploring live auctions
                today.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group h-14 gap-3 rounded-full bg-background px-10 text-lg font-bold text-foreground shadow-sm transition-all hover:bg-background/95"
              >
                <Link href={session?.user ? "/dashboard" : "/register"}>
                  {session?.user ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              {!session?.user && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-2 border-primary-foreground/40 bg-primary-foreground/10 px-10 text-lg font-bold text-primary-foreground transition-all hover:bg-primary-foreground/20"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">
                  No credit card required
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Setup in 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <HomeFooter />
    </main>
  );
};

export default Homepage;
