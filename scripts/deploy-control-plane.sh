#!/usr/bin/env bash
# Deploy SEOS control plane to the prod VPS via `ssh vps`.
# Installs under /opt/apps/seos — does not touch Fasted (/opt/apps/fasted-calendar).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${SEOS_SSH_HOST:-vps}"
DEPLOY_DIR="${SEOS_DEPLOY_DIR:-/opt/apps/seos}"
SRC="${ROOT}/packages/control-plane"

# Prefer Cursor/host forwarded agent when present
if [ -z "${SSH_AUTH_SOCK:-}" ] && [ -S /run/host-services/ssh-auth.sock ]; then
  export SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE_HOST" 'echo ok' >/dev/null; then
  echo "ERROR: cannot ssh to ${REMOTE_HOST}."
  echo "Ensure ~/.ssh/config has:"
  echo "  Host vps"
  echo "    HostName <your-vps-ip>"
  echo "    User root   # or ubuntu"
  echo "    IdentityFile ~/.ssh/<key-authorized-on-vps>"
  echo "Or load that key into ssh-agent before running this script."
  exit 1
fi

echo "Deploying SEOS control plane to ${REMOTE_HOST}:${DEPLOY_DIR}"

ssh "$REMOTE_HOST" "mkdir -p '${DEPLOY_DIR}/data'"

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'data' \
  --exclude '.env' \
  --exclude 'test' \
  "${SRC}/" "${REMOTE_HOST}:${DEPLOY_DIR}/"

# Preserve existing .env; seed from example if missing
ssh "$REMOTE_HOST" "
  set -euo pipefail
  cd '${DEPLOY_DIR}'
  if [ ! -f .env ]; then
    cp .env.example .env
    # Generate a token if still placeholder
    if grep -q 'change-me' .env; then
      TOKEN=\$(openssl rand -hex 24)
      sed -i \"s/change-me/\${TOKEN}/\" .env
      echo \"Generated CONTROL_PLANE_TOKEN in ${DEPLOY_DIR}/.env\"
    fi
  fi
  docker compose build
  docker compose up -d
  sleep 3
  docker compose ps
  curl -fsS http://127.0.0.1:\${SEOS_PUBLISH_PORT:-8787}/healthz
  echo
  echo 'Control plane health check passed.'
  echo 'Set CURSOR_API_KEY and GH_TOKEN in ${DEPLOY_DIR}/.env for live Cursor fallback.'
"

echo ""
echo "Done. From a consumer repo, set:"
echo "  CONTROL_PLANE_URL=http://<vps-host>:8787   # or https via reverse proxy"
echo "  CONTROL_PLANE_TOKEN=<from ${DEPLOY_DIR}/.env>"
echo "  agents.implementation.strategy: local-first"
