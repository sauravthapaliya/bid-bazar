export const queryKeys = {
  dashboardData: () => ["dashboard-data"] as const,
  myAuctions: () => ["my-auctions"] as const,
  liveAuctions: () => ["live-auctions"] as const,
  auctionDetail: (id: string) => ["auction-detail", id] as const,
};
