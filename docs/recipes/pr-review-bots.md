# Recipe: PR review bots (Bugbot + Ponytail)

Tier 2 — optional automated review after the implement agent opens a draft PR.

## Reference implementation

See [Fasted `pr-review.yml`](https://github.com/mitchelldawkinsjr/Fasted/blob/main/.github/workflows/pr-review.yml) and context files:

- `.github/ai-bugbot-context.md`
- `.github/ai-ponytail-review-context.md`

## Flow

1. Implement agent opens a **draft** PR with `Fixes #N`
2. `pr-review.yml` dispatches Bugbot + Ponytail in parallel via Cursor cloud agents
3. When both complete, workflow runs `gh pr ready` and updates issue labels

## seos.yml customization

If you adopt this pattern, put bot-specific rules in `prompt.postImplementReminders` so the implement agent does not run `gh pr ready` or swap review labels itself. Example from Fasted:

```yaml
prompt:
  postImplementReminders: |
    Leave the PR as a **draft** — do NOT run `gh pr ready`.
    Bugbot + Ponytail run automatically when the PR opens.
    Do NOT swap review labels yourself.
```

See [SETUP.md](../SETUP.md) for the full config schema.
