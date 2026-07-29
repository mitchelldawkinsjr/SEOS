#!/usr/bin/env node
/**
 * SEOS Mac worker — one heavy job at a time.
 *
 * Env:
 *   CONTROL_PLANE_URL
 *   CONTROL_PLANE_TOKEN
 *   SEOS_WORKER_ID (default mac-m1-max)
 *   SEOS_HEARTBEAT_MS (default 30000)
 *   SEOS_POLL_MS (default 15000)
 *   SEOS_WORKER_HARNESS (dry|shell)
 */
import { createControlPlaneClient } from "./client.mjs";
import { runLocalJob } from "./run-job.mjs";

const workerId = process.env.SEOS_WORKER_ID || "mac-m1-max";
const baseUrl = process.env.CONTROL_PLANE_URL;
const token = process.env.CONTROL_PLANE_TOKEN || "";
const heartbeatMs = Number(process.env.SEOS_HEARTBEAT_MS || 30_000);
const pollMs = Number(process.env.SEOS_POLL_MS || 15_000);

const capabilities = (
  process.env.SEOS_WORKER_CAPABILITIES ||
  "local-llm,planning,coding,testing,review,documentation,docker,64gb-unified-memory"
).split(",").map((s) => s.trim()).filter(Boolean);

if (!baseUrl) {
  console.error("CONTROL_PLANE_URL is required");
  process.exit(1);
}

const client = createControlPlaneClient({ baseUrl, token });
let busy = false;
let stopping = false;

async function heartbeat() {
  await client.heartbeat({
    id: workerId,
    capabilities,
    busy,
    modelAvailable: process.env.SEOS_MODEL_AVAILABLE !== "0",
    meta: {
      hostname: process.env.HOSTNAME || process.env.HOST || "mac",
      harness: process.env.SEOS_WORKER_HARNESS || "dry",
    },
  });
}

async function pollOnce() {
  if (busy) return;
  const data = await client.claim(workerId);
  if (!data?.job) return;

  busy = true;
  const job = data.job;
  console.log("Claimed job", job.id, `issue #${job.issueNumber}`);
  try {
    await heartbeat();
    const result = await runLocalJob(job);
    await client.postResult(job.id, result);
    console.log("Posted result", result.status, "for", job.id);
  } catch (err) {
    console.error("Job failed:", err);
    try {
      await client.postResult(job.id, {
        status: "failed",
        agent: "implementation",
        worker: workerId,
        attempts: 1,
        changedFiles: 0,
        branch: `seos/issue-${job.issueNumber}`,
        failedCommands: [],
        summary: err.message || String(err),
        fallbackRecommended: true,
      });
    } catch (postErr) {
      console.error("Failed to post error result:", postErr);
    }
  } finally {
    busy = false;
    try {
      await heartbeat();
    } catch {
      /* ignore */
    }
  }
}

async function loop() {
  console.log(`SEOS mac-worker ${workerId} → ${baseUrl}`);
  await heartbeat();

  const hb = setInterval(() => {
    heartbeat().catch((err) => console.error("heartbeat error:", err.message));
  }, heartbeatMs);

  const poll = setInterval(() => {
    pollOnce().catch((err) => console.error("poll error:", err.message));
  }, pollMs);

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(hb);
    clearInterval(poll);
    console.log("Shutting down mac-worker");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Immediate first poll
  await pollOnce();
}

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
