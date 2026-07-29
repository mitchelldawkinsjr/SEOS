# Local-First Runtime

> Status: **Partial (Phase 1)**. The Agent Runtime can route implementation to a local Mac worker when healthy, and fall back to Cursor Cloud with branch-preserving handoff. GitHub Actions remains the event source; the VPS hosts the control plane.

## Responsibility matrix

| Component | Primary responsibility |
|-----------|------------------------|
| GitHub Actions | Issue/label events, concurrency, calling the router |
| VPS control plane | Queue, worker health, dispatch, retries, Cursor fallback |
| MacBook worker | Local planning/coding/testing, draft PR preparation |
| Cursor Cloud | Mac offline, timeouts, validation failure, complex/high-risk work |
| Human | Review and merge approval |

## Flow

```mermaid
flowchart TD
  ready[ready_label]
  gha[GitHub_Actions]
  router[dispatch_router]
  strategy{strategy_local_first}
  vps[VPS_control_plane]
  macHealthy{Mac_worker_healthy}
  mac[Mac_worker]
  cursor[Cursor_Cloud]
  draft[Draft_PR]
  human[Human_merge]

  ready --> gha --> router --> strategy
  strategy -->|no| cursor
  strategy -->|yes| vps --> macHealthy
  macHealthy -->|yes| mac
  macHealthy -->|no| cursor
  mac -->|success| draft
  mac -->|fallback_statuses| cursor
  cursor --> draft --> human
```

## Configuration

Default remains **cursor-only**. Opt in via `.github/seos.yml`:

```yaml
agents:
  implementation:
    strategy: local-first
    primary:
      worker: mac-m1-max
      provider: ollama
      model: qwen2.5-coder:7b
    fallback:
      provider: cursor-cloud
      model: composer-2.5
    policy:
      max_local_attempts: 2
      timeout_minutes: 35
      require_changes: true
      require_validation: true
controlPlane:
  url: https://seos.example.com
```

Secrets / env for Actions and the control plane:

- `CONTROL_PLANE_URL` (or `controlPlane.url`)
- `CONTROL_PLANE_TOKEN`
- `CURSOR_API_KEY` (fallback provider)
- `GH_TOKEN` / GitHub token with issue + PR permissions

## Control plane (VPS)

Deployed to `/opt/apps/seos` (Docker Compose). Endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/healthz` | Liveness |
| `POST` | `/v1/jobs` | Enqueue implement job (from GHA) |
| `GET` | `/v1/jobs/:id` | Job status |
| `POST` | `/v1/workers/heartbeat` | Mac registration + health |
| `GET` | `/v1/workers` | List workers |
| `POST` | `/v1/workers/:id/claim` | Claim next queued job |
| `POST` | `/v1/jobs/:id/result` | Structured agent result |

Auth: `Authorization: Bearer <CONTROL_PLANE_TOKEN>`.

## Worker registration

The Mac registers with declared capabilities:

```yaml
worker:
  id: mac-m1-max
  capabilities:
    - local-llm
    - planning
    - coding
    - testing
    - review
    - documentation
    - docker
    - 64gb-unified-memory
```

Phase 1 concurrency: **one** heavy local job at a time (`seos-mac-worker`).

## Structured agent results

```json
{
  "status": "validation_failed",
  "agent": "implementation",
  "worker": "mac-m1-max",
  "model": "qwen2.5-coder:7b",
  "attempts": 2,
  "changedFiles": 4,
  "branch": "seos/issue-142",
  "failedCommands": ["npm test"],
  "summary": "Implementation completed, but two integration tests remain failing.",
  "fallbackRecommended": true,
  "diff": "...",
  "changedFileList": ["src/a.ts", "src/b.ts"]
}
```

Recommended statuses:

`success` · `failed` · `blocked` · `timeout` · `worker_offline` · `model_unavailable` · `no_changes` · `invalid_patch` · `validation_failed`

## Cursor Cloud fallback

Escalate when:

- Mac worker offline / heartbeat stale
- Local model unavailable
- Local timeout
- No valid changes
- Invalid patch
- Validation failed after allowed repair attempts
- Max local attempts reached
- Task labeled for cloud / security-critical / architecture-heavy (Phase 2+ policy)

On escalation, Cursor continues from local work:

- Original issue + specification
- Current branch (`startingRef` = local branch, not default branch)
- Diff, changed files, failed commands, local summary

## Packages

| Package | Role |
|---------|------|
| [`packages/control-plane`](../../packages/control-plane/) | VPS dispatcher service |
| [`packages/mac-worker`](../../packages/mac-worker/) | Local worker heartbeat + job loop |
| [`packages/dispatch`](../../packages/dispatch/) | Router, Cursor provider, handoff builder |

## Deploy

```bash
# Host "vps" in ~/.ssh/config (Tailscale may require browser auth), or:
SEOS_SSH_HOST=82.25.91.63 \
SEOS_SSH_IDENTITY=~/.ssh/github_actions_deploy \
./scripts/deploy-control-plane.sh
```

Prod install path: `/opt/apps/seos` (Docker Compose). Nginx Proxy Manager has a host for `seos.360web.cloud` → `:8787`; add a DNS CNAME (alias of `360web.cloud`) before relying on HTTPS. Until then, consumers can use `CONTROL_PLANE_URL=http://82.25.91.63:8787`.

See [`packages/control-plane/README.md`](../../packages/control-plane/README.md).

## Related reading

- [Architecture Overview](OVERVIEW.md)
- [Coding Agent](../03-agents/CODING_AGENT.md)
- [Human Gates](../01-concepts/HUMAN_GATES.md)
- [Roadmap](../00-vision/ROADMAP.md)
