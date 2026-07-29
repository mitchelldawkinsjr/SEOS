import { copyFile, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

const vars = {
  PROJECT_NAME: "My App",
  REPO_SLUG: "owner/repo",
  STACK_SUMMARY: (
    await readFile(join(ROOT, "context/presets/vite-react.md"), "utf-8")
  ).trim(),
  BUILD_COMMAND: "npm run build",
  TEST_COMMAND: "npm run test:e2e",
  SCREENSHOT_DIR: "artifacts/issue-{N}/",
};

const templateGh = join(ROOT, "template/.github");
await mkdir(join(templateGh, "workflows"), { recursive: true });
await mkdir(join(templateGh, "agent-rules"), { recursive: true });
await mkdir(join(templateGh, "agent-overrides"), { recursive: true });
await mkdir(join(templateGh, "agent-knowledge"), { recursive: true });
await mkdir(join(ROOT, "template/scripts"), { recursive: true });

for (const file of [
  "issue-auto-triage.yml",
  "issue-spec.yml",
  "issue-implement.yml",
]) {
  await copyFile(
    join(ROOT, "workflows", file),
    join(templateGh, "workflows", file)
  );
}

for (const file of [
  "dispatch-cursor-agent.mjs",
  "route-implement.mjs",
  "build-cursor-handoff.mjs",
  "load-config.mjs",
  "compose-context.mjs",
  "generate-issue-spec.sh",
  "run-issue-implement.sh",
]) {
  await copyFile(
    join(ROOT, "packages/dispatch", file),
    join(ROOT, "template/scripts", file)
  );
}

async function writeFilled(targetPath, sourcePath) {
  const raw = await readFile(sourcePath, "utf-8");
  await writeFile(targetPath, fill(raw, vars));
}

await writeFilled(
  join(templateGh, "AGENT.md"),
  join(ROOT, "context/agent-guide.base.md")
);

for (const rule of [
  "architecture-rules.md",
  "testing-rules.md",
  "commit-rules.md",
  "product-rules.md",
]) {
  await writeFilled(
    join(templateGh, "agent-rules", rule),
    join(ROOT, "context/rules", rule)
  );
}

for (const tail of ["spec-tail.md", "implement-tail.md"]) {
  await writeFilled(
    join(templateGh, "agent-overrides", tail),
    join(ROOT, "context/overrides", tail)
  );
}

await writeFilled(
  join(templateGh, "agent-manifest.json"),
  join(ROOT, "context/agent-manifest.json")
);

await cp(
  join(ROOT, "context/knowledge/README.md"),
  join(templateGh, "agent-knowledge/README.md")
);
await cp(
  join(ROOT, "context/knowledge/TEMPLATE.md"),
  join(templateGh, "agent-knowledge/TEMPLATE.md")
);

const configTemplate = await readFile(join(ROOT, "context/seos.yml"), "utf-8");
await writeFile(join(templateGh, "seos.yml"), fill(configTemplate, vars));

execSync("node scripts/compose-context.mjs", {
  cwd: join(ROOT, "template"),
  stdio: "inherit",
});

// Keep legacy base files in sync for any external readers (composed output is canonical).
await copyFile(
  join(templateGh, "ai-spec-context.md"),
  join(ROOT, "context/ai-spec.base.md")
);
await copyFile(
  join(templateGh, "ai-implement-context.md"),
  join(ROOT, "context/ai-implement.base.md")
);

console.log(
  "Synced template/ from workflows/, context/, and packages/dispatch/"
);
