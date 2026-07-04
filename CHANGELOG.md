# Changelog

## Unreleased

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
  - Packages renamed: `issue-bench` → `seos`, `@issue-bench/dispatch` → `@seos/dispatch`; CLI is now `npx seos init`.
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
