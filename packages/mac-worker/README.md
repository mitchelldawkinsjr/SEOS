# @seos/mac-worker

Local SEOS worker for the MacBook Pro (M1 Max). Registers with the VPS control plane, claims one job at a time, runs a local harness, and posts structured results.

## Setup

1. Install [Ollama](https://ollama.com) and pull `qwen2.5-coder:7b`.
2. Point the worker at your control plane:

```bash
export CONTROL_PLANE_URL=https://seos.example.com   # or http://VPS:8787
export CONTROL_PLANE_TOKEN=...
export SEOS_WORKER_ID=mac-m1-max
cd packages/mac-worker
npm start
```

## Harness modes

| `SEOS_WORKER_HARNESS` | Behavior |
|----------------------|----------|
| `dry` (default) | No edits; returns `no_changes` + `fallbackRecommended` (safe smoke) |
| `shell` | Runs `SEOS_WORKER_COMMAND` with `{issue}`, `{repo}`, `{branch}`, `{model}`, `{workdir}` |

Wire OpenCode, Aider, or a custom Ollama harness via `SEOS_WORKER_COMMAND`.

## Concurrency

The worker sets `busy: true` while a job runs and only claims when idle — one heavy local AI task at a time.

## See also

[Local-First Runtime](../../docs/02-architecture/LOCAL_FIRST_RUNTIME.md)
