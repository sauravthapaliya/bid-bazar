import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auctions") ||
    pathname.startsWith("/my-auctions") ||
    pathname.startsWith("/my-bids") ||
    pathname.startsWith("/watchlist") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/kyc");
  const isAdminPage = pathname.startsWith("/admin");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtectedPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isAdminPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/admin/kyc", req.url));
  }

  if (isAdminPage && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/auctions/:path*",
    "/my-auctions/:path*",
    "/my-bids/:path*",
    "/watchlist/:path*",
    "/payments/:path*",
    "/kyc/:path*",
    "/admin/:path*",
  ],
};
