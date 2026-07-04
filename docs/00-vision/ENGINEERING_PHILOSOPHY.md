# Engineering Philosophy

> Status: Vision. The beliefs that shape every decision in SEOS.

## Engineering is decision making

Code is the *output* of engineering, not its essence. The essence is a sequence of decisions: what to build, how to structure it, what to test, what risk to accept, when to ship. SEOS is designed around the decision chain, not around code generation.

## Coding is only one discipline

Planning, architecture, testing, documentation, review, security, accessibility, deployment, and learning are each distinct engineering disciplines with their own inputs, outputs, and success criteria. SEOS models each as a first-class role rather than folding everything into "the coding agent."

## Humans remain accountable

Agents do bounded work and make recommendations. Humans own product direction, prioritization, secrets, production, and the final merge. This is not a temporary limitation to be optimized away — it is the point. SEOS keeps humans responsible for the decisions that carry real-world consequences.

## Small, reversible changes win

A small PR is understandable, reviewable, and revertible. A large PR hides risk. SEOS biases every workflow toward one issue → one focused change set → one small PR. This is the single most load-bearing habit in the system.

## Context beats cleverness

A generic prompt produces generic code. Repository-specific context — the stack, the conventions, the directories, the lessons already learned — produces code that fits. SEOS invests in *composing context* rather than in ever-larger prompts.

## Knowledge should compound

Every run teaches something: a pattern that worked, a failure to avoid, a gap in the context files. SEOS treats that learning as a durable asset that improves future runs, not as exhaust that disappears when the Action completes.

## Observability is not optional

If you can't see what an agent did and why, you can't trust it. Every workflow must leave a visible, auditable trail — labels, comments, PRs, run logs. The state of work should be legible at a glance.

## Framework and application must stay separate

The reusable engine and the product-specific configuration are different concerns. Mixing them is how frameworks rot into a single unreusable repository. SEOS keeps the boundary sharp: generic capability migrates *into* the framework; domain behavior stays *out*.

## Related reading

- [Why SEOS Exists](WHY_SEOS_EXISTS.md)
- [Design Principles](DESIGN_PRINCIPLES.md) — the operational rules these beliefs produce
- [Human Gates](../01-concepts/HUMAN_GATES.md)
