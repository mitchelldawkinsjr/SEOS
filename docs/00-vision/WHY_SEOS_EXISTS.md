# Why SEOS Exists

> Status: Vision. This document explains the problem SEOS solves and the outcome it aims for. It is intentionally free of implementation detail.

## The problem

AI coding tools are very good at one engineering discipline: **writing code**. But shipping software is much larger than writing code. Real engineering is a chain of decisions across many disciplines — planning, architecture, implementation, testing, documentation, review, security, accessibility, deployment, and learning.

Today those disciplines are stitched together by hand. A prompt here, a GitHub Action there, a review bot bolted on, a deploy script that nobody documented. The glue is invisible, repository-specific, and impossible to reuse. When it works, no one can explain why. When it breaks, no one can find the seam.

SEOS started as `issue-bench`, a small, honest slice of that chain: a human writes an issue, an AI writes a spec, a human approves it, an AI opens a small draft PR, a human merges it. Two agents, two human gates, one visible state machine made of GitHub labels. It worked in production on [Fasted](https://github.com/mitchelldawkinsjr/Fasted).

The question this project now asks is: **what is the reusable operating system underneath that slice?**

## The outcome we want

A **Software Engineering Operating System (SEOS)**: a reusable layer that coordinates specialized engineering agents from idea to production, while keeping humans accountable for judgment and ownership.

Installing SEOS into a new repository should require **configuration, not runtime modification**. The repository provides product-specific knowledge, rules, and configuration. SEOS provides the engineering workflow.

```
Human Engineers → Engineering Intent → AI Engineering Agents → GitHub → CI/CD → Production → Knowledge
```

## What SEOS is responsible for

- Coordinating engineering work across disciplines.
- Making every workflow reviewable and observable.
- Preferring repository context over generic prompting.
- Accumulating knowledge over time.
- Keeping humans in control of direction, prioritization, and production.

## What SEOS is *not* responsible for

- Product logic. SEOS orchestrates *how* engineering happens, never *what* the product should do.
- Replacing human judgment. Agents perform bounded work; humans own the decisions that matter.
- Being coupled to any one repository. Fasted is the proving ground, not a dependency.

## Why now

The primitives finally exist: cloud coding agents that open PRs, model APIs that can plan, and CI systems that can gate. What's missing is the *operating model* that turns those primitives into a coherent, reusable engineering system. That model is SEOS.

## Related reading

- [Engineering Philosophy](ENGINEERING_PHILOSOPHY.md)
- [Design Principles](DESIGN_PRINCIPLES.md)
- [What Is SEOS?](../01-concepts/WHAT_IS_SEOS.md)
- Blog: [Building a Team of Engineers](https://www.mitchelldawkins.com/blog/team-of-engineers-cursor-agent-pipeline)
