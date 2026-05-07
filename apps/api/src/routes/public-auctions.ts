import type { ApiEnvelope, PublicAuctionItemSummary, PublicAuctionSummary } from "@auctionation/shared";
import type { FastifyInstance } from "fastify";

interface AuctionRow {
  tenant_slug: string;
  auction_slug: string;
  title: string;
  description: string | null;
  status: PublicAuctionSummary["status"];
  starts_at: Date;
  ends_at: Date;
  currency: string;
}

interface AuctionItemRow {
  id: string;
  lot_number: string | null;
  title: string;
  description: string;
  image_urls: string[];
  current_bid_cents: number | null;
  minimum_bid_increment_cents: number;
}

function mapAuction(row: AuctionRow): PublicAuctionSummary {
  return {
    tenantSlug: row.tenant_slug,
    auctionSlug: row.auction_slug,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    currency: row.currency
  };
}

function mapItem(row: AuctionItemRow): PublicAuctionItemSummary {
  return {
    id: row.id,
    lotNumber: row.lot_number ?? undefined,
    title: row.title,
    description: row.description,
    imageUrls: row.image_urls,
    currentBidCents: row.current_bid_cents ?? undefined,
    minimumBidIncrementCents: row.minimum_bid_increment_cents
  };
}

export async function registerPublicAuctionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantSlug: string; auctionSlug: string } }>(
    "/public/t/:tenantSlug/a/:auctionSlug",
    async (request, reply): Promise<ApiEnvelope<{ auction: PublicAuctionSummary; items: PublicAuctionItemSummary[] }> | void> => {
      const auctionResult = await app.db.query<AuctionRow>(
        `
          SELECT
            tenants.slug AS tenant_slug,
            auctions.slug AS auction_slug,
            auctions.title,
            auctions.description,
            auctions.status,
            auctions.starts_at,
            auctions.ends_at,
            auctions.currency
          FROM auctions
          JOIN tenants ON tenants.id = auctions.tenant_id
          WHERE tenants.slug = $1
            AND auctions.slug = $2
            AND tenants.status = 'active'
          LIMIT 1
        `,
        [request.params.tenantSlug, request.params.auctionSlug]
      );

      const auctionRow = auctionResult.rows[0];
      if (!auctionRow) {
        reply.code(404).send({
          data: {
            code: "AUCTION_NOT_FOUND",
            message: "Public auction was not found."
          },
          requestId: request.id
        });
        return;
      }

      const itemsResult = await app.db.query<AuctionItemRow>(
        `
          SELECT
            auction_items.id,
            auction_items.lot_number,
            auction_items.title,
            auction_items.description,
            auction_items.image_urls,
            COALESCE(MAX(bids.amount_cents), auction_items.starting_bid_cents) AS current_bid_cents,
            auction_items.minimum_bid_increment_cents
          FROM auction_items
          JOIN auctions ON auctions.id = auction_items.auction_id
          JOIN tenants ON tenants.id = auction_items.tenant_id
          LEFT JOIN bids
            ON bids.item_id = auction_items.id
            AND bids.status IN ('accepted', 'winning')
          WHERE tenants.slug = $1
            AND auctions.slug = $2
          GROUP BY auction_items.id
          ORDER BY auction_items.lot_number NULLS LAST, auction_items.created_at ASC
        `,
        [request.params.tenantSlug, request.params.auctionSlug]
      );

      return {
        data: {
          auction: mapAuction(auctionRow),
          items: itemsResult.rows.map(mapItem)
        },
        requestId: request.id
      };
    }
  );
}