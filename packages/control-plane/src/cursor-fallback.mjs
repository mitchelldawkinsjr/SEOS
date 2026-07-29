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

  const args = {
    issueNumber: job.issueNumber,
    repo: job.repo,
    startingRef: handoff?.startingRef || undefined,
    promptOverride: handoff?.prompt || undefined,
    model: job.fallback?.model,
    apiKey,
    ghToken,
  };

  if (typeof dispatchFn === "function") {
    try {
      const result = await dispatchFn(args);
      return { ok: true, stubbed: false, ...result };
    } catch (err) {
      return {
        ok: false,
        stubbed: false,
        error: err.message || String(err),
        startingRef: handoff?.startingRef || null,
      };
    }
  }

  try {
    const mod = await import("./dispatch-cursor.mjs");
    const result = await mod.dispatchCursorAgent(args);
    return { ok: true, stubbed: false, ...result };
  } catch (err) {
    return {
      ok: false,
      stubbed: false,
      error: err.message || String(err),
      startingRef: handoff?.startingRef || null,
      handoffSummary: handoff?.summary || null,
    };
  }
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
