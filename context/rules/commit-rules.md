## Commit and PR rules

- Branch name: `issue-{N}-{short-slug}` (e.g. `issue-42-add-footer-link`).
- Open a PR with `Fixes #{N}` in the body.
- Leave the PR as a **draft** — do not merge.
- Update labels on success: remove `agent-working`, add `pr-opened`.
- On failure or blocked work: remove `agent-working`, add `agent-failed`, comment why.
- Post an issue completion comment with the PR link and a short summary before stopping.
