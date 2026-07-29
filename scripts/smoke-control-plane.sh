#!/usr/bin/env bash
# Local smoke test for the SEOS control plane (Phase 1 verification).
# Starts the server on a random port, enqueues a job with no Mac worker,
# and asserts fallback_stubbed + worker_offline.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CP="${ROOT}/packages/control-plane"
PORT="${SEOS_SMOKE_PORT:-0}"
TOKEN="${SEOS_SMOKE_TOKEN:-smoke-dev}"
DATA_DIR="$(mktemp -d /tmp/seos-cp-smoke.XXXXXX)"
SERVER_PID=""

if [ "$PORT" = "0" ]; then
  PORT="$(node -e "const n=require('net').createServer();n.listen(0,'127.0.0.1',()=>{console.log(n.address().port);n.close()})")"
fi

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

cd "$CP"
CONTROL_PLANE_TOKEN="$TOKEN" SEOS_DATA_DIR="$DATA_DIR" PORT="$PORT" \
  node src/server.mjs >/tmp/seos-cp-smoke.log 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

curl -fsS "http://127.0.0.1:${PORT}/healthz" | grep -q '"ok":true'

RESP="$(curl -fsS -X POST "http://127.0.0.1:${PORT}/v1/jobs" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber":1,"repo":"mitchelldawkinsjr/SEOS","strategy":"local-first","primary":{"worker":"mac-m1-max"}}')"

echo "$RESP" | grep -q '"status":"fallback_stubbed"'
echo "$RESP" | grep -q '"worker_offline"'
echo "$RESP" | grep -q '"fallbackTriggered":true'

echo "smoke-control-plane: Mac-offline fallback path OK (port=${PORT})"
