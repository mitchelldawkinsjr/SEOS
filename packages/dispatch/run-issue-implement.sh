#!/usr/bin/env bash
# Shared implement dispatch — used by issue-implement.yml and auto-queue workflows.
# Env: ISSUE_NUMBER, REPO, GH_TOKEN, CURSOR_API_KEY
set -euo pipefail

if [ -z "${ISSUE_NUMBER:-}" ] || [ -z "${GH_TOKEN:-}" ]; then
  echo "Missing ISSUE_NUMBER or GH_TOKEN"
  exit 1
fi

REPO="${REPO:-}"
if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
fi

LABELS=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels -q '[.labels[].name] | join(",")')

if ! echo "$LABELS" | grep -q 'spec-added'; then
  echo "::error::Issue must have spec-added before implement."
  exit 1
fi

if echo "$LABELS" | grep -qE 'agent-working|pr-opened'; then
  echo "::notice::Issue already dispatched or completed. Skipping."
  exit 0
fi

gh label create ready --description "Trigger Cursor cloud agent implementation" --color "FBCA04" 2>/dev/null || true
gh label create agent-working --description "Cursor cloud agent implementing" --color "FBBA04" 2>/dev/null || true
gh label create pr-opened --description "Implementation PR opened" --color "1D76DB" 2>/dev/null || true
gh label create agent-failed --description "Cloud agent failed to implement" --color "D93F0B" 2>/dev/null || true

gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label agent-working --remove-label ready

if [ -z "${CURSOR_API_KEY:-}" ]; then
  echo "::error::CURSOR_API_KEY secret is not configured."
  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
    --remove-label agent-working \
    --add-label agent-failed \
    --add-label ready 2>/dev/null || true
  exit 1
fi

node scripts/dispatch-cursor-agent.mjs
