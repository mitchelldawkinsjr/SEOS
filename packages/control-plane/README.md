# @seos/control-plane

Always-on SEOS dispatcher for local-first routing. Run it on any host you choose (VPS, cloud VM, lab box). Skip it entirely when `agents.implementation.strategy` is `cursor-only` (the default).

## Role

- Accept implement jobs from GitHub Actions
- Track worker heartbeats (any attached machine)
- Assign jobs when a worker is healthy
- Escalate to Cursor Cloud (or stub) when workers are offline or return a fallback status

## Run locally

```bash
cd packages/control-plane
CONTROL_PLANE_TOKEN=dev node src/server.mjs
curl -s http://127.0.0.1:8787/healthz
```

## Deploy (any host)

From the repo root (requires SSH to the host you picked):

```bash
# SSH host alias from ~/.ssh/config (e.g. Host vps):
./scripts/deploy-control-plane.sh

# Or explicit host + deploy key:
SEOS_SSH_HOST=<your-host> \
SEOS_SSH_IDENTITY=~/.ssh/<key-authorized-on-host> \
./scripts/deploy-control-plane.sh
```

Installs under `/opt/apps/seos` with Docker Compose by default. Does not modify other apps on the host.

Consumer URL example:

`CONTROL_PLANE_URL=https://seos.example.com`  
(or `http://<your-host>:8787` during bootstrap)

## Auth

Send `Authorization: Bearer $CONTROL_PLANE_TOKEN` on all `/v1/*` routes. `/healthz` is open.

## See also

[Local-First Runtime](../../docs/02-architecture/LOCAL_FIRST_RUNTIME.md)
