# Local Testing Setup

This guide prepares a developer workstation for local smoke testing Auctionation.

## 1. Install prerequisites

Use the Node and npm versions expected by the workspace:

```bash
node --version # expected: 22+
npm --version  # expected: 10+
```

Install dependencies from the lockfile:

```bash
npm ci
```

## 2. Start a local PostgreSQL database

A local testing database is required because the API health check and public auction endpoint validate PostgreSQL at runtime.

The easiest path is Docker Compose:

```bash
npm run db:local:up
```

This starts a PostgreSQL 16 container with:

```text
DATABASE_URL=postgresql://auctionation:auctionation@localhost:5432/auctionation
```

The initial schema at `infra/sql/001_initial_schema.sql` and demo seed data at `infra/sql/002_demo_seed.sql` are mounted into the container entrypoint and are applied when the database volume is created for the first time.

To reset the local database volume and re-apply the schema:

```bash
npm run db:local:reset
```

To stop the database while keeping data:

```bash
npm run db:local:down
```

If you are using a locally installed PostgreSQL server instead of Docker, create a matching database/user and apply the schema manually:

```bash
createuser auctionation --createdb
createdb auctionation --owner auctionation
psql postgres -c "ALTER USER auctionation WITH PASSWORD 'auctionation';"
DATABASE_URL=postgresql://auctionation:auctionation@localhost:5432/auctionation npm run db:schema:apply
```

If your local PostgreSQL authentication does not use passwords on localhost, adjust `DATABASE_URL` to match your machine-specific settings.

## 3. Create local API environment

```bash
cp apps/api/.env.example apps/api/.env
```

The example file already points at the Docker Compose database URL.

## 4. Run quality gates

```bash
npm run typecheck
npm run build
```

There is no dedicated automated test runner yet. Until one is added, these commands are the main repository-wide checks.

## 5. Run the app stack

Use separate terminals:

```bash
npm run dev:api
npm run dev:admin
npm run dev:embed
npm run dev:widget-demo
npm run dev:notifications
```

Open these URLs for manual testing:

- API health: <http://127.0.0.1:3000/health>
- Public auction JSON backed by PostgreSQL seed data: <http://127.0.0.1:3000/public/t/demo-charity/a/spring-gala>
- Admin dashboard: <http://127.0.0.1:5173>
- Embed app: <http://127.0.0.1:5174?tenant=demo-charity&auction=spring-gala>
- Third-party widget demo: <http://127.0.0.1:5175>

Expected API readiness behavior:

- `/health` returns `200` with `database: "ok"` when PostgreSQL is reachable.
- `/health` returns `503` with `database: "unavailable"` when PostgreSQL is down or unreachable.
- The public auction endpoint returns `404` if the requested tenant/auction does not exist in PostgreSQL.
