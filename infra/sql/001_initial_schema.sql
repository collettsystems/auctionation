-- Auctionation initial PostgreSQL schema sketch.
-- This file documents the target relational model for the scaffold. Production
-- migrations should be managed with Drizzle, node-pg-migrate, or a similar tool.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  allowed_embed_origins text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'America/Chicago',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS auction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  auction_id uuid NOT NULL REFERENCES auctions(id),
  lot_number text,
  title text NOT NULL,
  description text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  starting_bid_cents integer NOT NULL CHECK (starting_bid_cents >= 0),
  minimum_bid_increment_cents integer NOT NULL CHECK (minimum_bid_increment_cents > 0),
  fair_market_value_cents integer CHECK (fair_market_value_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email citext,
  phone_number text,
  display_name text NOT NULL,
  roles text[] NOT NULL DEFAULT '{bidder}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  auction_id uuid REFERENCES auctions(id),
  email citext,
  phone_number text,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  auction_id uuid NOT NULL REFERENCES auctions(id),
  item_id uuid NOT NULL REFERENCES auction_items(id),
  bidder_user_id uuid NOT NULL REFERENCES users(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'accepted',
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_auctions_tenant_status ON auctions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_items_auction ON auction_items(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_item_amount ON bids(item_id, amount_cents DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_invites_tenant_status ON invites(tenant_id, status);