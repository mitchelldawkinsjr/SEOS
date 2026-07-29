import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../src/store.mjs";
import { shouldFallback } from "../src/cursor-fallback.mjs";

test("createJob and claimNextJob", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seos-cp-"));
  try {
    const store = createStore(dir);
    const job = await store.createJob({
      issueNumber: 42,
      repo: "owner/repo",
      strategy: "local-first",
      primary: { worker: "mac-m1-max" },
    });
    assert.equal(job.status, "queued");
    await store.upsertHeartbeat({
      id: "mac-m1-max",
      capabilities: ["coding"],
      busy: false,
      modelAvailable: true,
    });
    const healthy = await store.findHealthyWorker("mac-m1-max");
    assert.equal(healthy.id, "mac-m1-max");
    const claimed = await store.claimNextJob("mac-m1-max");
    assert.equal(claimed.id, job.id);
    assert.equal(claimed.status, "running");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("shouldFallback covers validation_failed", () => {
  assert.equal(shouldFallback("validation_failed", false), true);
  assert.equal(shouldFallback("success", false), false);
  assert.equal(shouldFallback("weird", true), true);
});
