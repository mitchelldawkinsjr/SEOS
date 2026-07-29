#!/usr/bin/env node
/**
 * Implementation router:
 * - strategy cursor-only (default) → Cursor Cloud
 * - strategy local-first + control plane URL → POST /v1/jobs on VPS
 * - local-first without control plane → fall back to Cursor with a notice
 *
 * For local-first, the full consumer implement prompt (ai-implement-context +
 * issue + reminders) is attached to the job so VPS Cursor fallback keeps
 * Fasted/SEOS rules instead of a thin offline stub prompt.
 */
import { loadConfig } from "./load-config.mjs";
import {
  buildImplementPrompt,
  dispatchCursorAgent,
} from "./dispatch-cursor-agent.mjs";

const issueNumber = process.env.ISSUE_NUMBER;
const repo = process.env.REPO;
const ghToken = process.env.GH_TOKEN;
const apiKey = process.env.CURSOR_API_KEY;

if (!issueNumber || !repo) {
  console.error("Missing required env: ISSUE_NUMBER, REPO");
  process.exit(1);
}

const config = await loadConfig();
const strategy = config.agents?.implementation?.strategy || "cursor-only";
const controlPlaneUrl = (
  process.env.CONTROL_PLANE_URL ||
  config.controlPlane?.url ||
  ""
).replace(/\/$/, "");
const controlPlaneToken =
  process.env.CONTROL_PLANE_TOKEN || process.env.SEOS_CONTROL_PLANE_TOKEN || "";

async function enqueueLocalFirst() {
  if (!controlPlaneUrl) {
    console.warn(
      "local-first configured but controlPlane.url / CONTROL_PLANE_URL unset — using Cursor Cloud"
    );
    return null;
  }
  if (!controlPlaneToken) {
    console.warn(
      "CONTROL_PLANE_TOKEN unset — control plane may reject the request"
    );
  }

  let implementPrompt = null;
  let issueTitle = null;
  if (ghToken) {
    try {
      const built = await buildImplementPrompt({
        issueNumber,
        repo,
        ghToken,
        config,
        promptPrefix: `SEOS local-first handoff from GitHub Actions for ${repo}#${issueNumber}.`,
      });
      implementPrompt = built.prompt;
      issueTitle = built.title;
      console.log(
        `Attached full implement prompt (${implementPrompt.length} chars) for control-plane fallback`
      );
    } catch (err) {
      console.warn(
        "Could not build full implement prompt for control plane:",
        err.message || err
      );
    }
  }

  const body = {
    type: "implementation",
    issueNumber,
    repo,
    strategy: "local-first",
    primary: config.agents.implementation.primary,
    fallback: config.agents.implementation.fallback,
    policy: config.agents.implementation.policy,
    meta: {
      enqueuedBy: "route-implement",
      defaultBranch:
        config.agent.startingRef || config.project.defaultBranch || "main",
      issueTitle,
      // Full consumer prompt for VPS Cursor fallback / Mac harness context
      implementPrompt,
    },
  };

  const res = await fetch(`${controlPlaneUrl}/v1/jobs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(controlPlaneToken
        ? { authorization: `Bearer ${controlPlaneToken}` }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `Control plane enqueue failed (${res.status}): ${text.slice(0, 500)}`
    );
  }

  console.log("Enqueued on SEOS control plane:", {
    jobId: data.job?.id,
    status: data.job?.status,
    fallbackTriggered: data.job?.fallbackTriggered,
    cursorOk: data.job?.cursorDispatch?.ok,
    cursorStubbed: data.job?.cursorDispatch?.stubbed,
  });

  // Safety net: if control plane stubbed Cursor (missing keys / dispatch module),
  // start Cursor from Actions with the same full Fasted/consumer prompt.
  if (
    data.job?.fallbackTriggered &&
    data.job?.cursorDispatch?.stubbed &&
    apiKey &&
    ghToken
  ) {
    console.log(
      "Control plane stubbed Cursor fallback — dispatching Cursor from Actions"
    );
    await dispatchCursorAgent({
      issueNumber,
      repo,
      apiKey,
      ghToken,
      model: config.agents.implementation.fallback?.model,
      promptOverride: implementPrompt || undefined,
      promptPrefix: `SEOS local-first: Mac worker was offline. Control plane job ${data.job.id}.`,
    });
  }

  return data.job;
}

if (strategy === "local-first") {
  try {
    const job = await enqueueLocalFirst();
    if (job) {
      process.exit(0);
    }
  } catch (err) {
    console.error("local-first enqueue failed:", err.message || err);
    if (!apiKey) {
      process.exit(1);
    }
    console.warn("Falling back to direct Cursor Cloud dispatch");
  }
}

if (!apiKey || !ghToken) {
  console.error("Missing required env: CURSOR_API_KEY, GH_TOKEN");
  process.exit(1);
}

await dispatchCursorAgent({
  issueNumber,
  repo,
  apiKey,
  ghToken,
  model:
    strategy === "local-first"
      ? config.agents.implementation.fallback?.model
      : config.agent.model,
});
