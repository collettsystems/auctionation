-- Idempotent demo data for local/runtime smoke testing.
-- Production deployments can omit this file if demo content is not desired.

WITH tenant_row AS (
  INSERT INTO tenants (slug, name, status, allowed_embed_origins)
  VALUES (
    'demo-charity',
    'Demo Charity',
    'active',
    ARRAY['http://localhost:5174', 'http://localhost:5175']
  )
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        status = EXCLUDED.status,
        allowed_embed_origins = EXCLUDED.allowed_embed_origins,
        updated_at = now()
  RETURNING id
), auction_row AS (
  INSERT INTO auctions (tenant_id, slug, title, description, status, starts_at, ends_at, currency, timezone)
  SELECT
    tenant_row.id,
    'spring-gala',
    'Spring Gala Silent Auction',
    'Demo auction data served from PostgreSQL for runtime smoke testing.',
    'open',
    now() - interval '1 hour',
    now() + interval '6 hours',
    'USD',
    'America/Chicago'
  FROM tenant_row
  ON CONFLICT (tenant_id, slug) DO UPDATE
    SET title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        currency = EXCLUDED.currency,
        timezone = EXCLUDED.timezone,
        updated_at = now()
  RETURNING id, tenant_id
), manager_row AS (
  INSERT INTO users (tenant_id, email, display_name, roles)
  SELECT
    auction_row.tenant_id,
    'manager@demo-charity.example',
    'Demo Auction Manager',
    ARRAY['tenant_admin', 'auction_manager']
  FROM auction_row
  ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL DO UPDATE
    SET display_name = EXCLUDED.display_name,
        roles = EXCLUDED.roles,
        updated_at = now()
  RETURNING id, tenant_id
), bidder_row AS (
  INSERT INTO users (tenant_id, email, display_name, roles)
  SELECT
    auction_row.tenant_id,
    'bidder@demo-charity.example',
    'Demo Bidder',
    ARRAY['bidder']
  FROM auction_row
  ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL DO UPDATE
    SET display_name = EXCLUDED.display_name,
        roles = EXCLUDED.roles,
        updated_at = now()
  RETURNING id, tenant_id
), wine_item AS (
  INSERT INTO auction_items (
    tenant_id,
    auction_id,
    lot_number,
    title,
    description,
    image_urls,
    starting_bid_cents,
    minimum_bid_increment_cents,
    fair_market_value_cents
  )
  SELECT
    auction_row.tenant_id,
    auction_row.id,
    '101',
    'Private Wine Tasting',
    'A guided tasting experience for eight guests.',
    ARRAY[]::text[],
    25000,
    2500,
    50000
  FROM auction_row
  WHERE NOT EXISTS (
    SELECT 1 FROM auction_items WHERE auction_id = auction_row.id AND lot_number = '101'
  )
  RETURNING id, tenant_id, auction_id
), weekend_item AS (
  INSERT INTO auction_items (
    tenant_id,
    auction_id,
    lot_number,
    title,
    description,
    image_urls,
    starting_bid_cents,
    minimum_bid_increment_cents,
    fair_market_value_cents
  )
  SELECT
    auction_row.tenant_id,
    auction_row.id,
    '102',
    'Weekend Getaway',
    'Two-night boutique hotel stay with breakfast included.',
    ARRAY[]::text[],
    65000,
    5000,
    120000
  FROM auction_row
  WHERE NOT EXISTS (
    SELECT 1 FROM auction_items WHERE auction_id = auction_row.id AND lot_number = '102'
  )
  RETURNING id, tenant_id, auction_id
)
INSERT INTO bids (tenant_id, auction_id, item_id, bidder_user_id, amount_cents, status, idempotency_key)
SELECT auction_items.tenant_id, auction_items.auction_id, auction_items.id, bidder_row.id, 32500, 'accepted', 'demo-wine-32500'
FROM auction_items
JOIN auction_row ON auction_row.id = auction_items.auction_id
JOIN bidder_row ON true
WHERE auction_items.lot_number = '101'
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

WITH auction_row AS (
  SELECT auctions.id, auctions.tenant_id
  FROM auctions
  JOIN tenants ON tenants.id = auctions.tenant_id
  WHERE tenants.slug = 'demo-charity' AND auctions.slug = 'spring-gala'
), bidder_row AS (
  SELECT id FROM users WHERE email = 'bidder@demo-charity.example'
), weekend_item AS (
  SELECT auction_items.id, auction_items.tenant_id, auction_items.auction_id
  FROM auction_items
  JOIN auction_row ON auction_row.id = auction_items.auction_id
  WHERE auction_items.lot_number = '102'
)
INSERT INTO bids (tenant_id, auction_id, item_id, bidder_user_id, amount_cents, status, idempotency_key)
SELECT weekend_item.tenant_id, weekend_item.auction_id, weekend_item.id, bidder_row.id, 78000, 'accepted', 'demo-weekend-78000'
FROM weekend_item, bidder_row
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;