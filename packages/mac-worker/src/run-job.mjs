import { execSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Phase 1 local harness scaffold.
 *
 * Default mode is "dry" (no repo mutation) for safe smoke tests.
 * Set SEOS_WORKER_HARNESS=shell to run a user-provided command template.
 *
 * Real OpenCode/Aider/Ollama integration plugs in here later.
 */
export async function runLocalJob(job, env = process.env) {
  const harness = env.SEOS_WORKER_HARNESS || "dry";
  const model = job.primary?.model || env.SEOS_LOCAL_MODEL || "qwen2.5-coder:7b";
  const workerId = env.SEOS_WORKER_ID || job.primary?.worker || "mac-m1-max";
  const branch = `seos/issue-${job.issueNumber}`;

  if (harness === "dry") {
    return {
      status: "no_changes",
      agent: "implementation",
      worker: workerId,
      model,
      attempts: 1,
      changedFiles: 0,
      // No local branch was created — Cursor fallback must use defaultBranch.
      branch: null,
      failedCommands: [],
      changedFileList: [],
      diff: "",
      summary:
        "Dry-run harness: no local edits applied. Configure SEOS_WORKER_HARNESS=shell and SEOS_WORKER_COMMAND to enable a real harness.",
      fallbackRecommended: true,
    };
  }

  if (harness !== "shell") {
    return {
      status: "failed",
      agent: "implementation",
      worker: workerId,
      model,
      attempts: 1,
      changedFiles: 0,
      branch,
      failedCommands: [],
      summary: `Unknown harness: ${harness}`,
      fallbackRecommended: true,
    };
  }

  const command = env.SEOS_WORKER_COMMAND;
  if (!command) {
    return {
      status: "failed",
      agent: "implementation",
      worker: workerId,
      model,
      attempts: 1,
      changedFiles: 0,
      branch,
      failedCommands: [],
      summary: "SEOS_WORKER_COMMAND unset",
      fallbackRecommended: true,
    };
  }

  const work = await mkdtemp(join(tmpdir(), "seos-job-"));
  const failedCommands = [];
  try {
    const rendered = command
      .replaceAll("{issue}", String(job.issueNumber))
      .replaceAll("{repo}", job.repo)
      .replaceAll("{branch}", branch)
      .replaceAll("{model}", model)
      .replaceAll("{workdir}", work);

    execSync(rendered, {
      cwd: work,
      env: { ...env, ISSUE_NUMBER: String(job.issueNumber), REPO: job.repo },
      stdio: "inherit",
      shell: "/bin/bash",
    });

    return {
      status: "success",
      agent: "implementation",
      worker: workerId,
      model,
      attempts: 1,
      changedFiles: 0,
      branch,
      failedCommands: [],
      summary: "Shell harness completed without error (caller must open draft PR).",
      fallbackRecommended: false,
    };
  } catch (err) {
    failedCommands.push(command);
    return {
      status: "validation_failed",
      agent: "implementation",
      worker: workerId,
      model,
      attempts: 1,
      changedFiles: 0,
      branch,
      failedCommands,
      summary: err.message || "shell harness failed",
      fallbackRecommended: true,
    };
  } finally {
    if (env.SEOS_WORKER_KEEP_WORKDIR !== "1") {
      await rm(work, { recursive: true, force: true });
    }
  }
}
