# Development and maintenance

This guide describes the current repository and its supported local workflows. Commands are run from the repository root unless another directory is named.

## Requirements

Use Docker Desktop for the complete local stack. Host development also needs a supported Node.js version and pnpm 9.15.0. The exact Node ranges are declared in [package.json](../../package.json); the application Dockerfiles use Node 24.

PostgreSQL must include pgvector. The supplied Compose files use `pgvector/pgvector:pg15`, and Redis uses `redis:7-alpine`. A plain PostgreSQL image without the extension does not provide the vector storage needed by the schema.

## Run through Docker

Copy [.env.example](../../.env.example) to `.env`. In PowerShell, use `Copy-Item .env.example .env`; in a POSIX shell, use `cp .env.example .env`.

Set independent database and Redis passwords and a random `JWT_SECRET` of at least 48 characters. Keep `DATABASE_URL` and `REDIS_URL` consistent with the credentials. The root template uses Docker service names `db` and `redis` for container connections. With `WEB_PORT=8080`, set `FRONTEND_URL=http://localhost:8080` and include that origin in the CORS configuration.

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

The migration service applies committed migrations before the API and worker start. Nginx serves the frontend on the configured web port and forwards API traffic internally. Database and Redis volumes preserve data across container restarts. Development and production Compose use different project volumes; switching files does not transfer data between them.

Editing environment variables does not update credentials stored in an existing database. Check the existing instance and its migration history before reusing a volume with changed settings. Database removal or reset is not part of ordinary setup.

## Develop on the host

Use the development Compose file to start database services:

```sh
docker compose up -d db redis
```

Create a private `apps/server/.env` using the root template as a starting point. For host processes, change the database hostname to `127.0.0.1` and port to `5435`, and the Redis hostname to `127.0.0.1` and port to `6379`. Retain the credentials configured for those services. Set `NODE_ENV=development`, `FRONTEND_URL=http://localhost:5173`, and the matching CORS origin.

```sh
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install --frozen-lockfile
pnpm --filter server exec prisma generate
pnpm --filter server db:deploy
pnpm -r run build
pnpm dev
```

Vite serves the frontend at <http://localhost:5173> and proxies API traffic to port 3000 by default. `KRAMA_API_TARGET` can select another local API during testing. The server development command also starts the background worker.

## Repository responsibilities

| Directory | Responsibility |
| --- | --- |
| `apps/server/src/routes` and `controllers` | HTTP routing, request handling, authentication and role policies |
| `apps/server/src/services` and `repositories` | Business rules and database access |
| `apps/server/src/events`, `queues`, and `workers` | Committed domain events and background processing |
| `apps/server/prisma` | Database schema and reproducible migration history |
| `apps/web/src/components` | Screens and feature presentation |
| `apps/web/src/hooks`, `contexts`, and `providers` | Queries, actions, authentication and cross-screen synchronization |
| `packages/types` and `packages/validation` | Shared contracts and runtime validation |
| `e2e/unit`, `e2e/mocked`, and `e2e/live` | Module regressions, mocked browser flows and real-backend flows |

Workspace IDs from a client request select a scope; they do not prove access. Middleware verifies membership, and services validate that related records belong to the same workspace. Versioned writes reject stale input. Domain events are published after successful database commits so clients do not observe rolled-back changes.

HTTP request and response contracts live in `packages/types/src/api.ts`, `planner.ts` and `records.ts`. Their dates are JSON strings, and they have no Prisma imports. The frontend consumes those contracts without generating a database client. Update them alongside changes to an endpoint's payload; database-only fields do not belong in a public response merely because the model contains them.

Docker installs dependencies for the selected application and its shared packages. The API runtime excludes frontend packages, and the web build does not generate Prisma Client.

Calendar dates and event timestamps have different meanings. Date keys use `YYYY-MM-DD` and shared helpers; focus start and end times are real instants. Stored focus duration is in seconds, while planner estimates and capacity are in minutes.

## Configure optional services

Groq and Gemini keys enable their respective AI capabilities. Text completion availability does not establish that embedding generation is configured; check the embedding provider separately. Provider model identifiers are maintained in the server source, so copied identifiers in older audit notes are not current configuration instructions.

Unsplash is optional for wallpaper search. Bundled wallpapers and gradients remain available without it. Image uploads are Coming soon while R2 settings are absent. Keep all credentials in private environment files.

Indian regional holidays for 2026 are bundled. Optional external providers can supply other supported calendar data. The [holiday data guide](../../apps/server/src/services/holidays/data/README.md) explains the source coverage and annual maintenance requirements.

## Run local checks

```sh
pnpm -r run lint
pnpm -r run build
pnpm exec tsc --noEmit -p tsconfig.json
pnpm --filter @krama/validation test
pnpm --filter server test
pnpm exec playwright install chromium
pnpm test:ui
```

The default backend test command runs unit suites against deliberately unreachable database and Redis URLs. Database-backed suites use `test:integration`. Default Playwright checks start only the frontend and use module tests or mocked API responses.

### Backend integration tests

Set `TEST_DATABASE_URL` to a separate PostgreSQL database whose name ends in `_test`, and set `TEST_REDIS_URL` to a dedicated Redis database numbered 1 through 15. Keep the application URLs pointed at the normal application stores so the guard can compare them. The database account needs permission to create the test database if it does not already exist.

```sh
pnpm --filter server test:integration
pnpm --filter server test:startup
```

The integration preparation script creates the dedicated database when needed and applies committed migrations. The test runner then selects the isolated URLs and supplies its run identity. It refuses to use the same database or Redis target as the application. Configure the test variables in the invoking environment or private server environment file.

### Live browser tests

Live checks use [playwright.integration.config.ts](../../playwright.integration.config.ts). Start a dedicated API and worker against the test database and Redis target. The browser test process needs `DATABASE_URL=TEST_DATABASE_URL` and `REDIS_URL=TEST_REDIS_URL`; preserve the normal targets through `KRAMA_PRIMARY_DATABASE_URL` and `KRAMA_PRIMARY_REDIS_URL` when comparing environments. The API target must be local HTTP.

List the scenarios before selecting a suite:

```sh
pnpm test:e2e --list
```

Live scenarios have explicit opt-in variables:

| Suite | Opt-in variable |
| --- | --- |
| Brain and Planner | `KRAMA_LIVE_VERIFY=1` |
| Projects | `KRAMA_PROJECTS_VERIFY=1` |
| Goals and Habits | `KRAMA_GOALS_HABITS_VERIFY=1` |
| Execution board | `KRAMA_EXECUTION_BOARD_VERIFY=1` |
| Dashboard | `KRAMA_DASHBOARD_VERIFY=1` |
| Connected workflows | `KRAMA_CROSS_SECTION_VERIFY=1` |
| UI restoration | `KRAMA_UI_RESTORATION_VERIFY=1` |
| Real AI and embedding checks | `KRAMA_AI_VERIFY=1`, with valid provider credentials |

Run the chosen scenarios with `pnpm test:e2e`. Without the relevant opt-ins, tests can be skipped; a skipped provider check is not evidence that the provider works. Dedicated test APIs may use higher authentication limits for repeated synthetic logins, such as `AUTH_RATE_LIMIT_MAX=500` and `REFRESH_RATE_LIMIT_MAX=500`. Keep ordinary application limits unchanged.

## Back up and restore a personal workspace

A full PostgreSQL backup preserves accounts, workspace memberships, documents and their versions, tasks, goals, habits, Planner records, Focus sessions, and links between them. The workspace JSON export is useful for inspecting or taking data elsewhere; Krama currently has no JSON import workflow.

Keep database backups private because they include account records and session data. Save private environment settings separately in a secure location. Database backups do not include provider credentials or uploaded files. R2 uploads remain Coming soon.

For the production Compose stack, create a custom-format dump inside the database container and copy it to a private backup location. These commands work in PowerShell and POSIX shells without redirecting binary output through the terminal:

```sh
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --file=/tmp/krama-backup.dump'
docker compose -f docker-compose.prod.yml cp db:/tmp/krama-backup.dump ./krama-backup.dump
docker compose -f docker-compose.prod.yml exec -T db rm /tmp/krama-backup.dump
```

Move the copied dump to your private backup location. Do not commit it. For host development, use the development Compose file instead.

Practice restoration into a new database on a compatible PostgreSQL instance with pgvector installed. The example below uses `krama_restore_test`; choose a name that does not already exist. Pause the API and worker during the recovery exercise, and keep the original database intact.

```sh
docker compose -f docker-compose.prod.yml cp ./krama-backup.dump db:/tmp/krama-backup.dump
docker compose -f docker-compose.prod.yml exec -T db sh -c 'createdb -U "$POSTGRES_USER" krama_restore_test'
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d krama_restore_test --exit-on-error --no-owner --no-privileges /tmp/krama-backup.dump'
docker compose -f docker-compose.prod.yml exec -T db rm /tmp/krama-backup.dump
```

Point a separate verification API at the restored database and a separate Redis database. Confirm login, workspace access, document bodies and versions, linked tasks and projects, habit history, goals, Planner blocks, and completed Focus sessions before selecting the restored database for ordinary use. Existing sessions may require signing in again when the signing secret changes. Retain the original database until recovery has been confirmed.

The October 11, 2026 recovery exercise used disposable services. All 33 public tables and 32 records matched exactly after restoration, including a representative set of linked workspace records. Login and authenticated workspace access were checked through an API using the restored database. This establishes that procedure on the tested environment; periodically repeat it with a recent private backup.

## Continuous integration

The [workflow](../../.github/workflows/ci.yml) runs two jobs. `build-and-test` starts PostgreSQL with pgvector and Redis, generates Prisma Client, prepares a disposable schema, and runs lint, builds, type checks, validation tests, backend tests, and browser checks. Integration suites use a separate test database and Redis database. Failures return nonzero exit codes.

`production-images` validates production Compose and builds the migration, server, and web images using disposable environment values. It does not start the services. Dockerfiles pin pnpm and install from the frozen lockfile.

A GitHub rerun uses the same commit as the original run. It cannot pick up a fix on another branch. Check the run's commit and the PR merge state when investigating a repeated failure.

## Common problems

If Prisma cannot connect, check whether PostgreSQL is running and whether the URL belongs to a host process or a container. Container hostnames such as `db` are not host-loopback addresses. For migration problems, follow the [migration notes](../../apps/server/prisma/migrations/README.md) before changing migration state.

An unavailable AI provider should produce a recoverable state, not a successful-looking empty answer. Check configured keys and the source model constants. If uploads are disabled, the Coming soon message is expected until R2 is configured.

Application liveness is available at `/health` and dependency readiness at `/ready` on the API. Nginx forwards `/health` for the web endpoint. The production API port is internal, while the development Compose file exposes it on loopback port 3000.
