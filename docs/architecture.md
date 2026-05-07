# Auctionation Architecture

Auctionation is designed as a commercial, multi-tenant silent auction platform that can be embedded into third-party websites while retaining secure control over auction data, registration, bidding, and notifications.

## Repository strategy

The project starts as a single TypeScript monorepo. This is appropriate because the admin dashboard, public embed app, API, shared contracts, and notification worker all need to evolve together during early product development.

Split repositories only when team structure, compliance, or release cadence demands it.

## Runtime components

- `apps/api`: Fastify API for tenant, auction, invite, bid, notification, and public embed endpoints.
- `apps/admin`: React/Vite admin dashboard for operators and tenant admins.
- `apps/embed`: iframe-rendered auction UI shown inside client websites.
- `apps/widget-demo`: example third-party host site that injects the embed iframe.
- `workers/notifications`: async worker for email/SMS delivery.
- `packages/shared`: shared TypeScript domain contracts.
- `packages/email`: SMTP provider abstraction for Graphmail-compatible relay.
- `packages/notifications`: templates and channel abstractions.

## Primary domain concepts

- Tenant: client organization with isolated data and allowed embed origins.
- Auction: scheduled event containing items and bidding rules.
- Auction item: lot available for bidding.
- Invite: admin-created registration entry point.
- User: admin, manager, or bidder scoped to a tenant.
- Bid: immutable bid record with idempotency protection.
- Notification: queued email/SMS record with delivery status.

## Deployment model

The target production model is LAMP-compatible:

- Apache serves static admin/embed builds.
- Apache reverse proxies `/api` to the Node.js Fastify API.
- Node.js services run under systemd.
- PostgreSQL stores system data.
- SMTP relay sends email through Graphmail-compatible settings.

## Next architecture decisions

- Choose migration tooling: Drizzle Kit, node-pg-migrate, or Prisma migrations.
- Choose queue backend: PostgreSQL-backed jobs initially, then Redis/BullMQ if throughput requires it.
- Choose SMS vendor: Twilio, Vonage, Telnyx, or another provider behind the existing interface.