import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir, rm, mkdtemp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig, DEFAULTS } from "./load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, ".tmp-config");

const SAMPLE = `project:
  name: "Test App"
  defaultBranch: develop
agent:
  model: composer-2.5
  startingRef: develop
prompt:
  postImplementReminders: |
    Custom reminder one.
    Custom reminder two.
`;

test("loadConfig returns defaults when file missing", async () => {
  const config = await loadConfig(join(FIXTURE, "missing.yml"));
  assert.equal(config.project.defaultBranch, DEFAULTS.project.defaultBranch);
  assert.match(config.prompt.postImplementReminders, /draft/i);
});

test("loadConfig parses project name and postImplementReminders", async () => {
  await mkdir(FIXTURE, { recursive: true });
  await writeFile(join(FIXTURE, "seos.yml"), SAMPLE);
  const config = await loadConfig(join(FIXTURE, "seos.yml"));
  assert.equal(config.project.name, "Test App");
  assert.equal(config.agent.startingRef, "develop");
  assert.match(config.prompt.postImplementReminders, /Custom reminder one/);
  await rm(FIXTURE, { recursive: true, force: true });
});

test("loadConfig falls back to legacy .github/issue-bench.yml", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seos-config-"));
  await mkdir(join(dir, ".github"), { recursive: true });
  await writeFile(join(dir, ".github", "issue-bench.yml"), SAMPLE);
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    const config = await loadConfig();
    assert.equal(config.project.name, "Test App");
  } finally {
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadConfig prefers .github/seos.yml over legacy path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seos-config-"));
  await mkdir(join(dir, ".github"), { recursive: true });
  await writeFile(
    join(dir, ".github", "seos.yml"),
    SAMPLE.replace("Test App", "New Name")
  );
  await writeFile(join(dir, ".github", "issue-bench.yml"), SAMPLE);
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    const config = await loadConfig();
    assert.equal(config.project.name, "New Name");
  } finally {
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
});

const AUTOMATION_SAMPLE = `project:
  name: "Auto App"
automation:
  autoSpecOnOpen: false
  autoReadyAfterSpec: false
labels:
  noAgent: skip-bots
  agentManual: manual-ready
`;

test("loadConfig parses automation and opt-out labels", async () => {
  await mkdir(FIXTURE, { recursive: true });
  await writeFile(join(FIXTURE, "auto.yml"), AUTOMATION_SAMPLE);
  const config = await loadConfig(join(FIXTURE, "auto.yml"));
  assert.equal(config.automation.autoSpecOnOpen, false);
  assert.equal(config.automation.autoReadyAfterSpec, false);
  assert.equal(config.labels.noAgent, "skip-bots");
  assert.equal(config.labels.agentManual, "manual-ready");
  await rm(FIXTURE, { recursive: true, force: true });
});

test("loadConfig defaults enable automation", async () => {
  const config = await loadConfig(join(FIXTURE, "missing.yml"));
  assert.equal(config.automation.autoSpecOnOpen, true);
  assert.equal(config.automation.autoReadyAfterSpec, true);
  assert.equal(config.labels.noAgent, "no-agent");
});

const LOCAL_FIRST_SAMPLE = `project:
  name: "Local App"
agents:
  implementation:
    strategy: local-first
    primary:
      worker: mac-m1-max
      provider: ollama
      model: qwen2.5-coder:7b
    fallback:
      provider: cursor-cloud
      model: composer-2.5
    policy:
      max_local_attempts: 3
      timeout_minutes: 40
      require_changes: true
      require_validation: false
controlPlane:
  url: https://seos.example.com
`;

test("loadConfig defaults to cursor-only implementation strategy", async () => {
  const config = await loadConfig(join(FIXTURE, "missing.yml"));
  assert.equal(config.agents.implementation.strategy, "cursor-only");
  assert.equal(config.controlPlane.url, "");
});

test("loadConfig parses local-first agents and controlPlane", async () => {
  await mkdir(FIXTURE, { recursive: true });
  await writeFile(join(FIXTURE, "local.yml"), LOCAL_FIRST_SAMPLE);
  const config = await loadConfig(join(FIXTURE, "local.yml"));
  assert.equal(config.agents.implementation.strategy, "local-first");
  assert.equal(config.agents.implementation.primary.worker, "mac-m1-max");
  assert.equal(config.agents.implementation.primary.model, "qwen2.5-coder:7b");
  assert.equal(config.agents.implementation.fallback.provider, "cursor-cloud");
  assert.equal(config.agents.implementation.policy.maxLocalAttempts, 3);
  assert.equal(config.agents.implementation.policy.timeoutMinutes, 40);
  assert.equal(config.agents.implementation.policy.requireValidation, false);
  assert.equal(config.controlPlane.url, "https://seos.example.com");
  await rm(FIXTURE, { recursive: true, force: true });
});

test("loadConfig honors CONTROL_PLANE_URL env override", async () => {
  await mkdir(FIXTURE, { recursive: true });
  await writeFile(join(FIXTURE, "env.yml"), LOCAL_FIRST_SAMPLE);
  const prev = process.env.CONTROL_PLANE_URL;
  process.env.CONTROL_PLANE_URL = "http://127.0.0.1:8787";
  try {
    const config = await loadConfig(join(FIXTURE, "env.yml"));
    assert.equal(config.controlPlane.url, "http://127.0.0.1:8787");
  } finally {
    if (prev === undefined) delete process.env.CONTROL_PLANE_URL;
    else process.env.CONTROL_PLANE_URL = prev;
    await rm(FIXTURE, { recursive: true, force: true });
  }
});

