#!/usr/bin/env node
/**
 * Dispatches a Cursor cloud agent to implement a GitHub issue.
 * Called from .github/workflows/issue-implement.yml (via route-implement)
 * or by the VPS control plane on local-first fallback.
 */
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { loadConfig } from "./load-config.mjs";

function applyTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

/**
 * Build the full consumer implement prompt (context + issue + reminders).
 * Used by direct Cursor dispatch and passed to the VPS control plane so
 * Mac-offline / validation fallback keeps Fasted (or any consumer) rules.
 */
export async function buildImplementPrompt(opts = {}) {
  const issueNumber = opts.issueNumber || process.env.ISSUE_NUMBER;
  const repo = opts.repo || process.env.REPO;
  const ghToken = opts.ghToken || process.env.GH_TOKEN;
  const config = opts.config || (await loadConfig());

  if (!issueNumber || !repo || !ghToken) {
    throw new Error("buildImplementPrompt requires issueNumber, repo, GH_TOKEN");
  }

  const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;

  function gh(args) {
    return execSync(`gh ${args}`, {
      encoding: "utf-8",
      env: { ...process.env, GH_TOKEN: ghToken },
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  const issue = JSON.parse(
    gh(
      `issue view ${issueNumber} --repo ${repo} --json title,body,labels,comments`
    )
  );

  let context = "";
  try {
    context = await readFile(".github/ai-implement-context.md", "utf-8");
  } catch {
    context = "(no .github/ai-implement-context.md in cwd)";
  }

  const commentBodies = (issue.comments ?? [])
    .map((c) => c.body)
    .filter(Boolean)
    .join("\n\n---\n\n");

  const reminders = applyTemplate(config.prompt.postImplementReminders, {
    N: issueNumber,
  });

  let prompt = `${context}

---

## Issue to implement

**URL:** ${issueUrl}
**Number:** #${issueNumber}
**Title:** ${issue.title}

### Issue body
${issue.body ?? "(empty)"}

### Comments (includes spec / acceptance criteria)
${commentBodies || "(no comments yet — read the issue body carefully)"}

Implement this issue now.

**Critical reminders:**
${reminders
  .split("\n")
  .map((line) => (line.startsWith("-") ? line : `- ${line}`))
  .join("\n")}
`;

  if (opts.promptPrefix) {
    prompt = `${opts.promptPrefix}\n\n---\n\n${prompt}`;
  }

  return {
    prompt,
    title: issue.title,
    issueUrl,
  };
}

/**
 * Programmatic entry used by route-implement and control-plane fallback.
 *
 * @param {object} opts
 * @param {string} opts.issueNumber
 * @param {string} opts.repo
 * @param {string} [opts.apiKey]
 * @param {string} [opts.ghToken]
 * @param {string} [opts.startingRef] — branch/ref override (handoff)
 * @param {string} [opts.promptOverride] — full prompt override (handoff)
 * @param {string} [opts.model]
 * @param {string} [opts.promptPrefix] — prepended to the standard prompt
 */
export async function dispatchCursorAgent(opts = {}) {
  const issueNumber = opts.issueNumber || process.env.ISSUE_NUMBER;
  const repo = opts.repo || process.env.REPO;
  const apiKey = opts.apiKey || process.env.CURSOR_API_KEY;
  const ghToken = opts.ghToken || process.env.GH_TOKEN;

  if (!issueNumber || !repo || !apiKey || !ghToken) {
    throw new Error(
      "Missing required: issueNumber, repo, CURSOR_API_KEY, GH_TOKEN"
    );
  }

  const config = await loadConfig();
  const modelId =
    opts.model ||
    config.agents?.implementation?.fallback?.model ||
    config.agent.model ||
    "composer-2.5";
  const defaultBranch =
    opts.startingRef ||
    process.env.DEFAULT_BRANCH ||
    process.env.STARTING_REF ||
    config.agent.startingRef ||
    config.project.defaultBranch ||
    "main";

  const repoUrl = `https://github.com/${repo}`;

  function gh(args) {
    return execSync(`gh ${args}`, {
      encoding: "utf-8",
      env: { ...process.env, GH_TOKEN: ghToken },
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  async function ghIssueComment(body) {
    const tmp = join(tmpdir(), `issue-${issueNumber}-comment.md`);
    await writeFile(tmp, body, "utf-8");
    gh(`issue comment ${issueNumber} --repo ${repo} --body-file ${tmp}`);
  }

  let prompt = opts.promptOverride;
  if (!prompt) {
    ({ prompt } = await buildImplementPrompt({
      issueNumber,
      repo,
      ghToken,
      config,
      promptPrefix: opts.promptPrefix,
    }));
  }

  const { agentWorking, agentFailed, ready } = config.labels;

  let agent;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: modelId },
      cloud: {
        repos: [{ url: repoUrl, startingRef: defaultBranch }],
        autoCreatePR: true,
        skipReviewerRequest: true,
        envVars: {
          GH_TOKEN: ghToken,
        },
      },
      mcpServers: {
        github: {
          type: "stdio",
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: ghToken },
        },
      },
    });

    const run = await agent.send(prompt);
    const info = {
      agentId: agent.agentId,
      runId: run.id,
      issue: issueNumber,
      startingRef: defaultBranch,
    };
    console.log("Cloud agent started:", info);

    const handoffNote = opts.startingRef
      ? `\n- **Starting ref (handoff):** \`${opts.startingRef}\``
      : "";

    await ghIssueComment(
      `🤖 **Cursor cloud agent started** for this issue.

- **Agent ID:** \`${agent.agentId}\`
- **Run ID:** \`${run.id}\`
- **Track progress:** [cursor.com/agents](https://cursor.com/agents)${handoffNote}

${config.prompt.agentStartedComment}`
    );

    return info;
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error("Failed to start cloud agent:", err.message);
      try {
        gh(
          `issue edit ${issueNumber} --repo ${repo} --remove-label ${agentWorking} --add-label ${agentFailed} --add-label ${ready}`
        );
        await ghIssueComment(
          `❌ Cursor cloud agent **failed to start**: ${err.message}

Re-add the \`${ready}\` label after fixing the blocker (API key, repo access, etc.).`
        );
      } catch (ghErr) {
        console.error("Failed to update issue after agent error:", ghErr);
      }
      throw err;
    }
    throw err;
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  try {
    await dispatchCursorAgent({
      startingRef: process.env.STARTING_REF || undefined,
      promptOverride: process.env.PROMPT_OVERRIDE || undefined,
      model: process.env.CURSOR_MODEL || undefined,
    });
  } catch (err) {
    if (err instanceof CursorAgentError) process.exit(1);
    console.error(err.message || err);
    process.exit(1);
  }
}
