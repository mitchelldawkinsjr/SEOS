import test from "node:test";
import assert from "node:assert/strict";
import { createControlPlaneClient } from "../src/client.mjs";
import { runLocalJob } from "../src/run-job.mjs";

test("createControlPlaneClient posts heartbeat", async () => {
  const calls = [];
  const client = createControlPlaneClient({
    baseUrl: "http://example.test",
    token: "t",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        status: 200,
        ok: true,
        async text() {
          return JSON.stringify({ worker: { id: "mac-m1-max" } });
        },
      };
    },
  });
  const data = await client.heartbeat({ id: "mac-m1-max", busy: false });
  assert.equal(data.worker.id, "mac-m1-max");
  assert.equal(calls[0].url, "http://example.test/v1/workers/heartbeat");
  assert.match(calls[0].init.headers.authorization, /Bearer t/);
});

test("runLocalJob dry returns no_changes + fallback", async () => {
  const result = await runLocalJob(
    {
      issueNumber: 9,
      repo: "o/r",
      primary: { model: "qwen2.5-coder:7b", worker: "mac-m1-max" },
    },
    { SEOS_WORKER_HARNESS: "dry" }
  );
  assert.equal(result.status, "no_changes");
  assert.equal(result.fallbackRecommended, true);
  assert.equal(result.branch, "seos/issue-9");
});
