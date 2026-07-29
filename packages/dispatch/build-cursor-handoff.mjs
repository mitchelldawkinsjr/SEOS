/**
 * Build a preserve-work Cursor handoff prompt + startingRef from a local agent result.
 */

export function buildCursorHandoff({
  issueNumber,
  repo,
  result = {},
  issueUrl,
} = {}) {
  const branch = result.branch || null;
  const files = Array.isArray(result.changedFileList)
    ? result.changedFileList.join("\n")
    : "(none listed)";
  const failed = Array.isArray(result.failedCommands)
    ? result.failedCommands.join("\n")
    : "(none)";

  const url = issueUrl || (repo && issueNumber
    ? `https://github.com/${repo}/issues/${issueNumber}`
    : "(unknown)");

  const prompt = `The local SEOS implementation agent attempted this issue but did not
complete validation.

Issue: ${url}

Branch:
${branch || "(no branch — start from default and recover any known work)"}

Changed files:
${files}

Current diff:
${result.diff || "(diff not attached — fetch the branch and continue from working tree)"}

Failed commands:
${failed}

Local failure reason / status:
${result.status || "unknown"}

Local agent summary:
${result.summary || "(none)"}

Continue from the existing branch. Preserve working changes, fix the
remaining problems, run validation, and update the draft pull request.
Do not merge. Leave the PR as a draft.`;

  return {
    startingRef: branch,
    prompt,
    summary: result.summary || result.status || "local escalation",
  };
}

export function buildWorkerOfflineHandoff({ issueNumber, repo } = {}) {
  return {
    startingRef: null,
    prompt: `The local SEOS Mac worker is offline or unhealthy.

Issue: https://github.com/${repo}/issues/${issueNumber}

Implement this issue from the repository default branch. Open a draft PR with Fixes #${issueNumber}. Do not merge.`,
    summary: "worker_offline",
  };
}
