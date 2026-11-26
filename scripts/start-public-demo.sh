#!/usr/bin/env bash
# Expose docker UI (:8080) via a temporary public HTTPS URL (requires cloudflared).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! curl -sf http://127.0.0.1:8080/api/health >/dev/null; then
  echo "Starting Docker stack..."
  docker compose up --build -d db api web
  for i in $(seq 1 30); do
    curl -sf http://127.0.0.1:8080/api/health >/dev/null && break
    sleep 2
  done
fi

if ! command -v cloudflared >/dev/null; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

echo "Public URL will appear below (trycloudflare.com):"
exec cloudflared tunnel --url http://127.0.0.1:8080