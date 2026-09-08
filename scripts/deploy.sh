#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sms}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

git fetch origin main
git reset --hard origin/main
chmod +x scripts/deploy.sh

docker compose -f "$COMPOSE_FILE" --env-file .env up -d --build
docker image prune -f
