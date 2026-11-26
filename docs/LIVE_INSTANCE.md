# Live instance (end-user access)

## Permanent production (recommended for assessors)

1. Open [Deploy to Render](https://render.com/deploy?repo=https://github.com/wajiha07/fnb-hq) (sign in with GitHub).
2. Apply Blueprint `render.yaml` (service **`fnb-hq`** + Postgres **`fnb-db`**).
3. When deploy finishes, open the **`fnb-hq`** service URL — one HTTPS endpoint serves the React UI and `/api`.

The root [`Dockerfile`](../Dockerfile) builds API + UI into a single container (migrate + seed on boot).

## Docker on your machine

```bash
docker compose up --build -d
```

| Entry point | URL |
|-------------|-----|
| **Production-style UI (nginx)** | http://localhost:8080 |
| **All-in-one app (same as Render)** | http://localhost:4002 |
| **API only** | http://localhost:4001/api/health |

## Temporary public HTTPS demo (optional)

While your laptop is on and Docker is running:

```bash
./scripts/start-public-demo.sh
```

Cloudflared prints a `*.trycloudflare.com` URL. This is useful for quick reviewer access; for a **stable** URL use Render above.

**Current demo** (if tunnel process is running):

- **App:** https://accepts-arts-cute-expected.trycloudflare.com
- **Health:** https://accepts-arts-cute-expected.trycloudflare.com/api/health