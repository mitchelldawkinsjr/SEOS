import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const FALLBACK_STATUSES = new Set([
  "failed",
  "blocked",
  "timeout",
  "worker_offline",
  "model_unavailable",
  "no_changes",
  "invalid_patch",
  "validation_failed",
]);

export function createStore(dataDir) {
  const jobsPath = join(dataDir, "jobs.json");
  const workersPath = join(dataDir, "workers.json");

  async function ensure() {
    await mkdir(dataDir, { recursive: true });
    for (const p of [jobsPath, workersPath]) {
      try {
        await readFile(p, "utf-8");
      } catch {
        await writeFile(p, "[]\n", "utf-8");
      }
    }
  }

  async function readJson(path) {
    await ensure();
    const raw = await readFile(path, "utf-8");
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async function writeJson(path, value) {
    await ensure();
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
    await rename(tmp, path);
  }

  return {
    FALLBACK_STATUSES,

    async listJobs() {
      return readJson(jobsPath);
    },

    async getJob(id) {
      const jobs = await readJson(jobsPath);
      return jobs.find((j) => j.id === id) ?? null;
    },

    async createJob(payload) {
      const jobs = await readJson(jobsPath);
      const now = new Date().toISOString();
      const job = {
        id: randomUUID(),
        type: payload.type || "implementation",
        status: "queued",
        createdAt: now,
        updatedAt: now,
        issueNumber: String(payload.issueNumber),
        repo: payload.repo,
        strategy: payload.strategy || "local-first",
        primary: payload.primary || {},
        fallback: payload.fallback || { provider: "cursor-cloud" },
        policy: payload.policy || {},
        assignedWorker: null,
        result: null,
        fallbackTriggered: false,
        cursorDispatch: null,
        meta: payload.meta || {},
      };
      jobs.push(job);
      await writeJson(jobsPath, jobs);
      return job;
    },

    async updateJob(id, patch) {
      const jobs = await readJson(jobsPath);
      const idx = jobs.findIndex((j) => j.id === id);
      if (idx < 0) return null;
      jobs[idx] = {
        ...jobs[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await writeJson(jobsPath, jobs);
      return jobs[idx];
    },

    async listWorkers() {
      return readJson(workersPath);
    },

    async upsertHeartbeat(body) {
      const workers = await readJson(workersPath);
      const now = new Date().toISOString();
      const id = body.id || body.workerId;
      if (!id) throw new Error("worker id required");
      const idx = workers.findIndex((w) => w.id === id);
      const worker = {
        id,
        capabilities: body.capabilities || [],
        modelAvailable: body.modelAvailable !== false,
        busy: Boolean(body.busy),
        lastHeartbeatAt: now,
        meta: body.meta || {},
      };
      if (idx >= 0) workers[idx] = { ...workers[idx], ...worker };
      else workers.push(worker);
      await writeJson(workersPath, workers);
      return worker;
    },

    isWorkerHealthy(worker, { staleSeconds = 90 } = {}) {
      if (!worker?.lastHeartbeatAt) return false;
      if (worker.busy) return false;
      if (worker.modelAvailable === false) return false;
      const ageMs = Date.now() - new Date(worker.lastHeartbeatAt).getTime();
      return ageMs <= staleSeconds * 1000;
    },

    async findHealthyWorker(preferredId) {
      const workers = await readJson(workersPath);
      const healthy = workers.filter((w) => this.isWorkerHealthy(w));
      if (preferredId) {
        const preferred = healthy.find((w) => w.id === preferredId);
        if (preferred) return preferred;
      }
      return healthy[0] ?? null;
    },

    async claimNextJob(workerId) {
      const jobs = await readJson(jobsPath);
      const job = jobs.find(
        (j) => j.status === "queued" && j.strategy === "local-first"
      );
      if (!job) return null;
      job.status = "running";
      job.assignedWorker = workerId;
      job.updatedAt = new Date().toISOString();
      await writeJson(jobsPath, jobs);
      return job;
    },
  };
}
