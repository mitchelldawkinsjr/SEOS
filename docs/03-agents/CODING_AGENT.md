# Coding Agent

> Status: **Built**. Lifecycle stage: [Implementation](../01-concepts/ENGINEERING_LIFECYCLE.md). This role runs in production today.

## Mission

Implement an approved issue as a small, focused, reviewable draft pull request — and stop there.

## Responsibilities

- Read the issue, its comments, and especially the approved spec (Acceptance Criteria).
- Make a minimal, focused diff on a branch named `issue-{N}-{short-slug}`.
- Run the configured build (and tests, if behavior changed).
- Open a **draft** PR whose body contains `Fixes #{N}`.
- Commit and link screenshots for any user-visible UI change.
- Post a completion comment and update labels.

## Inputs

- The issue (`title`, `body`, `labels`, `comments`) — including the Planning Agent's spec.
- Repository context: `.github/ai-implement-context.md` (composed from `AGENT.md` + rules + `implement-tail.md`).
- Configuration: `.github/seos.yml` (model, starting ref, build/test commands, post-implement reminders).

## Outputs

- A draft PR referencing the issue.
- Committed screenshots under `artifacts/issue-{N}/` (if UI changed).
- An issue completion comment (PR link, summary, screenshots).
- Label transition: `agent-working` → `pr-opened`.

## Success Criteria

- Every acceptance criterion is addressable from the PR.
- The diff is minimal — no unrelated refactors, one issue = one PR.
- Build passes; tests pass when applicable.
- The PR is left as a **draft** for human review; it is never merged by the agent.

## Escalation Conditions

- The spec is ambiguous or the acceptance criteria cannot be met → comment on the issue explaining why, relabel `agent-working` → `agent-failed`, and do **not** open a PR.
- Dispatch fails to start → the workflow recovers labels (`agent-working` → `agent-failed` + `ready`) and comments so a human can retry by re-adding `ready`.

## Human Approval Points

- **Gate 2 — Merge approval.** The PR is a draft; a human reviews the diff, screenshots, and tests, then merges. The Coding Agent never merges. See [Human Gates](../01-concepts/HUMAN_GATES.md).

## Expected Deliverables

- One draft PR, one issue completion comment, updated labels, and (if UI changed) committed screenshots.

## Implementation

- Workflows: chained from [`issue-auto-triage.yml`](../../workflows/issue-auto-triage.yml) / [`issue-spec.yml`](../../workflows/issue-spec.yml) when auto-ready applies; manual path via [`issue-implement.yml`](../../workflows/issue-implement.yml) (human `ready`).
- Shared script: [`packages/dispatch/run-issue-implement.sh`](../../packages/dispatch/run-issue-implement.sh).
- Dispatch: [`packages/dispatch/dispatch-cursor-agent.mjs`](../../packages/dispatch/dispatch-cursor-agent.mjs) via `@cursor/sdk`.
- Model: configurable (`agent.model`, default `composer-2.5`).
- Secret: `CURSOR_API_KEY`; requires Cursor cloud-agent repo access.
- Context: composed via the [Context Engine](../02-architecture/CONTEXT_ENGINE.md).
