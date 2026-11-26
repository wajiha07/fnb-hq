# F&B HQ — Multi-Outlet Management System

Central HQ system for managing master menus, outlet assignments, per-outlet inventory, sales (POS), and reporting across food & beverage outlets.

**Repository:** [github.com/wajiha07/fnb-hq](https://github.com/wajiha07/fnb-hq)

## Live access (for reviewers)

| How | URL |
|-----|-----|
| **Public demo (HTTPS)** | **https://accepts-arts-cute-expected.trycloudflare.com** — UI + API while Docker & tunnel are running ([details](docs/LIVE_INSTANCE.md)) |
| **Stable cloud** | [Deploy to Render](https://render.com/deploy?repo=https://github.com/wajiha07/fnb-hq) → single **`fnb-hq`** HTTPS URL ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)) |
| **Docker locally** | **http://localhost:8080** (`docker compose up --build -d`) |
| **All-in-one (matches Render)** | **http://localhost:4002** |
| **Local dev** | UI **http://localhost:5173**, API **http://localhost:4000/api/health** |

## Tech stack

- **Backend:** Node.js, Express.js, PostgreSQL
- **Frontend:** React (Vite)
- **Infra:** Docker, docker-compose, optional Render Blueprint

## Architecture (layered monolith)

```
React UI  →  HTTP /api  →  Routes → Controllers → Services → Repositories → PostgreSQL
```

Cross-cutting: `express-validator`, centralized error middleware, environment-based config (`backend/src/config`).

**Full architecture documentation** (required deliverables) is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

| Topic | Location |
|-------|----------|
| **ERD** (tables + relationships) | [Architecture — ERD](docs/ARCHITECTURE.md#erd-entity-relationship-diagram) |
| **Scaling** (10 outlets · 100k txn/month) | [Scaling plan](docs/ARCHITECTURE.md#scaling-plan-10-outlets--100000-transactions--month) |
| **Microservices evolution** | [Conversion to microservices](docs/ARCHITECTURE.md#conversion-to-microservices) |
| **Offline POS + KDS sync** | [Offline POS mode strategy](docs/ARCHITECTURE.md#offline-pos-mode-strategy) |

## Setup instructions

### Quick start (Docker — recommended)

```bash
git clone https://github.com/wajiha07/fnb-hq.git
cd fnb-hq
docker compose up --build
```

- **Web UI (nginx):** http://localhost:8080
- **All-in-one app:** http://localhost:4002 (UI + `/api`, same image as Render)
- **API only:** http://localhost:4001/api/health
- **Postgres (host):** `localhost:5433` (user `fnb`, db `fnb_hq`)

Seed data: company **Demo F&B Group**, 3 outlets, sample menu and inventory.

### Local development

**Prerequisites:** Node.js 20+, PostgreSQL 16+ (or `docker compose up db -d` only).

```bash
# Database (match backend/.env.example)
createdb fnb_hq

# API
cd backend && cp .env.example .env && npm install && npm run migrate && npm run seed && npm run dev

# UI (second terminal)
cd frontend && npm install && npm run dev
```

Vite dev server proxies `/api` → `http://localhost:4000`.

### Verify requirements

```bash
./scripts/requirements-check.sh
```

## API endpoints

Base path: `/api`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/companies` | List companies |
| GET | `/outlets?companyId=` | List outlets |
| POST | `/outlets` | Create outlet |
| GET | `/outlets/:id` | Get outlet |
| GET | `/menu?companyId=` | Master menu |
| POST | `/menu` | Create master menu item |
| POST | `/menu/assign` | Assign item to outlet (price override + initial stock) |
| GET | `/menu/outlet/:outletId` | Outlet-scoped menu only |
| GET | `/outlets/:outletId/inventory` | List inventory |
| PUT | `/outlets/:outletId/inventory` | Set stock |
| POST | `/outlets/:outletId/sales` | Create sale (transactional) |
| GET | `/reports/revenue?companyId=` | Revenue by outlet |
| GET | `/reports/outlets/:outletId/top-items?limit=5` | Top selling items |

**Example — create sale**

```bash
curl -X POST http://localhost:4000/api/outlets/<OUTLET_ID>/sales \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"menuItemId":"<ITEM_ID>","quantity":2}]}'
```

Sales use a DB transaction: lock/check stock → deduct → allocate sequential receipt (`R-00000001`) → insert sale lines. Concurrent requests get unique receipt numbers; stock cannot go negative.

## Schema explanation

### Entity relationships

- A **company** owns many **outlets** and **menu_items** (HQ master catalog).
- **outlet_menu_items** links an outlet to a menu item (optional `price_override`, `is_available`).
- **inventory** stores stock per `(outlet_id, menu_item_id)` with `CHECK (quantity >= 0)`.
- **receipt_sequences** holds per-outlet counters used atomically when creating **sales**.
- Each **sale** has many **sale_items** (quantity, unit price, line total).

### Tables

| Table | Purpose |
|-------|---------|
| `companies` | Tenant / brand |
| `outlets` | Physical locations (`UNIQUE (company_id, code)`) |
| `menu_items` | HQ master catalog (`UNIQUE (company_id, name)`) |
| `outlet_menu_items` | Assignment + optional `price_override` |
| `inventory` | Stock per outlet × item |
| `receipt_sequences` | Atomic per-outlet receipt counters |
| `sales` / `sale_items` | Transactions and line items |

Indexes: FK paths on companies/outlets/menu, inventory keys, `sales(outlet_id, created_at DESC)`. See migration in `backend/src/db/migrate.js`.

## Scaling strategy (summary)

Target: **10 outlets**, **~100,000 sales/month**.

1. Stay a **modular monolith** initially; add **PgBouncer** and a **read replica** for HQ reports.
2. **Pre-aggregate** daily revenue / top items (materialized views or `daily_outlet_stats`).
3. **Partition** `sales` / `sale_items` by month when history grows.
4. Split into domain services only when team ownership or load requires it.

Full analysis (database, reporting, infrastructure, evolution): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#scaling-plan-10-outlets--100000-transactions--month).

## Project structure

```
├── backend/                 # Express API (layered)
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── db/              # migrate, seed
│       ├── middleware/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       └── validators/
├── frontend/                # React + Vite HQ UI
│   ├── Dockerfile
│   ├── nginx.conf.template
│   └── src/
├── docs/
│   ├── ARCHITECTURE.md      # ERD, scaling, microservices, offline POS
│   └── DEPLOYMENT.md
├── scripts/
│   └── requirements-check.sh
├── Dockerfile               # All-in-one image for Render / compose `app`
├── docker-compose.yml
├── render.yaml
├── .github/workflows/ci.yml
├── LICENSE
└── README.md
```

## Assessment / deliverables checklist

| Deliverable | Status | Where |
|-------------|--------|--------|
| Deployed instance for end users | ✅ | [Public HTTPS demo](https://accepts-arts-cute-expected.trycloudflare.com), Docker `:8080`, Render `fnb-hq` ([LIVE_INSTANCE.md](docs/LIVE_INSTANCE.md)) |
| GitHub repository | ✅ | [wajiha07/fnb-hq](https://github.com/wajiha07/fnb-hq) |
| Folder structure | ✅ | See tree above |
| Clean commits | ✅ | Logical history on `main` |
| README (setup, API, schema, architecture, scaling) | ✅ | This file |
| Architecture doc (ERD, scaling, microservices, offline POS) | ✅ | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

| Functional requirement | Status |
|------------------------|--------|
| Master menu + outlet assignment + price override | ✅ |
| Outlet sees only assigned menu | ✅ |
| Per-outlet inventory; sales deduct stock; no negative stock | ✅ |
| Multi-item sales, sequential receipts, concurrency-safe transactions | ✅ |
| Revenue by outlet + top 5 items | ✅ |
| Layered architecture, validation, errors, env config | ✅ |
| DB constraints + indexes | ✅ |
| Docker + docker-compose | ✅ |

## License

MIT — see [LICENSE](LICENSE).