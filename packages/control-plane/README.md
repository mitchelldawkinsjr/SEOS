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

From the repo root, run the Mac-offline fallback smoke test:

```bash
npm run smoke:control-plane
```

## Deploy to VPS

From the repo root (requires SSH to the prod VPS):

```bash
# Tailscale Host "vps" (may prompt for browser auth):
./scripts/deploy-control-plane.sh

# Or public IP + deploy key (works from this laptop without Tailscale SSH):
SEOS_SSH_HOST=82.25.91.63 \
SEOS_SSH_IDENTITY=~/.ssh/github_actions_deploy \
./scripts/deploy-control-plane.sh
```

Installs under `/opt/apps/seos` with Docker Compose. Does not modify Fasted.

Prod consumer URL (until `seos.360web.cloud` DNS CNAME exists):

`CONTROL_PLANE_URL=http://82.25.91.63:8787`

## Auth

Send `Authorization: Bearer $CONTROL_PLANE_TOKEN` on all `/v1/*` routes. `/healthz` is open.

## See also

[Local-First Runtime](../../docs/02-architecture/LOCAL_FIRST_RUNTIME.md)
