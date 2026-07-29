import { readFile } from "node:fs/promises";

const DEFAULTS = {
  project: { name: "Project", defaultBranch: "main" },
  agent: { model: "composer-2.5", startingRef: "main" },
  agents: {
    implementation: {
      strategy: "cursor-only",
      primary: {
        worker: "mac-m1-max",
        provider: "ollama",
        model: "qwen2.5-coder:7b",
      },
      fallback: {
        provider: "cursor-cloud",
        model: "composer-2.5",
      },
      policy: {
        maxLocalAttempts: 2,
        timeoutMinutes: 35,
        requireChanges: true,
        requireValidation: true,
      },
    },
  },
  controlPlane: {
    url: "",
  },
  labels: {
    needsSpec: "needs-spec",
    specAdded: "spec-added",
    ready: "ready",
    agentWorking: "agent-working",
    prOpened: "pr-opened",
    agentFailed: "agent-failed",
    noAgent: "no-agent",
    agentManual: "agent-manual",
  },
  automation: {
    autoSpecOnOpen: true,
    autoReadyAfterSpec: true,
  },
  prompt: {
    postImplementReminders: `- Open a PR with \`Fixes #{N}\` in the body — leave it as a **draft** unless your repo docs say otherwise.
- UI changes REQUIRE screenshots committed under \`artifacts/issue-{N}/\` and linked in the issue completion comment.
- Update labels: remove \`agent-working\`, add \`pr-opened\` when the PR is open.
- You MUST post the issue completion comment before stopping. Do not stop right after opening the PR.`,
    agentStartedComment: `The agent will implement the fix, open a draft PR, post screenshots (if UI changed), update labels, and post a completion comment.`,
  },
};

function parseScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseBlockScalar(lines, startIndex) {
  const firstLine = lines[startIndex];
  const indent = firstLine.search(/\S/);
  const contentLines = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      contentLines.push("");
      continue;
    }
    if (line.search(/\S/) < indent) break;
    contentLines.push(line.slice(indent));
  }
  return contentLines.join("\n").trimEnd();
}

function sectionAt(lines, index) {
  for (let i = index; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t || t.startsWith("#")) continue;
    if (!lines[i].startsWith(" ") && t.endsWith(":")) {
      return t.slice(0, -1);
    }
  }
  return "";
}

/** Build indent → key stack for nested mapping keys (key: with no inline value). */
function nestPath(lines, index) {
  const stack = [];
  for (let i = 0; i <= index; i++) {
    const line = lines[i];
    if (!line || !line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const mapOnly = trimmed.match(/^([\w.-]+):\s*$/);
    const mapValue = trimmed.match(/^([\w.-]+):\s+\S/);
    if (mapOnly) {
      while (stack.length && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      stack.push({ indent, key: mapOnly[1] });
    } else if (mapValue) {
      while (stack.length && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
    }
  }
  return stack.map((s) => s.key);
}

const DEFAULT_CONFIG_PATHS = [".github/seos.yml", ".github/issue-bench.yml"];

/**
 * Minimal YAML parser for the SEOS config v1 schema (no external deps).
 *
 * When no explicit path is given, tries `.github/seos.yml` first and falls back
 * to the legacy `.github/issue-bench.yml` for backward compatibility.
 */
export async function loadConfig(configPath) {
  const candidates = configPath ? [configPath] : DEFAULT_CONFIG_PATHS;

  let raw;
  for (const candidate of candidates) {
    try {
      raw = await readFile(candidate, "utf-8");
      break;
    } catch {
      // try next candidate
    }
  }

  if (raw === undefined) {
    return structuredClone(DEFAULTS);
  }

  const config = structuredClone(DEFAULTS);
  const lines = raw.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const section = sectionAt(lines, i - 1);
    const path = nestPath(lines, i - 1);
    const pathStr = path.join(".");

    const projectName = line.match(/^  name:\s*(.+)$/);
    if (projectName && section === "project") {
      config.project.name = parseScalar(projectName[1]);
      continue;
    }
    const defaultBranch = line.match(/^  defaultBranch:\s*(.+)$/);
    if (defaultBranch && section === "project") {
      config.project.defaultBranch = parseScalar(defaultBranch[1]);
      continue;
    }
    const model = line.match(/^  model:\s*(.+)$/);
    if (model && section === "agent") {
      config.agent.model = parseScalar(model[1]);
      continue;
    }
    const startingRef = line.match(/^  startingRef:\s*(.+)$/);
    if (startingRef && section === "agent") {
      config.agent.startingRef = parseScalar(startingRef[1]);
      config.project.defaultBranch =
        config.agent.startingRef || config.project.defaultBranch;
      continue;
    }
    if (line.trim() === "postImplementReminders: |" && section === "prompt") {
      config.prompt.postImplementReminders = parseBlockScalar(lines, i);
      continue;
    }
    if (line.trim() === "agentStartedComment: |" && section === "prompt") {
      config.prompt.agentStartedComment = parseBlockScalar(lines, i);
      continue;
    }

    const labelKeys = {
      needsSpec: "needsSpec",
      specAdded: "specAdded",
      ready: "ready",
      agentWorking: "agentWorking",
      prOpened: "prOpened",
      agentFailed: "agentFailed",
      noAgent: "noAgent",
      agentManual: "agentManual",
    };
    for (const [yamlKey, configKey] of Object.entries(labelKeys)) {
      const m = line.match(new RegExp(`^  ${yamlKey}:\\s*(.+)$`));
      if (m && section === "labels") {
        config.labels[configKey] = String(parseScalar(m[1]));
      }
    }

    const autoSpec = line.match(/^  autoSpecOnOpen:\s*(.+)$/);
    if (autoSpec && section === "automation") {
      config.automation.autoSpecOnOpen = Boolean(parseScalar(autoSpec[1]));
      continue;
    }
    const autoReady = line.match(/^  autoReadyAfterSpec:\s*(.+)$/);
    if (autoReady && section === "automation") {
      config.automation.autoReadyAfterSpec = Boolean(parseScalar(autoReady[1]));
      continue;
    }

    const cpUrl = line.match(/^  url:\s*(.+)$/);
    if (cpUrl && section === "controlPlane") {
      config.controlPlane.url = String(parseScalar(cpUrl[1]));
      continue;
    }

    const kv = line.match(/^\s+([\w_]+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = parseScalar(rawValue);

    if (pathStr === "agents.implementation" && key === "strategy") {
      config.agents.implementation.strategy = String(value);
      continue;
    }
    if (pathStr === "agents.implementation.primary") {
      if (key === "worker") config.agents.implementation.primary.worker = String(value);
      if (key === "provider") config.agents.implementation.primary.provider = String(value);
      if (key === "model") config.agents.implementation.primary.model = String(value);
      continue;
    }
    if (pathStr === "agents.implementation.fallback") {
      if (key === "provider") config.agents.implementation.fallback.provider = String(value);
      if (key === "model") config.agents.implementation.fallback.model = String(value);
      continue;
    }
    if (pathStr === "agents.implementation.policy") {
      if (key === "max_local_attempts" || key === "maxLocalAttempts") {
        config.agents.implementation.policy.maxLocalAttempts = Number(value);
      }
      if (key === "timeout_minutes" || key === "timeoutMinutes") {
        config.agents.implementation.policy.timeoutMinutes = Number(value);
      }
      if (key === "require_changes" || key === "requireChanges") {
        config.agents.implementation.policy.requireChanges = Boolean(value);
      }
      if (key === "require_validation" || key === "requireValidation") {
        config.agents.implementation.policy.requireValidation = Boolean(value);
      }
    }
  }

  config.agent.startingRef =
    config.agent.startingRef || config.project.defaultBranch || "main";

  if (process.env.CONTROL_PLANE_URL) {
    config.controlPlane.url = process.env.CONTROL_PLANE_URL;
  }

  return config;
}

export { DEFAULTS };
