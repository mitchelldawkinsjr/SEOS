#!/usr/bin/env node
/**
 * SEOS control plane — always-on dispatcher on the VPS.
 *
 * Auth: Authorization: Bearer $CONTROL_PLANE_TOKEN
 */
import { createServer } from "node:http";
import { join } from "node:path";
import { createStore } from "./store.mjs";
import { shouldFallback, triggerCursorFallback } from "./cursor-fallback.mjs";

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = process.env.SEOS_DATA_DIR || join(process.cwd(), "data");
const TOKEN = process.env.CONTROL_PLANE_TOKEN || "";
const WORKER_STALE_SECONDS = Number(process.env.WORKER_STALE_SECONDS || 90);

const store = createStore(DATA_DIR);

function send(res, status, body) {
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(json),
  });
  res.end(json);
}

function unauthorized(res) {
  send(res, 401, { error: "unauthorized" });
}

function authorize(req) {
  if (!TOKEN) return true; // allow open mode for local smoke tests only
  const header = req.headers.authorization || "";
  const expected = `Bearer ${TOKEN}`;
  return header === expected;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    throw new Error("invalid JSON body");
  }
}

async function maybeAssignOrFallback(job) {
  if (job.strategy !== "local-first") {
    const handoff = {
      startingRef:
        job.meta?.startingRef || job.meta?.defaultBranch || "main",
      prompt: buildOfflineHandoffPrompt(job),
      summary: "Non local-first job routed to Cursor",
    };
    const cursor = await triggerCursorFallback({ job, handoff });
    return store.updateJob(job.id, {
      status: cursor.ok ? "fallback_dispatched" : "fallback_stubbed",
      fallbackTriggered: true,
      cursorDispatch: cursor,
    });
  }

  const preferred = job.primary?.worker;
  const worker = await store.findHealthyWorker(preferred);
  if (!worker) {
    const handoff = {
      startingRef: job.meta?.defaultBranch || "main",
      prompt: buildOfflineHandoffPrompt(job),
      summary: "Mac worker offline or unhealthy — escalating to Cursor Cloud",
    };
    const cursor = await triggerCursorFallback({
      job,
      handoff,
    });
    return store.updateJob(job.id, {
      status: cursor.ok ? "fallback_dispatched" : "fallback_stubbed",
      result: {
        status: "worker_offline",
        agent: "implementation",
        worker: preferred || null,
        fallbackRecommended: true,
        summary: handoff.summary,
      },
      fallbackTriggered: true,
      cursorDispatch: cursor,
    });
  }

  // Leave queued for Mac worker to claim
  return job;
}

function resolveFallbackStartingRef(job, result = {}) {
  const fallback = job.meta?.defaultBranch || "main";
  if (!result.branch) return fallback;
  if (result.status === "no_changes") return fallback;
  if (!result.changedFiles && !(result.changedFileList || []).length) {
    return fallback;
  }
  return result.branch;
}

function buildOfflineHandoffPrompt(job) {
  const attached = job.meta?.implementPrompt;
  if (typeof attached === "string" && attached.trim()) {
    return `The local SEOS Mac worker is offline or unhealthy. Continue with the consumer implement brief below (includes project rules, issue, and acceptance criteria). Open a draft PR with Fixes #${job.issueNumber}. Do not merge.

---

${attached.trim()}`;
  }

  return `The local SEOS implementation agent could not start because the Mac worker is offline or unhealthy.

Issue: https://github.com/${job.repo}/issues/${job.issueNumber}
Repo: ${job.repo}

Continue implementation from the configured default branch. Open a draft PR with Fixes #${job.issueNumber}. Do not merge.`;
}

function buildResultHandoffPrompt(job, result) {
  const branch = result.branch || job.meta?.branch || "(unknown)";
  const files = (result.changedFileList || []).join("\n") || "(none listed)";
  const failed = (result.failedCommands || []).join("\n") || "(none)";
  const localBlock = `The local SEOS implementation agent attempted this issue but did not complete validation.

Branch:
${branch}

Changed files:
${files}

Current diff:
${result.diff || "(diff not attached — pull the branch)"}

Failed commands:
${failed}

Local summary:
${result.summary || "(none)"}

Failure status: ${result.status}

Continue from the existing branch. Preserve working changes, fix the remaining problems, run validation, and update the draft pull request. Do not merge.`;

  const attached = job.meta?.implementPrompt;
  if (typeof attached === "string" && attached.trim()) {
    return `${localBlock}

---

## Original consumer implement brief

${attached.trim()}`;
  }

  return localBlock;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/healthz") {
      return send(res, 200, {
        ok: true,
        service: "seos-control-plane",
        time: new Date().toISOString(),
      });
    }

    if (!authorize(req)) return unauthorized(res);

    if (req.method === "GET" && pathname === "/v1/workers") {
      const workers = await store.listWorkers();
      return send(res, 200, {
        workers: workers.map((w) => ({
          ...w,
          healthy: store.isWorkerHealthy(w, { staleSeconds: WORKER_STALE_SECONDS }),
        })),
      });
    }

    if (req.method === "POST" && pathname === "/v1/workers/heartbeat") {
      const body = await readBody(req);
      const worker = await store.upsertHeartbeat(body);
      return send(res, 200, { worker });
    }

    const claimMatch = pathname.match(/^\/v1\/workers\/([^/]+)\/claim$/);
    if (req.method === "POST" && claimMatch) {
      const workerId = decodeURIComponent(claimMatch[1]);
      const job = await store.claimNextJob(workerId);
      if (!job) return send(res, 204, {});
      return send(res, 200, { job });
    }

    if (req.method === "POST" && pathname === "/v1/jobs") {
      const body = await readBody(req);
      if (!body.issueNumber || !body.repo) {
        return send(res, 400, { error: "issueNumber and repo required" });
      }
      let job = await store.createJob(body);
      job = (await maybeAssignOrFallback(job)) || job;
      return send(res, 201, { job });
    }

    const jobMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
    if (req.method === "GET" && jobMatch) {
      const job = await store.getJob(jobMatch[1]);
      if (!job) return send(res, 404, { error: "not found" });
      return send(res, 200, { job });
    }

    const resultMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/result$/);
    if (req.method === "POST" && resultMatch) {
      const body = await readBody(req);
      const job = await store.getJob(resultMatch[1]);
      if (!job) return send(res, 404, { error: "not found" });

      const status = body.status || "failed";
      let updated = await store.updateJob(job.id, {
        status: status === "success" ? "succeeded" : status,
        result: body,
      });

      if (status !== "success" && shouldFallback(status, body.fallbackRecommended)) {
        const handoff = {
          // Dry / no_changes must not invent a missing branch for Cursor.
          startingRef: resolveFallbackStartingRef(job, body),
          prompt: buildResultHandoffPrompt(job, body),
          summary: body.summary || status,
        };
        const cursor = await triggerCursorFallback({ job: updated, handoff });
        updated = await store.updateJob(job.id, {
          status: cursor.ok ? "fallback_dispatched" : "fallback_stubbed",
          fallbackTriggered: true,
          cursorDispatch: cursor,
        });
      }

      return send(res, 200, { job: updated });
    }

    if (req.method === "GET" && pathname === "/v1/jobs") {
      return send(res, 200, { jobs: await store.listJobs() });
    }

    send(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || "internal error" });
  }
});

server.listen(PORT, () => {
  console.log(`SEOS control plane listening on :${PORT} (data=${DATA_DIR})`);
  if (!TOKEN) {
    console.warn("WARNING: CONTROL_PLANE_TOKEN unset — endpoints are open");
  }
});
