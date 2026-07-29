# Roadmap

> Status: Vision. This roadmap is deliberately honest about what exists today versus what is planned. It is a direction, not a delivery commitment. Each step should ship as its own small, reviewable PR.

SEOS grows from a working two-agent pipeline toward a full engineering operating system. The path is incremental: each stage of the [Engineering Lifecycle](../01-concepts/ENGINEERING_LIFECYCLE.md) becomes a documented, configurable capability.

## Legend

- **Built** — exists and runs in production / ships with the framework.
- **Partial** — exists as a recipe or Fasted implementation, not yet a first-class framework capability.
- **Planned** — designed but not yet implemented.

## Capability status

| Capability | Lifecycle stage | Status | Where it lives today |
|-----------|-----------------|--------|----------------------|
| Planning (spec generation) | Planning | **Built** | `workflows/issue-spec.yml` + `generate-issue-spec.sh` |
| Implementation (draft PR) | Implementation | **Built** | `workflows/issue-implement.yml` + `run-issue-implement.sh` |
| Pipeline automation + opt-out | throughout | **Built** | `issue-auto-triage.yml`, `no-agent` / `agent-manual`, `AGENT_AUTO_*` vars |
| Workflow chaining + concurrency | throughout | **Built** | Chained jobs in auto-triage / issue-spec; per-issue concurrency groups |
| Context engine (compose-context) | throughout | **Built** | `compose-context.mjs` + `agent-manifest.json` + `AGENT.md` / rules / overrides |
| Knowledge engine skeleton | Learning/Knowledge | **Built** | `.github/agent-knowledge/` (README + TEMPLATE) |
| Human gates | throughout | **Built** | Open issue + merge PR (auto-ready optional via `agent-manual`) |
| Configuration | throughout | **Built** | `.github/seos.yml` + `load-config.mjs` |
| CLI install | onboarding | **Built** | `packages/cli` (`npx seos init`) |
| Local-first runtime (VPS + Mac + Cursor fallback) | Implementation | **Partial** | Phase 1: control plane, mac-worker scaffold, dispatch router; see [Local-First Runtime](../02-architecture/LOCAL_FIRST_RUNTIME.md) |
| Architecture review | Architecture | **Partial** | Proven in Fasted: `issue-architecture.yml`, `needs-architecture` gate |
| Testing agent | Testing | **Partial** | Proven in Fasted: `pr-test-agent.yml`, `test-context.md` |
| Documentation agent | Documentation | **Partial** | Proven in Fasted: `issue-docs.yml`, `docs-context.md` |
| CI validation | Validation | **Partial** | [ci-gates recipe](../../docs/recipes/ci-gates.md) (Fasted) |
| Review (Bugbot/Ponytail) | Review | **Partial** | [pr-review-bots recipe](../../docs/recipes/pr-review-bots.md) (Fasted) |
| Auto-fix (one pass on findings) | Review | **Partial** | Proven in Fasted: `pr-agent-fix.yml`, `review-findings` label |
| Security | Review/Security | **Partial** | Fasted `security.yml` + `security-context.md` (specialist) |
| Accessibility | Review/Accessibility | **Partial** | Fasted `a11y-audit.yml` + `a11y-context.md` (specialist) |
| Deployment + health | Deployment | **Partial** | Fasted `deploy-vps.yml`, `health-check.yml`, `deploy-context.md` |
| Plugin system | throughout | **Planned** (presets are the seed) | `context/presets/` |

## Direction of travel

1. **Foundation (done).** Operating model docs + Tier 1 pipeline.
2. **Context Engine, automation, chaining (done).** Drop-in install matches Fasted's hands-off label flow for planning + implement.
3. **Formalize remaining agent roles.** Architecture, Testing, Documentation contracts — promote from Fasted.
4. **Promote Tier 2 recipes.** Review label state machine, one-pass auto-fix, CI/security/a11y patterns behind configuration.
5. **Plugin system.** New frameworks installable via configuration rather than runtime edits.

## Non-goals (for now)

- A bespoke workflow runtime. GitHub Actions is the workflow engine until there is a concrete reason to change.
- Removing human gates (open issue + merge). Ever.
- Coupling any framework capability to Fasted.

## Related reading

- [Engineering Lifecycle](../01-concepts/ENGINEERING_LIFECYCLE.md)
- [Architecture Overview](../02-architecture/OVERVIEW.md)
- [Fasted case study](../06-case-studies/FASTED.md)
