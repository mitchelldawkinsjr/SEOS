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

