# Docker Production Setup

The repository includes a production-oriented Docker build for the API and static frontend apps, plus a PostgreSQL service for single-host deployments.

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

The API health check is available at `/health`. PostgreSQL is not published to the host in the production Compose file; the API talks to it on the private Compose network.

## Images

The root `Dockerfile` has these production targets:

- `api`: Fastify API service.
- `admin`: static admin dashboard served by nginx.
- `embed`: static iframe embed app served by nginx.
- `widget-demo`: static third-party demo served by nginx.
- `notifications-worker`: compiled notification worker target for future queue-backed worker deployment.
