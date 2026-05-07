import type { ApiEnvelope, PublicAuctionItemSummary, PublicAuctionSummary } from "@auctionation/shared";
import type { FastifyInstance } from "fastify";

const demoAuction: PublicAuctionSummary = {
  tenantSlug: "demo-charity",
  auctionSlug: "spring-gala",
  title: "Spring Gala Silent Auction",
  description: "Demo auction data served by the API scaffold.",
  status: "open",
  startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  currency: "USD"
};

const demoItems: PublicAuctionItemSummary[] = [
  {
    id: "item_demo_wine_tasting",
    lotNumber: "101",
    title: "Private Wine Tasting",
    description: "A guided tasting experience for eight guests.",
    imageUrls: [],
    currentBidCents: 32500,
    minimumBidIncrementCents: 2500
  },
  {
    id: "item_demo_weekend",
    lotNumber: "102",
    title: "Weekend Getaway",
    description: "Two-night boutique hotel stay with breakfast included.",
    imageUrls: [],
    currentBidCents: 78000,
    minimumBidIncrementCents: 5000
  }
];

export async function registerPublicAuctionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantSlug: string; auctionSlug: string } }>(
    "/public/t/:tenantSlug/a/:auctionSlug",
    async (request): Promise<ApiEnvelope<{ auction: PublicAuctionSummary; items: PublicAuctionItemSummary[] }>> => ({
      data: {
        auction: {
          ...demoAuction,
          tenantSlug: request.params.tenantSlug,
          auctionSlug: request.params.auctionSlug
        },
        items: demoItems
      },
      requestId: request.id
    })
  );
}