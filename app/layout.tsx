import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BIDBZAR | Online Auction System in Nepal",
    template: "%s | BIDBZAR",
  },
  description:
    "BIDBZAR is a real-time online auction platform built with MERN stack and Firebase, enabling secure, transparent, and competitive bidding in Nepal’s digital marketplace.",
  keywords: [
    "online auction Nepal",
    "real-time bidding system",
    "MERN stack auction platform",
    "Firebase real-time auction",
    "BIDBZAR",
    "digital marketplace Nepal",
    "online bidding website",
  ],
  authors: [{ name: "Saurav Thapaliya" }],
  creator: "BIDBZAR Team",
  publisher: "BIDBZAR",
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  category: "E-commerce",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
