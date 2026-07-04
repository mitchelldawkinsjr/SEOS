#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile, access, cp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..");
const REPO_ROOT = join(PKG_ROOT, "..", "..");

const PRESETS = {
  "vite-react": {
    build: "npm run build",
    test: "npm run test:e2e",
    stackFile: "context/presets/vite-react.md",
  },
  nextjs: {
    build: "npm run build",
    test: "npm run test",
    stackFile: "context/presets/nextjs.md",
  },
  generic: {
    build: "npm run build",
    test: "npm test",
    stackFile: "context/presets/generic.md",
  },
};

const WORKFLOWS = [
  "issue-auto-triage.yml",
  "issue-spec.yml",
  "issue-implement.yml",
];

const DISPATCH_SCRIPTS = [
  "dispatch-cursor-agent.mjs",
  "load-config.mjs",
  "compose-context.mjs",
  "generate-issue-spec.sh",
  "run-issue-implement.sh",
];

const LABELS = [
  ["needs-spec", "Request AI acceptance criteria", "C5DEF5"],
  ["spec-added", "AI-generated acceptance criteria posted", "0E8A16"],
  ["ready", "Trigger Cursor cloud agent implementation", "FBCA04"],
  ["agent-working", "Cursor cloud agent implementing", "FBBA04"],
  ["pr-opened", "Implementation PR opened", "1D76DB"],
  ["agent-failed", "Cloud agent failed to implement", "D93F0B"],
  ["no-agent", "Skip automated agent pipeline", "666666"],
  ["agent-manual", "Require manual ready label before implement", "C2E0C6"],
];

function parseArgs(argv) {
  const opts = {
    yes: false,
    preset: null,
    dir: ".",
    createLabels: false,
    repo: "",
    projectName: "",
    branch: "main",
    build: "",
    test: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--yes" || arg === "-y") opts.yes = true;
    else if (arg === "--preset" || arg === "-p") opts.preset = argv[++i];
    else if (arg === "--dir" || arg === "-d") opts.dir = argv[++i];
    else if (arg === "--create-labels") opts.createLabels = true;
    else if (arg === "--repo") opts.repo = argv[++i];
    else if (arg === "--name") opts.projectName = argv[++i];
    else if (arg === "--branch") opts.branch = argv[++i];
    else if (arg === "init") continue;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`seos — Software Engineering Operating System

Usage:
  npx seos init [options]

Options:
  -y, --yes              Non-interactive defaults
  -p, --preset <name>    vite-react | nextjs | generic
  -d, --dir <path>       Target directory (default: .)
  --repo owner/name      GitHub repo slug for context placeholders
  --name <name>          Project name
  --branch <branch>      Default branch (default: main)
  --create-labels        Create GitHub labels via gh CLI
  -h, --help             Show help
`);
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function prompt(rl, question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue || "";
}

async function ensurePackageJson(targetDir) {
  const pkgPath = join(targetDir, "package.json");
  const cursorSdk = "^1.0.18";
  const agentScripts = {
    "agent:compose": "node scripts/compose-context.mjs",
    "agent:compose:check": "node scripts/compose-context.mjs --check",
  };

  if (await pathExists(pkgPath)) {
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    pkg.dependencies = pkg.dependencies || {};
    if (!pkg.dependencies["@cursor/sdk"]) {
      pkg.dependencies["@cursor/sdk"] = cursorSdk;
    }
    if (!pkg.type) pkg.type = "module";
    pkg.scripts = { ...agentScripts, ...(pkg.scripts || {}) };
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    return;
  }
  await writeFile(
    pkgPath,
    `${JSON.stringify(
      {
        name: "my-app",
        private: true,
        type: "module",
        scripts: agentScripts,
        dependencies: {
          "@cursor/sdk": cursorSdk,
        },
      },
      null,
      2
    )}\n`
  );
}

async function copyDispatchScripts(targetDir) {
  await mkdir(join(targetDir, "scripts"), { recursive: true });
  for (const file of DISPATCH_SCRIPTS) {
    await copyFile(
      join(REPO_ROOT, "packages/dispatch", file),
      join(targetDir, "scripts", file)
    );
  }
}

async function copyWorkflows(targetDir) {
  await mkdir(join(targetDir, ".github", "workflows"), { recursive: true });
  for (const file of WORKFLOWS) {
    await copyFile(
      join(REPO_ROOT, "workflows", file),
      join(targetDir, ".github", "workflows", file)
    );
  }
}

async function writeFilled(targetPath, sourcePath, vars) {
  const raw = await readFile(sourcePath, "utf-8");
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, fill(raw, vars));
}

async function installContextEngine(targetDir, vars) {
  const gh = join(targetDir, ".github");
  await mkdir(join(gh, "agent-rules"), { recursive: true });
  await mkdir(join(gh, "agent-overrides"), { recursive: true });
  await mkdir(join(gh, "agent-knowledge"), { recursive: true });

  await writeFilled(
    join(gh, "AGENT.md"),
    join(REPO_ROOT, "context/agent-guide.base.md"),
    vars
  );

  for (const rule of [
    "architecture-rules.md",
    "testing-rules.md",
    "commit-rules.md",
    "product-rules.md",
  ]) {
    await writeFilled(
      join(gh, "agent-rules", rule),
      join(REPO_ROOT, "context/rules", rule),
      vars
    );
  }

  for (const tail of ["spec-tail.md", "implement-tail.md"]) {
    await writeFilled(
      join(gh, "agent-overrides", tail),
      join(REPO_ROOT, "context/overrides", tail),
      vars
    );
  }

  await writeFilled(
    join(gh, "agent-manifest.json"),
    join(REPO_ROOT, "context/agent-manifest.json"),
    vars
  );

  await cp(
    join(REPO_ROOT, "context/knowledge/README.md"),
    join(gh, "agent-knowledge/README.md")
  );
  await cp(
    join(REPO_ROOT, "context/knowledge/TEMPLATE.md"),
    join(gh, "agent-knowledge/TEMPLATE.md")
  );
}

async function createLabels(repo) {
  for (const [name, description, color] of LABELS) {
    try {
      execSync(
        `gh label create "${name}" --description "${description}" --color "${color}" --repo "${repo}"`,
        { stdio: "ignore" }
      );
    } catch {
      // label may already exist
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!process.argv.includes("init")) {
    printHelp();
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), opts.dir);
  const presetName = opts.preset || "vite-react";
  const preset = PRESETS[presetName] || PRESETS.generic;

  let projectName = opts.projectName;
  let repo = opts.repo;
  let branch = opts.branch;
  let buildCommand = opts.build || preset.build;
  let testCommand = opts.test || preset.test;
  let createLabelsFlag = opts.createLabels;

  if (!opts.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    projectName = await prompt(rl, "Project name", projectName || "My App");
    repo = await prompt(
      rl,
      "GitHub repo (owner/name, optional)",
      repo || "owner/repo"
    );
    const presetAnswer = await prompt(
      rl,
      "Stack preset (vite-react, nextjs, generic)",
      presetName
    );
    Object.assign(preset, PRESETS[presetAnswer] || preset);
    branch = await prompt(rl, "Default branch", branch);
    buildCommand = await prompt(rl, "Build command", buildCommand);
    testCommand = await prompt(rl, "Test command (optional)", testCommand);
    const labelsAnswer = await prompt(rl, "Create GitHub labels via gh? (y/n)", "n");
    createLabelsFlag = labelsAnswer.toLowerCase().startsWith("y");
    rl.close();
  } else {
    projectName = projectName || "My App";
    repo = repo || "owner/repo";
  }

  const stackSummary = await readFile(
    join(REPO_ROOT, preset.stackFile || PRESETS.generic.stackFile),
    "utf-8"
  );

  const vars = {
    PROJECT_NAME: projectName,
    REPO_SLUG: repo,
    STACK_SUMMARY: stackSummary.trim(),
    BUILD_COMMAND: buildCommand,
    TEST_COMMAND: testCommand,
    SCREENSHOT_DIR: "artifacts/issue-{N}/",
  };

  const configTemplate = await readFile(
    join(REPO_ROOT, "context", "seos.yml"),
    "utf-8"
  );

  await mkdir(join(targetDir, ".github", "workflows"), { recursive: true });
  await writeFile(
    join(targetDir, ".github", "seos.yml"),
    fill(configTemplate, vars).replace(
      '  test: "{{TEST_COMMAND}}"',
      testCommand ? `  test: "${testCommand}"` : '  test: ""'
    )
  );

  await copyWorkflows(targetDir);
  await copyDispatchScripts(targetDir);
  await installContextEngine(targetDir, vars);
  execSync("node scripts/compose-context.mjs", { cwd: targetDir, stdio: "inherit" });
  await ensurePackageJson(targetDir);

  if (createLabelsFlag && repo.includes("/")) {
    try {
      await createLabels(repo);
      console.log("Created GitHub labels.");
    } catch (err) {
      console.warn("Could not create labels (is gh authenticated?):", err.message);
    }
  }

  console.log(`
SEOS initialized in ${targetDir}

Next steps:
  1. Add GitHub Actions secrets: OPENAI_API_KEY, CURSOR_API_KEY
  2. Enable Cursor cloud agent access for this repository
  3. Run npm install (installs @cursor/sdk for the dispatch script)
  4. Open an issue — auto-spec and auto-implement run by default
  5. Opt out with no-agent / agent-manual, or set AGENT_AUTO_* repo variables to false
  6. Review the draft PR and merge manually

Edit .github/AGENT.md and agent-rules/, then run: npm run agent:compose

Docs: https://github.com/mitchelldawkinsjr/SEOS
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
