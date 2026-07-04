# SEOS Documentation

**SEOS — Software Engineering Operating System.** This repository (installed as the `seos` package) is the framework; [Fasted](06-case-studies/FASTED.md) is the first production consumer.

This documentation teaches the operating model before the mechanics: **philosophy → concepts → architecture → agents → guides → reference.** Start at the top if you're new.

## Start here

1. [Why SEOS Exists](00-vision/WHY_SEOS_EXISTS.md) — the problem and the outcome.
2. [What Is SEOS?](01-concepts/WHAT_IS_SEOS.md) — the operating-system model.
3. [Engineering Lifecycle](01-concepts/ENGINEERING_LIFECYCLE.md) — the core abstraction.
4. [Architecture Overview](02-architecture/OVERVIEW.md) — the layered design.

## Map

### 00 — Vision (why)
- [WHY_SEOS_EXISTS](00-vision/WHY_SEOS_EXISTS.md)
- [ENGINEERING_PHILOSOPHY](00-vision/ENGINEERING_PHILOSOPHY.md)
- [DESIGN_PRINCIPLES](00-vision/DESIGN_PRINCIPLES.md)
- [ROADMAP](00-vision/ROADMAP.md)

### 01 — Concepts (what)
- [WHAT_IS_SEOS](01-concepts/WHAT_IS_SEOS.md)
- [ENGINEERING_LIFECYCLE](01-concepts/ENGINEERING_LIFECYCLE.md)
- [STATE_MACHINE](01-concepts/STATE_MACHINE.md)
- [HUMAN_GATES](01-concepts/HUMAN_GATES.md)
- [KNOWLEDGE_SYSTEM](01-concepts/KNOWLEDGE_SYSTEM.md)

### 02 — Architecture (how it's built)
- [OVERVIEW](02-architecture/OVERVIEW.md)
- [CONTEXT_ENGINE](02-architecture/CONTEXT_ENGINE.md) — manifest-driven context composition (built)
- Remaining per-layer docs (Core Runtime, Workflow Engine, Agent Runtime, Plugin System, Configuration) — planned; see [ROADMAP](00-vision/ROADMAP.md).

### 03 — Agents (who does the work)
- [Agent role index + contract](03-agents/README.md)
- [Role template](03-agents/_ROLE_TEMPLATE.md)
- Built: [Planning Agent](03-agents/PLANNING_AGENT.md), [Coding Agent](03-agents/CODING_AGENT.md)

### 04 — Guides (how to use it)
- Getting started, installation, customization, adding agents — planned; today see the [Setup guide](SETUP.md) and root [README](../README.md).

### 05 — Reference (the details)
- [Labels](LABELS.md) · [Setup](SETUP.md) · [Template repository](TEMPLATE_REPOSITORY.md)
- Recipes: [CI gates](recipes/ci-gates.md) · [PR review bots](recipes/pr-review-bots.md)

### 06 — Case studies (proof)
- [Fasted](06-case-studies/FASTED.md)

### Assets
- Mermaid sources: [lifecycle](assets/lifecycle.mmd) · [state-machine](assets/state-machine.mmd) · [architecture](assets/architecture.mmd) · [agent-system](assets/agent-system.mmd)

## A note on structure

This numbered layout is the target from the SEOS documentation charter. Sections `00`–`03` and `06` are established here; `04`–`05` currently point to the existing setup, label, and recipe docs and will be filled in as those capabilities are formalized on the [Roadmap](00-vision/ROADMAP.md). Documentation is a first-class feature: every capability should explain why it exists, where it fits, how it works, how to configure it, how to extend it, and show a working example.
