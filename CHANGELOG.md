# Changelog

## Unreleased

- **CLI is now installable via `npx @mitchdawkinsjr/seos init`.** The `@mitchdawkinsjr/seos` package is self-contained: it bundles `workflows/`, `context/`, and the `packages/dispatch/` runtime scripts into `packages/cli/assets/` at publish time. `seos.mjs` resolves assets relative to itself (installed package) with a fallback to the monorepo root (dev clone), so `npx @mitchdawkinsjr/seos init` works in any repo without cloning SEOS. The bin name is `seos`. Added `scripts/sync-cli-bundle.mjs` (run via `npm run bundle` and the `prepublishOnly` hook), gitignored `packages/cli/assets/`, a validate check, and bumped to `0.3.0`. Published as a scoped package (`@mitchdawkinsjr/seos`) with `--access=public` because npm rejected the unscoped `seos` name as too similar to existing packages.

- **Local-first runtime (Phase 1):**
  - VPS control plane (`packages/control-plane`) — job queue, Mac worker heartbeats, Cursor fallback/stub.
  - Mac worker scaffold (`packages/mac-worker`) — one-job-at-a-time heartbeat/claim/result loop.
  - Implement router (`route-implement.mjs`) — `cursor-only` (default) or `local-first` via control plane.
  - Preserve-work Cursor handoff (`build-cursor-handoff.mjs`); `dispatchCursorAgent({ startingRef })` for escalation.
  - `seos.yml` `agents.implementation` + `controlPlane.url`; deploy helper `scripts/deploy-control-plane.sh` → `/opt/apps/seos`.
  - Docs: [Local-First Runtime](docs/02-architecture/LOCAL_FIRST_RUNTIME.md).
- **Drop-in pipeline automation (Fasted-grade Tier 1):**
  - Context Engine: `compose-context.mjs`, `agent-manifest.json`, `AGENT.md` / `agent-rules/` / `agent-overrides/`, `npm run agent:compose` + `--check` drift gate.
  - Knowledge skeleton: `.github/agent-knowledge/` (README + TEMPLATE).
  - Auto-triage on issue open (`issue-auto-triage.yml`) with opt-out labels `no-agent` / `agent-manual` and `[no-agent]` in title/body.
  - Auto-ready after spec (disable with `AGENT_AUTO_READY_ENABLED=false` or `agent-manual`).
  - Workflow chaining + per-issue concurrency (bot-added labels do not trigger other workflows).
  - Shared scripts: `generate-issue-spec.sh`, `run-issue-implement.sh`.
  - `seos.yml` `automation:` + opt-out `labels:`; CLI creates all pipeline labels.
- Rename: **issue-bench → SEOS** (Software Engineering Operating System).
  - Repo moved to `github.com/mitchelldawkinsjr/SEOS`.
  - Packages renamed: `issue-bench` → `seos`, `@issue-bench/dispatch` → `@seos/dispatch`; CLI is now `npx @mitchdawkinsjr/seos init` (bin `seos`).
  - Config file `.github/issue-bench.yml` → `.github/seos.yml`. The legacy filename is still read for backward compatibility.
- SEOS documentation foundation: operating model as a Software Engineering Operating System.
  - `docs/00-vision`, `docs/01-concepts`, `docs/02-architecture`, `docs/03-agents`, `docs/06-case-studies/FASTED.md`.
  - Agent role contracts; Mermaid sources in `docs/assets`.

## 0.2.0 — 2026-06-27

- Monorepo: `template/`, `packages/dispatch`, `packages/cli`, `workflows/`, `context/`
- `@issue-bench/dispatch` with optional `.github/issue-bench.yml` config
- `npx issue-bench init` CLI with vite-react, nextjs, generic presets
- Tier 2 recipes documented (CI gates, PR review bots) — reference Fasted

## 0.1.0 — 2026-06-27

- Initial template: issue-spec + issue-implement workflows
- Generic ai-spec and ai-implement context templates
