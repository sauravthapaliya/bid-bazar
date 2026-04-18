export const queryKeys = {
  dashboardData: () => ["dashboard-data"] as const,
  myAuctions: () => ["my-auctions"] as const,
  myBids: () => ["my-bids"] as const,
  myPayments: () => ["my-payments"] as const,
  auctionContactRequest: (auctionId: string) => ["auction-contact-request", auctionId] as const,
  auctionPaymentStatus: (auctionId: string) => ["auction-payment-status", auctionId] as const,
  liveAuctions: () => ["live-auctions"] as const,
  auctionDetail: (id: string) => ["auction-detail", id] as const,
  watchlist: () => ["watchlist"] as const,
  watchlistStatus: (id: string) => ["watchlist-status", id] as const,
};
