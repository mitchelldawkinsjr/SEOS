# @seos/mac-worker

Reference **worker client** for SEOS local-first routing. The package name reflects the first proving ground (a Mac), but the process runs on **any system you want tied into SEOS** — Mac, Linux, workstation, lab box.

It registers with *your* control plane (any host — or unused when strategy is `cursor-only`), claims one job at a time, runs a local harness, and posts structured results.

## Setup

1. Install a local model runtime if your harness needs one (e.g. [Ollama](https://ollama.com) + `qwen2.5-coder:7b`).
2. Point the worker at your control plane:

```bash
export CONTROL_PLANE_URL=https://seos.example.com   # or http://<control-plane-host>:8787
export CONTROL_PLANE_TOKEN=...
export SEOS_WORKER_ID=my-worker-1   # any id you choose
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
