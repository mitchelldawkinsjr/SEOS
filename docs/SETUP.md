# Setup guide

## Prerequisites

- GitHub repository with Actions enabled
- [OpenAI API key](https://platform.openai.com/api-keys) (Planning Agent)
- [Cursor API key](https://cursor.com/settings) with **cloud agents** enabled
- Cursor cloud agent access to your GitHub repo (Settings → Integrations → GitHub)

## Secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Used by | Required |
|--------|---------|----------|
| `OPENAI_API_KEY` | `issue-auto-triage.yml`, `issue-spec.yml` | Yes |
| `CURSOR_API_KEY` | implement jobs (Cursor path / fallback) | Yes for cursor-only; recommended for local-first |
| `CONTROL_PLANE_URL` | implement jobs (local-first) | Only if `agents.implementation.strategy: local-first` |
| `CONTROL_PLANE_TOKEN` | implement jobs (local-first) | Only with control plane |

`GITHUB_TOKEN` is provided automatically by Actions.

Local-first routing (optional): see [Local-First Runtime](02-architecture/LOCAL_FIRST_RUNTIME.md). Default remains Cursor-only.

## Optional repo variables

| Variable | Default | Effect |
|----------|---------|--------|
| `AGENT_AUTO_SPEC_ENABLED` | on | Set to `false` to disable auto-spec on issue open |
| `AGENT_AUTO_READY_ENABLED` | on | Set to `false` to require a human `ready` label after every spec |

## Install into an existing repo

### Option A — CLI (recommended)

```bash
npx seos init
cd your-app && npm install
git add .github package.json scripts && git commit -m "Add SEOS pipeline"
```

### Option B — Copy template

Copy from [`template/`](../template/):

- `.github/workflows/issue-auto-triage.yml`
- `.github/workflows/issue-spec.yml`
- `.github/workflows/issue-implement.yml`
- `.github/AGENT.md`, `agent-manifest.json`, `agent-rules/`, `agent-overrides/`, `agent-knowledge/`
- `.github/ai-spec-context.md`, `.github/ai-implement-context.md` (generated)
- `.github/seos.yml`
- `package.json` with `@cursor/sdk` and `agent:compose` scripts
- `scripts/compose-context.mjs`, `generate-issue-spec.sh`, `run-issue-implement.sh`, `route-implement.mjs`, `build-cursor-handoff.mjs`, `dispatch-cursor-agent.mjs`, `load-config.mjs`

Run `npm install` to install `@cursor/sdk` for the dispatch script.

## Customize context (Context Engine)

Edit the **sources**, not the generated files:

1. `.github/AGENT.md` — project purpose, architecture, commands
2. `.github/agent-rules/*.md` — discipline rules (architecture, testing, commits, product)
3. `.github/agent-overrides/*.md` — role-specific tails (spec / implement output formats)
4. `.github/agent-manifest.json` — which modules each role receives

Then regenerate:

```bash
npm run agent:compose
```

CI can enforce drift with `npm run agent:compose:check` (or `node scripts/compose-context.mjs --check`).

See [Context Engine](02-architecture/CONTEXT_ENGINE.md).

## Default pipeline

After install, **opening an issue** starts the pipeline:

```text
open issue → needs-spec → spec-added → ready → agent-working → pr-opened → you merge
```

Jobs are **chained in one workflow** because bot-added labels do not trigger other `on: labeled` workflows.

### Opt out

| Mechanism | Effect |
|-----------|--------|
| Label `no-agent` or `[no-agent]` in title/body | Skip the pipeline |
| Label `agent-manual` | Auto-spec only; you add `ready` |
| `AGENT_AUTO_SPEC_ENABLED=false` | No auto-spec on open |
| `AGENT_AUTO_READY_ENABLED=false` | No auto-ready after spec |

### seos.yml schema (v1)

```yaml
project:
  name: "My App"
  defaultBranch: main
agent:
  model: composer-2.5
  startingRef: main
commands:
  build: "npm run build"
  test: "npm run test:e2e"
labels:
  noAgent: no-agent
  agentManual: agent-manual
automation:
  autoSpecOnOpen: true
  autoReadyAfterSpec: true
prompt:
  postImplementReminders: |
    Multi-line reminders appended to the agent prompt.
    Use {N} for the issue number.
  agentStartedComment: |
    Optional custom text for the issue comment when the agent starts.
```

The legacy `.github/issue-bench.yml` filename is still read for backward compatibility.

## Knowledge base

Capture lessons under `.github/agent-knowledge/` using `TEMPLATE.md`, then promote durable rules into `AGENT.md` or `agent-rules/` and re-run `npm run agent:compose`. See [Knowledge System](01-concepts/KNOWLEDGE_SYSTEM.md).

## Branch protection (optional)

After your first successful CI run, enable branch protection on `main` and require status checks before merge. See [recipes/ci-gates.md](recipes/ci-gates.md) for a full quality-gate setup used in production on [Fasted](https://github.com/mitchelldawkinsjr/Fasted).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Nothing runs on issue open | Check `AGENT_AUTO_SPEC_ENABLED` is not `false`; confirm Actions are enabled |
| Spec posts but implement never starts | Check `AGENT_AUTO_READY_ENABLED`; or add `ready` manually / remove `agent-manual` |
| Stage 2 fails immediately | Issue needs `spec-added` before `ready` |
| Agent fails to start | Verify `CURSOR_API_KEY` and Cursor repo access |
| Empty spec comment | Check `OPENAI_API_KEY` and composed `ai-spec-context.md` |
| Context drift in CI | Run `npm run agent:compose` and commit generated files |
| `npm ci` fails in Actions | Ensure `package.json` lists `@cursor/sdk` and dispatch scripts exist |
