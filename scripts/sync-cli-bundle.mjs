import { copyFile, mkdir, rm, readdir, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ASSETS = join(ROOT, "packages", "cli", "assets");

const DISPATCH_FILES = [
  "dispatch-cursor-agent.mjs",
  "route-implement.mjs",
  "build-cursor-handoff.mjs",
  "load-config.mjs",
  "compose-context.mjs",
  "generate-issue-spec.sh",
  "run-issue-implement.sh",
];

const WORKFLOW_FILES = [
  "issue-auto-triage.yml",
  "issue-spec.yml",
  "issue-implement.yml",
];

// Start clean so deleted source files don't linger in the bundle.
await rm(ASSETS, { recursive: true, force: true });
await mkdir(join(ASSETS, "workflows"), { recursive: true });
await mkdir(join(ASSETS, "packages", "dispatch"), { recursive: true });

for (const file of WORKFLOW_FILES) {
  await copyFile(join(ROOT, "workflows", file), join(ASSETS, "workflows", file));
}

for (const file of DISPATCH_FILES) {
  await copyFile(
    join(ROOT, "packages", "dispatch", file),
    join(ASSETS, "packages", "dispatch", file)
  );
}

// Copy the whole context tree (guide, rules, overrides, manifest, knowledge,
// seos.yml, presets). Mirror the exact layout so `join(REPO_ROOT, "context/...")`
// resolves identically in bundled and monorepo modes.
await cp(join(ROOT, "context"), join(ASSETS, "context"), { recursive: true });

// Remove the legacy composed base files from the bundle — they are regenerated
// per-project by `npm run agent:compose` and should not be shipped as templates.
for (const legacy of ["ai-spec.base.md", "ai-implement.base.md"]) {
  await rm(join(ASSETS, "context", legacy), { force: true });
}

const listed = await readdir(ASSETS, { recursive: true });
console.log(`Bundled ${listed.length} entries into packages/cli/assets/`);
