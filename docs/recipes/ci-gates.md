# Recipe: CI quality gates

Tier 2 — optional hardening around the SEOS agent pipeline.

The core SEOS template (Tier 1) covers **spec → implement → draft PR**. CI gates add mechanical checks before merge and after deploy.

## Reference implementation

See [Fasted issue #47](https://github.com/mitchelldawkinsjr/Fasted/issues/47) and workflows on `main`:

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | `npm run build` + Playwright e2e on every PR |
| `ci.yml` (docker-build job) | Verify production Docker image builds |
| `deploy-vps.yml` (test job) | Block deploy if build/e2e fail |
| `health-check.yml` | Scheduled VPS health via SSH + HTTP |
| `security.yml` | `npm audit` + committed-secrets scan |
| `a11y-audit.yml` | axe + Playwright on Vite preview |
| `ponytail-audit.yml` | Monthly repo-wide over-engineering scan |

## How it fits SEOS

```text
needs-spec → spec → ready → agent → draft PR
  → CI + security (+ a11y if src changed) → human merge → deploy → health
```

Copy workflows from Fasted and adapt env vars, paths, and secrets for your host. Do not copy VPS hostnames or credentials into issues or public docs.

## Branch protection

After CI is stable, require the **CI / test** status check on `main` under **Settings → Branches**.
