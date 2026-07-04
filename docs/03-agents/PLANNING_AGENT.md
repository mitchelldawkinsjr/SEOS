# Planning Agent

> Status: **Built**. Lifecycle stage: [Planning](../01-concepts/ENGINEERING_LIFECYCLE.md). This role runs in production today.

## Mission

Turn a raw GitHub issue into a repo-aligned, human-reviewable specification with testable acceptance criteria.

## Responsibilities

- Read the issue title and body.
- Produce a paste-ready GitHub comment containing **Acceptance Criteria**, **Task Breakdown**, **Potential Fix Directions**, and **Notes from Issue / Images**.
- Ground the spec in the actual repository: real file paths, type names, and conventions from composed context.
- Surface ambiguity and scope boundaries rather than inventing features.

## Inputs

- The GitHub issue (`title`, `body`).
- Repository context: `.github/ai-spec-context.md` (composed from `AGENT.md` + `agent-rules/` + `agent-overrides/spec-tail.md`).

## Outputs

- A single GitHub issue comment with the required sections.
- Label transition: `needs-spec` → `spec-added`.
- When auto-ready is enabled (default): may also apply `ready` and signal the chained implement job.

## Success Criteria

- Every acceptance criterion is specific and testable (`- [ ]` checkboxes a reviewer can verify).
- Fix directions name real files and patterns, not generic advice.
- No invented features beyond what the issue describes.

## Escalation Conditions

- The issue is too vague to produce testable criteria → the spec should call out the ambiguity explicitly rather than guess.
- The OpenAI API errors or returns an empty response → the workflow fails loudly (`::error::`) and the label is not advanced, leaving the issue in a re-runnable state.

## Human Approval Points

- **Gate 0 — Intent.** A human opened the issue (or applied `needs-spec` when auto-spec is off).
- **Gate 1 — Spec approval (optional).** Default is auto-ready. Restore a human pause with `agent-manual` or `AGENT_AUTO_READY_ENABLED=false`. See [Human Gates](../01-concepts/HUMAN_GATES.md).

## Expected Deliverables

- One spec comment on the issue.
- The issue relabeled `spec-added` (and `ready` when auto-ready applies).

## Implementation

- Workflows: [`workflows/issue-auto-triage.yml`](../../workflows/issue-auto-triage.yml) (on open), [`workflows/issue-spec.yml`](../../workflows/issue-spec.yml) (manual `needs-spec`).
- Shared script: [`packages/dispatch/generate-issue-spec.sh`](../../packages/dispatch/generate-issue-spec.sh).
- Model: OpenAI `gpt-4o-mini` via the Chat Completions API (`temperature: 0.3`).
- Secret: `OPENAI_API_KEY`.
- Context: composed via the [Context Engine](../02-architecture/CONTEXT_ENGINE.md).
