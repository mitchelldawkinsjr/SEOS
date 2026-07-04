#!/usr/bin/env node
/**
 * Validates the SEOS scaffold on a simulated blank Vite+React consumer.
 * Full e2e (OpenAI + Cursor) requires API keys — this checks structure only.
 */
import { mkdtemp, rm, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const tmp = await mkdtemp(join(tmpdir(), "seos-vite-"));
try {
  execSync(
    `node packages/cli/bin/seos.mjs init --yes --preset vite-react --name "Vite Test" --repo test/vite --dir "${tmp}"`,
    { cwd: ROOT, stdio: "pipe" }
  );

  const checks = [
    join(tmp, ".github/workflows/issue-auto-triage.yml"),
    join(tmp, ".github/workflows/issue-spec.yml"),
    join(tmp, ".github/workflows/issue-implement.yml"),
    join(tmp, ".github/ai-spec-context.md"),
    join(tmp, ".github/ai-implement-context.md"),
    join(tmp, ".github/AGENT.md"),
    join(tmp, ".github/agent-manifest.json"),
    join(tmp, ".github/agent-rules/architecture-rules.md"),
    join(tmp, ".github/agent-overrides/spec-tail.md"),
    join(tmp, ".github/agent-knowledge/TEMPLATE.md"),
    join(tmp, ".github/seos.yml"),
    join(tmp, "package.json"),
    join(tmp, "scripts/compose-context.mjs"),
    join(tmp, "scripts/generate-issue-spec.sh"),
    join(tmp, "scripts/run-issue-implement.sh"),
  ];

  for (const path of checks) {
    await access(path);
  }

  const spec = await readFile(join(tmp, ".github/ai-spec-context.md"), "utf-8");
  const implement = await readFile(
    join(tmp, ".github/ai-implement-context.md"),
    "utf-8"
  );
  const agent = await readFile(join(tmp, ".github/AGENT.md"), "utf-8");
  const pkg = JSON.parse(await readFile(join(tmp, "package.json"), "utf-8"));
  const config = await readFile(join(tmp, ".github/seos.yml"), "utf-8");

  if (!spec.includes("Vite Test")) throw new Error("spec context missing project name");
  if (!spec.includes("AUTO-GENERATED")) {
    throw new Error("spec context should be composed (AUTO-GENERATED header)");
  }
  if (!implement.includes("npm run test:e2e")) throw new Error("implement missing test command");
  if (!agent.includes("Vite Test")) throw new Error("AGENT.md missing project name");
  if (!config.includes("autoSpecOnOpen: true")) {
    throw new Error("seos.yml missing automation block");
  }
  if (!pkg.dependencies?.["@cursor/sdk"]) {
    throw new Error("package.json missing @cursor/sdk");
  }
  if (!pkg.scripts?.["agent:compose"]) {
    throw new Error("package.json missing agent:compose script");
  }

  execSync("node scripts/compose-context.mjs --check", {
    cwd: tmp,
    stdio: "pipe",
  });

  await access(join(tmp, "scripts/dispatch-cursor-agent.mjs"));
  await access(join(tmp, "scripts/load-config.mjs"));

  console.log("validate-vite-consumer: structure checks passed");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
