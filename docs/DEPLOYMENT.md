# Deployment Guide

End users can access the system via **Docker locally**, **Render (recommended cloud)**, or any VPS that runs `docker compose`.

## Option A — Docker (single machine)

```bash
git clone https://github.com/wajiha07/fnb-hq.git
cd fnb-hq
docker compose up --build -d
```

| Surface | URL |
|---------|-----|
| Web UI | http://localhost:8080 |
| API health | http://localhost:4000/api/health |

Postgres is exposed on host port **5433** (not 5432) to avoid clashing with a local Postgres install.

## Option B — Render (public URL for reviewers — **required for stable hosting**)

1. Use [github.com/wajiha07/fnb-hq](https://github.com/wajiha07/fnb-hq).
2. [Deploy to Render](https://render.com/deploy?repo=https://github.com/wajiha07/fnb-hq) or Dashboard → **New** → **Blueprint** → apply `render.yaml`.
3. Wait for **`fnb-hq`** (web) and **`fnb-db`** to become healthy (migrate + seed run on container start).
4. Open the **`fnb-hq`** HTTPS URL — UI and `/api` on **one** public endpoint (root `Dockerfile`).

See also [docs/LIVE_INSTANCE.md](LIVE_INSTANCE.md) for optional trycloudflare demo script.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/wajiha07/fnb-hq)

## Option C — Local development (hot reload)

See [README.md](../README.md) — backend on `:4000`, Vite UI on `:5173`.

## Verify deployment

```bash
BASE_URL=https://your-api-host/api ./scripts/requirements-check.sh
```

Or against local API:

```bash
./scripts/requirements-check.sh
```

## Environment

| Variable | Service | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | API | Postgres connection string |
| `PORT` | API | Listen port (default 4000) |
| `API_UPSTREAM` | Web (nginx) | `host:port` of API (`api:4000` in compose; Render sets this automatically) |

Do not commit `.env` files; use `.env.example` for local values.