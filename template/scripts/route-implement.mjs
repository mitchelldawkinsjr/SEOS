#!/usr/bin/env node
/**
 * Implementation router:
 * - strategy cursor-only (default) → Cursor Cloud
 * - strategy local-first + control plane URL → POST /v1/jobs on VPS
 * - local-first without control plane → fall back to Cursor with a notice
 */
import { loadConfig } from "./load-config.mjs";
import { dispatchCursorAgent } from "./dispatch-cursor-agent.mjs";

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
  });

  // If control plane already fell back (Mac offline), Cursor may already be stubbed/dispatched.
  // When stubbed (no CURSOR_API_KEY on VPS), dispatch Cursor from Actions as a safety net.
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
