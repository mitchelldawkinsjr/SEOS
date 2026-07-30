import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCursorHandoff,
  buildWorkerOfflineHandoff,
} from "./build-cursor-handoff.mjs";

test("buildCursorHandoff preserves branch and diff", () => {
  const handoff = buildCursorHandoff({
    issueNumber: 142,
    repo: "owner/repo",
    result: {
      status: "validation_failed",
      branch: "seos/issue-142",
      changedFileList: ["src/a.ts"],
      failedCommands: ["npm test"],
      diff: "diff --git a/src/a.ts",
      summary: "tests failing",
    },
  });
  assert.equal(handoff.startingRef, "seos/issue-142");
  assert.match(handoff.prompt, /seos\/issue-142/);
  assert.match(handoff.prompt, /npm test/);
  assert.match(handoff.prompt, /Preserve working changes/);
});

test("buildWorkerOfflineHandoff has null startingRef", () => {
  const handoff = buildWorkerOfflineHandoff({
    issueNumber: 1,
    repo: "owner/repo",
  });
  assert.equal(handoff.startingRef, null);
  assert.match(handoff.prompt, /offline/i);
  assert.match(handoff.prompt, /Fixes #1/);
  assert.match(handoff.prompt, /Do not merge/);
});

test("buildCursorHandoff escalates no_changes dry-run with branch hint", () => {
  const handoff = buildCursorHandoff({
    issueNumber: 1,
    repo: "owner/repo",
    result: {
      status: "no_changes",
      branch: "seos/issue-1",
      changedFileList: [],
      failedCommands: [],
      diff: "",
      summary:
        "Dry-run harness: no local edits applied. Configure SEOS_WORKER_HARNESS=shell and SEOS_WORKER_COMMAND to enable a real harness.",
    },
  });
  assert.equal(handoff.startingRef, "seos/issue-1");
  assert.match(handoff.prompt, /no_changes/);
  assert.match(handoff.prompt, /Dry-run harness/);
  assert.match(handoff.prompt, /Preserve working changes/);
  assert.match(handoff.prompt, /Do not merge/);
});
