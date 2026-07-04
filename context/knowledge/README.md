# Agent Knowledge Base

Lessons learned from shipped work, failed deploys, and CI regressions. Agents should read recent entries promoted into [AGENT.md](../AGENT.md) before starting complex tasks.

## When to add an entry

- Recurring CI failure pattern
- Architecture decision that should guide future specs
- Agent mistake that a rule update would prevent
- Post-deploy or production incident

## Template

Copy [`TEMPLATE.md`](TEMPLATE.md) to `YYYY-MM-DD-issue-NN.md`.

## Promote into the guide

When a lesson should apply to every future agent run, update:

1. `.github/AGENT.md` (if it is project-wide), or
2. `.github/agent-rules/<rule>.md` (if it is discipline-specific)

Then run `npm run agent:compose` so composed context files stay in sync.

## Recent lessons

_(Append newest entries at the top of this section during review.)_
