# SEOS — a Software Engineering Operating System

**SEOS is a reusable layer that coordinates specialized AI engineering agents from idea to production, while humans stay accountable for judgment and ownership.** (Formerly `issue-bench`.)

Drop it into a repo, run the install, and opening an issue starts the pipeline: auto-spec → auto-implement → draft PR → **you merge**.

> New here? Read the narrative first: **[Building a Team of Engineers: From GitHub Issues to Small, Reversible PRs](https://www.mitchelldawkins.com/blog/team-of-engineers-cursor-agent-pipeline)**. Then read **[docs/](docs/)** for the operating model, and this README for how to install it.

## The operating model (read this before installing)

### Engineering is bigger than coding
Shipping software is a chain of decisions across many disciplines — planning, architecture, implementation, testing, documentation, review, security, accessibility, deployment, and learning. AI tools are great at *coding*. SEOS coordinates the *rest of engineering* around it. → [Why SEOS Exists](docs/00-vision/WHY_SEOS_EXISTS.md)

### Specialist agents, not one mega-agent
Each discipline is an independent, bounded [agent role](docs/03-agents/README.md) with a documented contract. Planning and Coding ship today; more roles are on the [Roadmap](docs/00-vision/ROADMAP.md).

### A lifecycle, not a pile of Actions
```
Intent → Planning → (Architecture) → Implementation → Validation
→ Documentation → Review → Deployment → Health → Learning → Knowledge
```
The [lifecycle](docs/01-concepts/ENGINEERING_LIFECYCLE.md) is the abstraction; GitHub labels and workflows are one implementation of the [state machine](docs/01-concepts/STATE_MACHINE.md).

### Repository intelligence over generic prompting
Agents read composed context from `.github/AGENT.md` + `agent-rules/` + `agent-overrides/` (the [Context Engine](docs/02-architecture/CONTEXT_ENGINE.md)). Behavior gaps become rule updates, then `npm run agent:compose`.

### Humans stay in control
[Human gates](docs/01-concepts/HUMAN_GATES.md): you open the issue and you merge the PR. Opt out with `no-agent` / `agent-manual`, or turn off auto stages with repo variables.

## What runs today

```text
Open issue → needs-spec → OpenAI spec → ready → Cursor cloud agent → draft PR → you merge
```

| Stage | Trigger | Who | Gate |
|-------|---------|-----|------|
| Planning | Auto on open (`needs-spec`) | Planning Agent (OpenAI) | Opt out: `no-agent` |
| Implementation | Auto after spec (`ready`) | Coding Agent (Cursor cloud) | Opt out: `agent-manual` |
| Merge | PR open | You | Always human |

Jobs are **chained in one workflow** (bot-added labels do not trigger other workflows). Manual `ready` still works via `issue-implement.yml`.

Tier 2 (CI gates, Bugbot/Ponytail review, deploy health) is documented in [docs/recipes/](docs/recipes/) and proven on [Fasted](docs/06-case-studies/FASTED.md).

## Install SEOS

### Option A — CLI (fastest)

```bash
npx seos init --preset vite-react --yes --name "My App" --repo owner/repo
npm install
```

Add `OPENAI_API_KEY` and `CURSOR_API_KEY` to GitHub Actions secrets. See [docs/SETUP.md](docs/SETUP.md).

### Option B — Copy the template

Copy [`template/`](template/) into your repo (workflows, Context Engine sources, scripts, `package.json`). Details in [template/README.md](template/README.md). Enable **Use this template**: [docs/TEMPLATE_REPOSITORY.md](docs/TEMPLATE_REPOSITORY.md).

## Adopt SEOS in a new repository

A repository should be installable with **product-specific configuration, not runtime changes**. You provide:

- **Context** — edit `.github/AGENT.md` and `agent-rules/`, then `npm run agent:compose`.
- **Configuration** — tune `.github/seos.yml` and optional `AGENT_AUTO_*` repo variables.
- **Knowledge** — capture lessons under `.github/agent-knowledge/` and promote into the guide.

The framework supplies the engineering workflow. See [docs/SETUP.md](docs/SETUP.md) and the [Design Principles](docs/00-vision/DESIGN_PRINCIPLES.md).

## How Fasted demonstrates the architecture

[Fasted](https://github.com/mitchelldawkinsjr/Fasted) is the first production consumer and the proving ground. Generic capabilities proven there migrate into SEOS; domain-specific behavior stays in Fasted; the framework never depends on Fasted. → [Fasted case study](docs/06-case-studies/FASTED.md)

## Repo layout

| Path | Purpose |
|------|---------|
| [`docs/`](docs/) | SEOS operating model, architecture, agent roles, guides, reference |
| [`template/`](template/) | Consumer-facing template (copy into your app) |
| [`packages/dispatch`](packages/dispatch/) | `@seos/dispatch` — compose, load-config, implement router, Cursor dispatch |
| [`packages/control-plane`](packages/control-plane/) | VPS local-first dispatcher (queue, worker health, Cursor fallback) |
| [`packages/mac-worker`](packages/mac-worker/) | Mac local worker scaffold (heartbeat → claim → harness → result) |
| [`packages/cli`](packages/cli/) | `npx seos init` |
| [`workflows/`](workflows/) | Canonical workflow YAML (auto-triage, spec, implement) |
| [`context/`](context/) | Context Engine sources (guide, rules, overrides, manifest, presets) |

## Development

```bash
npm install
npm run sync-template    # copy workflows + context + scripts into template/
npm run validate
npm test
```

## Learn more

- [Documentation home](docs/README.md) — start with the operating model
- [Blog: Building a Team of Engineers](https://www.mitchelldawkins.com/blog/team-of-engineers-cursor-agent-pipeline)
- [Setup guide](docs/SETUP.md) · [Labels](docs/LABELS.md) · [Roadmap](docs/00-vision/ROADMAP.md)

## License

MIT
