# Docker Production Setup

The repository includes a production-oriented Docker build for the API and static frontend apps, plus a PostgreSQL service for single-host deployments. The API creates a PostgreSQL connection pool at runtime, closes it gracefully on shutdown, and its `/health` endpoint validates database connectivity.

## Required environment

Create a deployment `.env` file or export these values before running Compose:

```bash
POSTGRES_PASSWORD=replace-with-a-strong-password
PUBLIC_APP_URL=https://admin.example.com
PUBLIC_EMBED_URL=https://embed.example.com
CORS_ORIGINS=https://admin.example.com,https://embed.example.com
API_PORT=3000
ADMIN_PORT=8080
EMBED_PORT=8081
```

`POSTGRES_PASSWORD`, `PUBLIC_APP_URL`, `PUBLIC_EMBED_URL`, and `CORS_ORIGINS` should be treated as production settings, not committed defaults.

## Validate and build

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml build
```

## Run

```bash
docker compose -f docker-compose.prod.yml up -d
```

The API health check is available at `/health` and returns healthy only when PostgreSQL is reachable. PostgreSQL is not published to the host in the production Compose file; the API talks to it on the private Compose network.

The production Compose file applies `infra/sql/001_initial_schema.sql` to new database volumes. Demo seed data is intentionally not mounted in production. For staging or smoke-test-only environments where demo content is desired, apply `infra/sql/002_demo_seed.sql` manually after the database is created:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U auctionation -d auctionation < infra/sql/002_demo_seed.sql
```

## Images

The root `Dockerfile` has these production targets:

- `api`: Fastify API service.
- `admin`: static admin dashboard served by nginx.
- `embed`: static iframe embed app served by nginx.
- `widget-demo`: static third-party demo served by nginx.
- `notifications-worker`: compiled notification worker target for future queue-backed worker deployment.
