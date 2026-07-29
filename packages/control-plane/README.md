# @seos/control-plane

Always-on SEOS dispatcher for local-first routing.

## Role

- Accept implement jobs from GitHub Actions
- Track Mac worker heartbeats
- Assign jobs when the Mac is healthy
- Escalate to Cursor Cloud (or stub) when the Mac is offline or returns a fallback status

## Run locally

```bash
cd packages/control-plane
CONTROL_PLANE_TOKEN=dev node src/server.mjs
curl -s http://127.0.0.1:8787/healthz
```

## Deploy to VPS

From the repo root (requires `ssh vps`):

```bash
./scripts/deploy-control-plane.sh
```

Installs under `/opt/apps/seos` with Docker Compose. Does not modify Fasted.

## Auth

Send `Authorization: Bearer $CONTROL_PLANE_TOKEN` on all `/v1/*` routes. `/healthz` is open.

## See also

[Local-First Runtime](../../docs/02-architecture/LOCAL_FIRST_RUNTIME.md)
