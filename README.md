# Auctionation

Auctionation is a TypeScript-first, iframe-embeddable silent auction platform designed for commercial multi-tenant deployments.

The initial architecture uses a single monorepo so the API, admin dashboard, embed experience, shared domain contracts, notification worker, and deployment documentation can evolve together.

## Monorepo layout

```txt
apps/
  api/                  Fastify API service
  admin/                Vite React admin dashboard
  embed/                Iframe-rendered auction experience
  widget-demo/          Third-party-site embed demo
packages/
  shared/               Shared domain types and constants
  email/                SMTP/Graphmail-compatible email abstraction
  notifications/        Notification templates and provider contracts
workers/
  notifications/        Async notification worker skeleton
infra/
  apache/               Apache reverse proxy/static hosting templates
  systemd/              Linux service templates
  sql/                  PostgreSQL bootstrap notes/schema seeds
docs/                   Architecture, deployment, embedding, security docs
```

## Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 16+ recommended
- Apache 2.4+ for LAMP-style production deployment

On Debian 13.4, if local commands are missing:

```bash
sudo apt update
sudo apt install -y nodejs npm git build-essential postgresql postgresql-client apache2
sudo a2enmod proxy proxy_http rewrite headers ssl
sudo systemctl restart apache2
```

## Getting started

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run typecheck
npm run build
```

Run individual services:

```bash
npm run dev:api
npm run dev:admin
npm run dev:embed
npm run dev:widget-demo
npm run dev:notifications
```

## Local testing

A local PostgreSQL database is recommended for development and smoke testing, even though the initial public auction API route currently serves scaffolded demo data. The repository includes a Docker Compose PostgreSQL service and npm helpers:

```bash
npm run db:local:up
npm run db:local:reset
npm run db:local:down
```

See [Local Testing Setup](docs/local-testing.md) for the full setup, database reset flow, quality gates, and smoke-test URLs.

## Production Docker

Production Docker targets are available for the API and static frontend apps. See [Docker Production Setup](docs/docker-production.md) for required environment variables, Compose validation, build, and run commands.

## Initial product direction

- Admin-created invite links for bidder registration
- PostgreSQL-backed multi-tenant auction data
- Iframe-first third-party embedding for safe commercial integration
- SMTP relay email support for Graphmail-compatible providers
- SMS provider abstraction with no initial vendor lock-in
- Async notification worker for invites, outbid alerts, auction ending reminders, and winner messages
