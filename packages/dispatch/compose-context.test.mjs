import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { composeContext } from "./compose-context.mjs";

test("composeContext writes outputs and --check detects drift", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seos-compose-"));
  try {
    await mkdir(join(dir, ".github/agent-rules"), { recursive: true });
    await mkdir(join(dir, ".github/agent-overrides"), { recursive: true });
    await writeFile(
      join(dir, ".github/AGENT.md"),
      "# Guide\n\nHello repo.\n"
    );
    await writeFile(
      join(dir, ".github/agent-rules/architecture-rules.md"),
      "## Architecture rules\n\nKeep it small.\n"
    );
    await writeFile(
      join(dir, ".github/agent-overrides/spec-tail.md"),
      "Spec tail body.\n"
    );
    await writeFile(
      join(dir, ".github/agent-manifest.json"),
      JSON.stringify({
        agentGuide: ".github/AGENT.md",
        rulesDir: ".github/agent-rules",
        overridesDir: ".github/agent-overrides",
        outputs: {
          ".github/ai-spec-context.md": {
            title: "# Spec Context",
            includeAgentGuide: true,
            rules: ["architecture-rules"],
            tail: "spec-tail.md",
          },
        },
      })
    );

    const { outputs } = await composeContext({ root: dir });
    assert.deepEqual(outputs, [".github/ai-spec-context.md"]);

    const composed = await readFile(
      join(dir, ".github/ai-spec-context.md"),
      "utf-8"
    );
    assert.match(composed, /AUTO-GENERATED/);
    assert.match(composed, /Hello repo/);
    assert.match(composed, /Keep it small/);
    assert.match(composed, /Spec tail body/);

    await composeContext({ root: dir, checkMode: true });

    await writeFile(join(dir, ".github/ai-spec-context.md"), "drift\n");
    await assert.rejects(
      () => composeContext({ root: dir, checkMode: true }),
      /Drift detected/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
