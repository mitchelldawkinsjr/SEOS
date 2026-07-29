import { access, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const required = [
  "workflows/issue-auto-triage.yml",
  "workflows/issue-spec.yml",
  "workflows/issue-implement.yml",
  "packages/dispatch/dispatch-cursor-agent.mjs",
  "packages/dispatch/route-implement.mjs",
  "packages/dispatch/build-cursor-handoff.mjs",
  "packages/dispatch/load-config.mjs",
  "packages/dispatch/compose-context.mjs",
  "packages/dispatch/generate-issue-spec.sh",
  "packages/dispatch/run-issue-implement.sh",
  "packages/control-plane/src/server.mjs",
  "packages/mac-worker/src/worker.mjs",
  "packages/cli/bin/seos.mjs",
  "scripts/deploy-control-plane.sh",
  "scripts/smoke-control-plane.sh",
  "docs/02-architecture/LOCAL_FIRST_RUNTIME.md",
  "context/agent-guide.base.md",
  "context/agent-manifest.json",
  "context/seos.yml",
  "context/rules/architecture-rules.md",
  "context/overrides/spec-tail.md",
  "context/knowledge/README.md",
  "template/.github/workflows/issue-auto-triage.yml",
  "template/.github/workflows/issue-spec.yml",
  "template/.github/workflows/issue-implement.yml",
  "template/.github/AGENT.md",
  "template/.github/agent-manifest.json",
  "template/.github/ai-spec-context.md",
  "template/.github/ai-implement-context.md",
  "template/.github/agent-knowledge/TEMPLATE.md",
  "template/package.json",
  "template/scripts/dispatch-cursor-agent.mjs",
  "template/scripts/route-implement.mjs",
  "template/scripts/build-cursor-handoff.mjs",
  "template/scripts/load-config.mjs",
  "template/scripts/compose-context.mjs",
  "template/scripts/generate-issue-spec.sh",
  "template/scripts/run-issue-implement.sh",
  "docs/LABELS.md",
  "docs/SETUP.md",
  "LICENSE",
];

let failed = false;

for (const rel of required) {
  try {
    await access(join(ROOT, rel));
    console.log(`ok ${rel}`);
  } catch {
    console.error(`missing ${rel}`);
    failed = true;
  }
}

const dispatch = await readFile(
  join(ROOT, "packages/dispatch/dispatch-cursor-agent.mjs"),
  "utf-8"
);
if (dispatch.includes("Bugbot + Ponytail run when")) {
  console.error("dispatch script still contains Fasted-specific Bugbot text");
  failed = true;
}

const autoTriage = await readFile(
  join(ROOT, "workflows/issue-auto-triage.yml"),
  "utf-8"
);
if (!autoTriage.includes("cancel-in-progress: false")) {
  console.error("issue-auto-triage.yml missing concurrency cancel-in-progress: false");
  failed = true;
}
if (!autoTriage.includes("generate-issue-spec.sh")) {
  console.error("issue-auto-triage.yml must use shared generate-issue-spec.sh");
  failed = true;
}

const issueSpec = await readFile(join(ROOT, "workflows/issue-spec.yml"), "utf-8");
if (!issueSpec.includes("github-actions[bot]")) {
  console.error("issue-spec.yml must skip bot-applied labels");
  failed = true;
}

try {
  execSync("node scripts/compose-context.mjs --check", {
    cwd: join(ROOT, "template"),
    stdio: "pipe",
  });
  console.log("ok template agent:compose --check");
} catch (err) {
  console.error("template context drift — run npm run sync-template");
  console.error(err.stderr?.toString() || err.message);
  failed = true;
}

if (failed) process.exit(1);
console.log("validate: all checks passed");
