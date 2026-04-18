import Link from "next/link";
import {
  Gavel,
  Mail,
  MapPin,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function HomeFooter() {
  const platformLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#cta", label: "Get Started" },
  ];

  const companyLinks = [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/careers", label: "Careers" },
    { href: "/blog", label: "Blog" },
  ];

  const legalLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/cookie-policy", label: "Cookie Policy" },
    { href: "/seller-agreement", label: "Seller Agreement" },
  ];

  const socialLinks = [
    { href: "https://facebook.com", icon: Facebook, label: "Facebook" },
    { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
    { href: "https://instagram.com", icon: Instagram, label: "Instagram" },
    { href: "https://linkedin.com", icon: Linkedin, label: "LinkedIn" },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-12 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand Section */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 transition-transform hover:scale-105"
            >
              <div className="flex items-center justify-center rounded-xl bg-primary p-2.5 shadow-lg">
                <Gavel className="size-5 text-primary-foreground" />
              </div>
              <BrandLogo
                subtitle="Auction Platform"
                textClassName="text-lg"
              />
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Nepal&apos;s most trusted online auction platform for transparent,
              competitive bidding. Discover deals, place bids in real-time, and
              win with confidence.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                <span>Pokhara, Nepal</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="size-4 text-primary" />
                <a
                  href="mailto:support@bidbzar.com"
                  className="hover:text-foreground"
                >
                  support@bidbzar.com
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="size-4 text-primary" />
                <a href="tel:+9771234567890" className="hover:text-foreground">
                  +977 123-456-7890
                </a>
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-12">
            {/* Platform Links */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
                Platform
              </h3>
              <ul className="space-y-3">
                {platformLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
                Company
              </h3>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
                Legal
              </h3>
              <ul className="space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Copyright */}
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} BIDBZAR. All rights reserved.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border-2 border-muted bg-background p-2 transition-all hover:border-border hover:bg-accent"
                  aria-label={social.label}
                >
                  <social.icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
