import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, "../src/server.mjs");

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on("error", reject);
  });
}

async function waitForHealthz(baseUrl, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/healthz`);
      if (res.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`control plane did not become ready at ${baseUrl}`);
}

async function startServer({ port, dataDir, token = "test-token" }) {
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(port),
      SEOS_DATA_DIR: dataDir,
      CONTROL_PLANE_TOKEN: token,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForHealthz(baseUrl);
  return { child, baseUrl, token };
}

async function stopServer(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.on("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (!child.killed) child.kill("SIGKILL");
}

test("GET /healthz returns ok", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "seos-cp-srv-"));
  const port = await getFreePort();
  let child;
  try {
    ({ child } = await startServer({ port, dataDir }));
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "seos-control-plane");
  } finally {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("POST /v1/jobs requires auth when token configured", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "seos-cp-srv-"));
  const port = await getFreePort();
  let child;
  try {
    ({ child } = await startServer({ port, dataDir }));
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ issueNumber: 1, repo: "owner/repo" }),
    });
    assert.equal(res.status, 401);
  } finally {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("POST /v1/jobs with Mac offline returns fallback_stubbed and worker_offline", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "seos-cp-srv-"));
  const port = await getFreePort();
  let child;
  try {
    ({ child } = await startServer({ port, dataDir }));
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        issueNumber: 1,
        repo: "mitchelldawkinsjr/SEOS",
        strategy: "local-first",
        primary: { worker: "mac-m1-max" },
      }),
    });
    assert.equal(res.status, 201);
    const { job } = await res.json();
    assert.equal(job.status, "fallback_stubbed");
    assert.equal(job.fallbackTriggered, true);
    assert.equal(job.result.status, "worker_offline");
    assert.equal(job.cursorDispatch.stubbed, true);
  } finally {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("healthy Mac worker leaves job queued for claim", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "seos-cp-srv-"));
  const port = await getFreePort();
  let child;
  try {
    ({ child } = await startServer({ port, dataDir }));
    const base = `http://127.0.0.1:${port}`;
    const headers = {
      "content-type": "application/json",
      authorization: "Bearer test-token",
    };

    const hb = await fetch(`${base}/v1/workers/heartbeat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: "mac-m1-max",
        capabilities: ["coding"],
        busy: false,
        modelAvailable: true,
      }),
    });
    assert.equal(hb.status, 200);

    const enqueue = await fetch(`${base}/v1/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        issueNumber: 42,
        repo: "owner/repo",
        strategy: "local-first",
        primary: { worker: "mac-m1-max" },
      }),
    });
    assert.equal(enqueue.status, 201);
    const { job } = await enqueue.json();
    assert.equal(job.status, "queued");
    assert.equal(job.fallbackTriggered, false);

    const claim = await fetch(`${base}/v1/workers/mac-m1-max/claim`, {
      method: "POST",
      headers,
    });
    assert.equal(claim.status, 200);
    const { job: claimed } = await claim.json();
    assert.equal(claimed.status, "running");
    assert.equal(claimed.assignedWorker, "mac-m1-max");
  } finally {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("POST /v1/jobs/:id/result with validation_failed triggers fallback", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "seos-cp-srv-"));
  const port = await getFreePort();
  let child;
  try {
    ({ child } = await startServer({ port, dataDir }));
    const base = `http://127.0.0.1:${port}`;
    const headers = {
      "content-type": "application/json",
      authorization: "Bearer test-token",
    };

    await fetch(`${base}/v1/workers/heartbeat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: "mac-m1-max",
        capabilities: ["coding"],
        busy: false,
      }),
    });

    const enqueue = await fetch(`${base}/v1/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        issueNumber: 99,
        repo: "owner/repo",
        strategy: "local-first",
        primary: { worker: "mac-m1-max" },
      }),
    });
    const { job } = await enqueue.json();
    await fetch(`${base}/v1/workers/mac-m1-max/claim`, {
      method: "POST",
      headers,
    });

    const result = await fetch(`${base}/v1/jobs/${job.id}/result`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        status: "validation_failed",
        branch: "seos/issue-99",
        failedCommands: ["npm test"],
        summary: "tests failing",
        fallbackRecommended: true,
      }),
    });
    assert.equal(result.status, 200);
    const { job: updated } = await result.json();
    assert.equal(updated.status, "fallback_stubbed");
    assert.equal(updated.fallbackTriggered, true);
    assert.equal(updated.result.status, "validation_failed");
  } finally {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  }
});
