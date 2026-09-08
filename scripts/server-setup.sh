#!/usr/bin/env bash
# VDS uzerinde bir kez calistirilir. Docker kurar, repoyu /opt/sms altina klonlar.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ceytek/sms.git}"
APP_DIR="${APP_DIR:-/opt/sms}"
PUBLIC_URL="${PUBLIC_URL:-http://185.92.2.38}"

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl git gnupg

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
fi

chmod +x "$APP_DIR/scripts/deploy.sh"

if [ ! -f "$APP_DIR/.env" ]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  DATABASE_PASSWORD="$(openssl rand -hex 16)"
  cat > "$APP_DIR/.env" <<EOF
FRONTEND_URL=${PUBLIC_URL}
NEXT_PUBLIC_API_URL=${PUBLIC_URL}:3001
DATABASE_USER=sms_user
DATABASE_PASSWORD=${DATABASE_PASSWORD}
DATABASE_NAME=sms_db
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=24h
EOF
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 80/tcp || true
  ufw allow 3001/tcp || true
  ufw allow 8000/tcp || true
fi

cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
