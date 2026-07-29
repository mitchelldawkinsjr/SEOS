/**
 * Cursor Cloud dispatch for control-plane fallback.
 * Self-contained so the Docker image does not need the monorepo dispatch package.
 */
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";

/**
 * @param {object} opts
 * @param {string} opts.issueNumber
 * @param {string} opts.repo
 * @param {string} opts.apiKey
 * @param {string} opts.ghToken
 * @param {string} [opts.startingRef]
 * @param {string} [opts.promptOverride]
 * @param {string} [opts.model]
 */
export async function dispatchCursorAgent(opts = {}) {
  const issueNumber = opts.issueNumber;
  const repo = opts.repo;
  const apiKey = opts.apiKey;
  const ghToken = opts.ghToken;
  const modelId = opts.model || "composer-2.5";
  const startingRef = opts.startingRef || "main";

  if (!issueNumber || !repo || !apiKey || !ghToken) {
    throw new Error(
      "Missing required: issueNumber, repo, CURSOR_API_KEY, GH_TOKEN"
    );
  }

  const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
  const repoUrl = `https://github.com/${repo}`;

  function gh(args) {
    return execSync(`gh ${args}`, {
      encoding: "utf-8",
      env: { ...process.env, GH_TOKEN: ghToken },
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  async function ghIssueComment(body) {
    const tmp = join(tmpdir(), `seos-cp-issue-${issueNumber}-comment.md`);
    await writeFile(tmp, body, "utf-8");
    gh(`issue comment ${issueNumber} --repo ${repo} --body-file ${tmp}`);
  }

  let prompt = opts.promptOverride;
  if (!prompt) {
    const issue = JSON.parse(
      gh(
        `issue view ${issueNumber} --repo ${repo} --json title,body,comments`
      )
    );
    const commentBodies = (issue.comments ?? [])
      .map((c) => c.body)
      .filter(Boolean)
      .join("\n\n---\n\n");
    prompt = `## Issue to implement

**URL:** ${issueUrl}
**Number:** #${issueNumber}
**Title:** ${issue.title}

### Issue body
${issue.body ?? "(empty)"}

### Comments
${commentBodies || "(none)"}

Implement this issue now. Open a draft PR with Fixes #${issueNumber}. Do not merge.`;
  }

  let agent;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: modelId },
      cloud: {
        repos: [{ url: repoUrl, startingRef }],
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
      startingRef,
    };
    console.log("Cloud agent started:", info);

    try {
      await ghIssueComment(
        `🤖 **Cursor cloud agent started** (SEOS control-plane fallback).

- **Agent ID:** \`${agent.agentId}\`
- **Run ID:** \`${run.id}\`
- **Starting ref:** \`${startingRef}\`
- **Track:** [cursor.com/agents](https://cursor.com/agents)`
      );
    } catch (commentErr) {
      console.warn("Issue comment failed:", commentErr.message || commentErr);
    }

    return info;
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error("Failed to start cloud agent:", err.message);
    }
    throw err;
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
  }
}
