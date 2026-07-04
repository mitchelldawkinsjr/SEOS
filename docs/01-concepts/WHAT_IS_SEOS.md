# What Is SEOS?

> Status: Concept. Read [Why SEOS Exists](../00-vision/WHY_SEOS_EXISTS.md) first for the motivation.

**SEOS — Software Engineering Operating System** — is a reusable layer that coordinates specialized AI engineering agents across the full software lifecycle, while keeping humans accountable for judgment and production.

This repository is the implementation of SEOS (installed as the `seos` package). [Fasted](../06-case-studies/FASTED.md) is its first production consumer.

## The operating-system analogy

A traditional OS coordinates programs so applications don't each reimplement scheduling, memory, and I/O. SEOS coordinates *engineering disciplines* so a repository doesn't reimplement planning, review, deployment, and learning.

| Operating system | SEOS |
|------------------|------|
| Kernel / core runtime | Core runtime + workflow engine |
| System calls | Agent roles (planning, coding, review, …) |
| Device drivers | Plugins (stack presets, framework adapters) |
| Processes | Individual engineering runs (one issue → one PR) |
| Filesystem | Repository knowledge |
| User space | Product logic (owned by the repository, never the OS) |

The point of both is the same: **applications supply only what is specific to them; the OS supplies the reusable machinery.**

## What it coordinates

SEOS orchestrates the flow from intent to production and back into knowledge:

```
Human intent → Planning → (Architecture) → Implementation → Validation
→ Documentation → Review → Deployment → Health → Learning → Knowledge
```

See the [Engineering Lifecycle](ENGINEERING_LIFECYCLE.md) for the full model.

## What it is made of

Seven layers, described in the [Architecture Overview](../02-architecture/OVERVIEW.md):

1. **Core Runtime** — the entry point and orchestration.
2. **Workflow Engine** — triggers and sequences work (GitHub Actions today).
3. **Context Engine** — assembles repository-specific context for agents.
4. **Agent Runtime** — dispatches bounded agent roles.
5. **Knowledge Engine** — captures and reuses lessons.
6. **Plugin System** — extends SEOS to new stacks and frameworks via configuration.
7. **Repository layer** — the consuming repo's configuration, rules, knowledge, and workflows.

## What it is not

- **Not a product framework.** SEOS never contains product logic. It orchestrates engineering, not features.
- **Not autonomous.** Humans hold the [gates](HUMAN_GATES.md) that matter: direction, prioritization, secrets, production, merge.
- **Not a monolith.** Each discipline is an independent [agent role](../03-agents/README.md).
- **Not tied to Fasted.** Fasted proves the architecture; the framework never depends on it.

## Where to go next

- New to the ideas? → [Engineering Lifecycle](ENGINEERING_LIFECYCLE.md)
- Want the label mechanics? → [State Machine](STATE_MACHINE.md)
- Want to know who decides what? → [Human Gates](HUMAN_GATES.md)
- Want the layered design? → [Architecture Overview](../02-architecture/OVERVIEW.md)
