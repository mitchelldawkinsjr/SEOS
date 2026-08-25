# @seos/dispatch

Source of truth for SEOS consumer scripts: Context Engine, config loader, shared pipeline scripts, implement router, and Cursor cloud agent dispatch.

## Consumer install

**Recommended:** copy via CLI or template sync (vendored into `scripts/`):

```bash
npx @mitchdawkinsjr/seos init
npm install   # installs @cursor/sdk
```

| Script | Purpose |
|--------|---------|
| `compose-context.mjs` | Compose `ai-*-context.md` from `AGENT.md` + rules + overrides |
| `load-config.mjs` | Read `.github/seos.yml` (or legacy `issue-bench.yml`) |
| `generate-issue-spec.sh` | Planning Agent (OpenAI) + optional auto-ready |
| `run-issue-implement.sh` | Guards + label handoff + router |
| `route-implement.mjs` | cursor-only vs local-first (VPS control plane) |
| `build-cursor-handoff.mjs` | Preserve-work Cursor escalation prompt |
| `dispatch-cursor-agent.mjs` | Cursor cloud agent via `@cursor/sdk` |

Workflows run these from `scripts/`.

## npm package (optional)

When published to npm:

```bash
npm install @seos/dispatch @cursor/sdk
node node_modules/@seos/dispatch/dispatch-cursor-agent.mjs
```

Until published, use vendored scripts from `template/scripts/` or `npx @mitchdawkinsjr/seos init`.

## Configuration

Optional `.github/seos.yml` in the consumer repo (the legacy `.github/issue-bench.yml` filename is still read for backward compatibility) — see [docs/SETUP.md](../../docs/SETUP.md).
