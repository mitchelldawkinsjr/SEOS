# SEOS template

Drop-in Software Engineering Operating System: open an issue and the pipeline runs (auto-spec → auto-implement → draft PR). You merge.

**Read first:** [Building a Team of Engineers](https://www.mitchelldawkins.com/blog/team-of-engineers-cursor-agent-pipeline).

## Prerequisites

- GitHub Actions enabled
- `OPENAI_API_KEY` and `CURSOR_API_KEY` secrets
- Cursor cloud agent access to this repository

## Quick start

1. **Use this template** — create a new repo from [github.com/mitchelldawkinsjr/SEOS](https://github.com/mitchelldawkinsjr/SEOS) and copy the `template/` directory contents into your repo root (or run `npx seos init` in an existing project).

2. **Customize context** — edit `.github/AGENT.md` and `.github/agent-rules/`, then run `npm run agent:compose`. Do not edit `ai-*-context.md` by hand (they are generated).

3. **Install dependencies** — run `npm install` (installs `@cursor/sdk` for the dispatch script).

4. **Add secrets** — `OPENAI_API_KEY`, `CURSOR_API_KEY` under Settings → Secrets → Actions.

5. **Run the pipeline:**
   - Create a GitHub issue with a clear description
   - Spec and implement run automatically (unless opted out)
   - Review the draft PR when `pr-opened` appears → merge manually

6. **Opt out when needed:**
   - Label `no-agent` or put `[no-agent]` in the title/body — skip the pipeline
   - Label `agent-manual` — auto-spec only; you add `ready` yourself
   - Repo variables `AGENT_AUTO_SPEC_ENABLED=false` / `AGENT_AUTO_READY_ENABLED=false`

7. **Iterate** — gaps in agent behavior become updates to `AGENT.md` or `agent-rules/`, then `npm run agent:compose`.

## Alternative: CLI init

```bash
npx seos init --preset vite-react --yes --name "My App" --repo owner/repo
npm install
```

## Files included

| File | Purpose |
|------|---------|
| `.github/workflows/issue-auto-triage.yml` | Open issue → auto-spec → auto-implement (chained) |
| `.github/workflows/issue-spec.yml` | Manual `needs-spec` path (chains implement when auto-ready) |
| `.github/workflows/issue-implement.yml` | Manual `ready` path (`agent-manual`) |
| `.github/AGENT.md` | Repository guide (single source of truth) |
| `.github/agent-rules/` | Composable rule modules |
| `.github/agent-overrides/` | Role-specific tails |
| `.github/agent-manifest.json` | Context composition recipes |
| `.github/agent-knowledge/` | Lesson template + promote-into-guide loop |
| `.github/ai-*-context.md` | **Generated** agent context (do not edit) |
| `.github/seos.yml` | Dispatch + automation config |
| `scripts/compose-context.mjs` | Context Engine |
| `scripts/generate-issue-spec.sh` | Shared planning script |
| `scripts/run-issue-implement.sh` | Shared implement dispatch |
| `scripts/dispatch-cursor-agent.mjs` | Cursor cloud agent dispatch |
| `scripts/load-config.mjs` | `seos.yml` config loader |

## Labels

| Label | Applied by |
|-------|------------|
| `needs-spec` | Auto on open (or human) |
| `spec-added` | Planning agent |
| `ready` | Auto after spec (or human with `agent-manual`) |
| `agent-working` | Implement dispatch |
| `pr-opened` | Coding agent |
| `agent-failed` | Implement on failure |
| `no-agent` | Human opt-out |
| `agent-manual` | Human — require manual `ready` |

See [docs/LABELS.md](../docs/LABELS.md) for the full state machine.

## Learn more

- [Blog: Building a Team of Engineers](https://www.mitchelldawkins.com/blog/team-of-engineers-cursor-agent-pipeline)
- [Setup guide](../docs/SETUP.md)
- [Context Engine](../docs/02-architecture/CONTEXT_ENGINE.md)
