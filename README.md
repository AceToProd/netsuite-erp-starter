# NetSuite-like Mini-ERP Starter

A small but real **NetSuite-style mini-ERP**, built as a **polyglot** app and orchestrated
end-to-end by **ace-engine** from a single [`ace.json`](./ace.json). It runs locally with
**zero infrastructure** (embedded H2 + in-memory cache) and is designed to be published as a
**PaaS starter** backed by Cloud SQL (Postgres) + Memorystore (Redis).

## Architecture

| Service     | Stack                              | Port (default) | Role                                                                 |
|-------------|------------------------------------|----------------|----------------------------------------------------------------------|
| `erp-core`  | Java 21 · Spring Boot · JPA · Flyway | `8080`         | The ERP domain core (system of record). Postgres, with H2 fallback.  |
| `reporting` | NestJS (TypeScript)                | `3000`         | Reporting + **API gateway** — aggregates from `erp-core`, caches in Redis, proxies CRUD for the SPA. |
| `frontend`  | React + Vite + TypeScript          | `5174`         | Dashboard SPA — Customers, Items, Sales Orders, Reports.             |

Shared `cloud_resources`: **PostgreSQL** (`DATABASE_URL`) and **Redis** (`REDIS_URL`).

```
                 ┌────────────┐      /api proxy       ┌──────────────┐
   browser  ───▶ │  frontend  │ ───────────────────▶  │  reporting   │
                 │  (Vite SPA)│                        │  (NestJS)    │
                 └────────────┘                        └──────┬───────┘
                                                              │ HTTP (ERP_CORE_URL)
                                                       ┌──────▼───────┐     ┌────────────┐
                                                       │   erp-core   │ ──▶ │ Postgres/H2│
                                                       │ (Spring Boot)│     └────────────┘
                                                       └──────────────┘
                          reporting caches aggregations in Redis (in-memory fallback)
```

### ERP domain (erp-core)

- **Customer**, **Item** (`sku` / `name` / `priceCents`)
- **SalesOrder** (header) + **SalesOrderLine** (lines)
- **Account** (GL chart) + **JournalEntry** — posting a sales order writes a balanced pair
  of entries (DR *Accounts Receivable* / CR *Sales Revenue*).
- Flyway seeds the chart of accounts, demo customers, and items on Postgres; on H2 the same
  rows are inserted by an idempotent `DataSeeder`.

REST (`/api`):

| Method & path                  | Description                                                        |
|--------------------------------|--------------------------------------------------------------------|
| `GET  /api/health`             | Status + DB connectivity (`{db:{status, product, url}}`).          |
| `GET/POST /api/customers`      | List / create customers.                                           |
| `GET/POST /api/items`          | List / create items.                                               |
| `GET  /api/sales-orders`       | List order headers.                                                |
| `POST /api/sales-orders`       | Create an order — posts lines + a journal entry, returns the full order. |
| `GET  /api/sales-orders/{id}`  | Order header + lines + journal entries.                            |

### Reporting + gateway (reporting)

| Method & path                       | Description                                                  |
|-------------------------------------|--------------------------------------------------------------|
| `GET /api/health`                   | Status + cache backend (`redis`/`memory`) + erp-core reach.  |
| `GET /api/reports/revenue`          | Sum of posted-order totals + count (Redis-cached 30s).       |
| `GET /api/reports/sales-summary`    | Totals by customer and by item (Redis-cached 30s).           |
| `GET/POST /api/customers`           | Passthrough to erp-core.                                     |
| `GET/POST /api/items`               | Passthrough to erp-core.                                     |
| `GET/POST /api/sales-orders`, `GET /api/sales-orders/{id}` | Passthrough to erp-core.              |

The SPA only ever talks to `reporting` (one base URL).

## Running locally

### Option A — Zero-infra (no Postgres, no Redis)

`erp-core` falls back to an **embedded in-memory H2** database and `reporting` falls back to an
**in-memory cache**. Nothing else to install beyond the toolchains.

```bash
# 0) install JS deps + build everything (or run ./ace-setup.sh)
pnpm install
pnpm run build           # builds erp-core (mvn), reporting (nest), frontend (vite)

# 1) terminal 1 — ERP core (Java)
PORT=8080 java -jar services/erp-core/target/erp-core.jar
#   (or: pnpm run dev:erp-core   # mvn spring-boot:run)

# 2) terminal 2 — reporting gateway (NestJS)
PORT=3000 ERP_CORE_URL=http://localhost:8080 pnpm run dev:reporting

# 3) terminal 3 — frontend (Vite)
VITE_PORT=5174 VITE_API_TARGET=http://localhost:3000 pnpm run dev:frontend
```

Open <http://localhost:5174>. Demo data is seeded automatically (`SEED_DEMO=1`).

Quick smoke test:

```bash
curl localhost:8080/api/health      # erp-core + H2 connectivity
curl localhost:3000/api/health      # reporting + cache backend + core reachability
curl localhost:3000/api/reports/revenue
curl localhost:3000/api/reports/sales-summary
```

### Option B — With Postgres + Redis

```bash
# Postgres + Redis (any host works; Docker example below)
docker run -d --name erp-pg    -e POSTGRES_USER=erp -e POSTGRES_PASSWORD=erp -e POSTGRES_DB=erp -p 5432:5432 postgres:16
docker run -d --name erp-redis -p 6379:6379 redis:7

# 1) erp-core against Postgres (Flyway runs migrations + seeds)
PORT=8080 DATABASE_URL='postgres://erp:erp@localhost:5432/erp' \
  java -jar services/erp-core/target/erp-core.jar

# 2) reporting with Redis caching
PORT=3000 ERP_CORE_URL=http://localhost:8080 REDIS_URL='redis://localhost:6379' \
  pnpm run dev:reporting

# 3) frontend (same as above)
VITE_PORT=5174 VITE_API_TARGET=http://localhost:3000 pnpm run dev:frontend
```

`DATABASE_URL` accepts either the cloud/Heroku form `postgres://user:pass@host:port/db`
(auto-parsed into Spring datasource props + the `postgres` profile) **or** a verbatim
`jdbc:postgresql://...` URL.

## How the engine runs it (ace.json)

`ace-engine` reads [`ace.json`](./ace.json) and:

1. Provisions the `cloud_resources` (Cloud SQL → `DATABASE_URL`, Memorystore → `REDIS_URL`).
2. Runs `instance_init.setup_script` ([`ace-setup.sh`](./ace-setup.sh)) once to install the
   polyglot toolchain (JDK 21 + Maven, **user-local, no sudo**), ensure `pnpm`, and **build
   every service** so their start commands have artifacts.
3. Starts services by `start_order`: `erp-core` (10) → `reporting` (20) → `frontend` (30),
   injecting `PORT` / `ACE_SERVICE_PORT` and substituting `{ace_port}` in command strings
   (e.g. `java -jar … --server.port={ace_port}`). Node services read `process.env.PORT`; Vite
   reads `VITE_PORT`/`PORT`.
4. Health-checks each service (`/api/health`; `/` for the SPA).

Every service binds `0.0.0.0` and reads its port from the environment, so the same artifacts
run unchanged in `dev`, `preview` (branch `qa`), and `production` (branch `prod`) — the
`environments` block swaps dev commands for prebuilt-artifact commands
(`java -jar …`, `node dist/main`, `npx serve -s dist -l 80`).

## Publishing as a PaaS starter

1. Verify all three services are healthy locally (zero-infra is fine).
2. Commit the repo (toolchain artifacts under `target/` and `dist/` are git-ignored; the engine
   rebuilds them via `ace-setup.sh`).
3. In **DevLay → Marketplace → "Make as Starter / Publish PaaS"**, publish this `ace.json`.
4. Provision customer instances from the published starter; each gets its own Cloud SQL +
   Memorystore wired to `DATABASE_URL` / `REDIS_URL` automatically.

## Repo layout

```
netsuite-erp-starter/
├── ace.json                 # engine manifest (services, cloud_resources, environments)
├── ace-setup.sh             # polyglot toolchain bootstrap + build-all (idempotent, no sudo)
├── package.json             # pnpm workspace root scripts (dev:* / build:* / build / typecheck)
├── pnpm-workspace.yaml      # services/reporting + services/frontend
├── services/
│   ├── erp-core/            # Java Spring Boot (Maven → target/erp-core.jar)
│   │   └── src/main/{java,resources}  (entities, repos, controllers, Flyway, H2 fallback)
│   ├── reporting/           # NestJS gateway + reports (Redis / in-memory cache)
│   └── frontend/            # React + Vite SPA
└── README.md
```

## Root scripts

| Script                       | What it does                                            |
|------------------------------|---------------------------------------------------------|
| `pnpm run build`             | Build all three services (mvn package + nest + vite).   |
| `pnpm run build:node`        | Build only reporting + frontend.                        |
| `pnpm run build:erp-core`    | `mvn -q -f services/erp-core/pom.xml -DskipTests package` |
| `pnpm run dev:erp-core`      | `mvn spring-boot:run` (or run the jar directly).        |
| `pnpm run dev:reporting`     | `nest start --watch`.                                   |
| `pnpm run dev:frontend`      | `vite`.                                                 |
| `pnpm run typecheck`         | `tsc --noEmit` for reporting + frontend.                |
