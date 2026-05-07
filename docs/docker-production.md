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

## Admin API troubleshooting

The admin container serves the React app and proxies browser-facing `/api/*` requests to the private API service. For example:

```bash
curl -i http://localhost:${ADMIN_PORT:-8080}/api/admin/platform/overview
```

Expected result is a `200 OK` JSON envelope once the API and database are healthy.

If this request returns a PostgreSQL authentication error such as:

```json
{"code":"28P01","message":"password authentication failed for user \"auctionation\""}
```

then the API route and nginx proxy are working, but `DATABASE_URL` does not match the password stored in the existing PostgreSQL Docker volume. This commonly happens after changing `POSTGRES_PASSWORD` in `.env`; PostgreSQL only applies that variable when the database volume is first initialized.

For disposable local/staging data, reset the volume and rebuild:

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache api admin
docker compose -f docker-compose.prod.yml up -d
```

For data that must be preserved, update the existing database user's password to match `.env` instead of deleting the volume.

If the direct API URL returns a route-not-found response:

```bash
curl -i http://localhost:${API_PORT:-3000}/admin/platform/overview
```

then the process listening on the published API port is not the same freshly-built API code or is not the browser-facing path. Rebuild and recreate the API container with `--no-cache`, then check `docker compose -f docker-compose.prod.yml ps` for port conflicts or stale containers.

## Images

The root `Dockerfile` has these production targets:

- `api`: Fastify API service.
- `admin`: static admin dashboard served by nginx.
- `embed`: static iframe embed app served by nginx.
- `widget-demo`: static third-party demo served by nginx.
- `notifications-worker`: compiled notification worker target for future queue-backed worker deployment.
