export const queryKeys = {
  dashboardData: () => ["dashboard-data"] as const,
  myAuctions: () => ["my-auctions"] as const,
  myBids: () => ["my-bids"] as const,
  liveAuctions: () => ["live-auctions"] as const,
  auctionDetail: (id: string) => ["auction-detail", id] as const,
  watchlist: () => ["watchlist"] as const,
  watchlistStatus: (id: string) => ["watchlist-status", id] as const,
};
