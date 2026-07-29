/**
 * Invoke Cursor Cloud fallback for a failed/unavailable local job.
 * Uses dynamic import of @seos/dispatch helpers when available; otherwise
 * records a stub so ops can see the intent without CURSOR_API_KEY.
 */

export async function triggerCursorFallback({
  job,
  handoff,
  env = process.env,
  dispatchFn,
}) {
  const apiKey = env.CURSOR_API_KEY;
  const ghToken = env.GH_TOKEN || env.GITHUB_TOKEN;

  if (!apiKey || !ghToken) {
    return {
      ok: false,
      stubbed: true,
      reason: "CURSOR_API_KEY or GH_TOKEN missing — fallback recorded but not dispatched",
      startingRef: handoff?.startingRef || job.meta?.branch || null,
    };
  }

  if (typeof dispatchFn === "function") {
    const result = await dispatchFn({
      issueNumber: job.issueNumber,
      repo: job.repo,
      startingRef: handoff?.startingRef,
      promptOverride: handoff?.prompt,
      model: job.fallback?.model,
      apiKey,
      ghToken,
    });
    return { ok: true, stubbed: false, ...result };
  }

  // Lazy import optional dispatch module from monorepo / sibling package
  try {
    const mod = await import("../../dispatch/dispatch-cursor-agent.mjs");
    if (typeof mod.dispatchCursorAgent === "function") {
      const result = await mod.dispatchCursorAgent({
        issueNumber: job.issueNumber,
        repo: job.repo,
        startingRef: handoff?.startingRef,
        promptOverride: handoff?.prompt,
        model: job.fallback?.model,
        apiKey,
        ghToken,
      });
      return { ok: true, stubbed: false, ...result };
    }
  } catch {
    // package may not be linked in the Docker image; record stub
  }

  return {
    ok: false,
    stubbed: true,
    reason:
      "dispatch-cursor-agent not available in control-plane image — set up sidecar or call from GHA",
    startingRef: handoff?.startingRef || null,
    handoffSummary: handoff?.summary || null,
  };
}

export function shouldFallback(status, fallbackRecommended) {
  const statuses = new Set([
    "failed",
    "blocked",
    "timeout",
    "worker_offline",
    "model_unavailable",
    "no_changes",
    "invalid_patch",
    "validation_failed",
  ]);
  if (fallbackRecommended === true) return true;
  return statuses.has(status);
}
