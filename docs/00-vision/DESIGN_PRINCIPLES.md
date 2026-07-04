# Design Principles

> Status: Vision. Operational rules derived from the [Engineering Philosophy](ENGINEERING_PHILOSOPHY.md). Use these as a checklist when designing or reviewing any change to SEOS.

## Prefer

| Principle | Why it matters |
|-----------|----------------|
| **Small pull requests** | Reviewable, revertible, low-risk. |
| **Composable modules** | Capabilities combine without rewrites. |
| **Simple architecture** | Fewer moving parts means fewer failure modes. |
| **Clear documentation** | An undocumented capability does not exist. |
| **Reusable abstractions** | The engine works for the next repo, not just this one. |
| **Deterministic workflows** | Same input → same behavior → trustable automation. |
| **Observable automation** | Every action leaves a visible, auditable trail. |
| **Backward compatibility** | Existing consumers keep working across upgrades. |

## Avoid

| Anti-pattern | Why it hurts |
|--------------|--------------|
| **Repository-specific assumptions** in the framework | Couples the engine to one product. |
| **Hidden behavior** | Erodes trust; impossible to review. |
| **Duplicated prompts** | Drift; the same instruction rots in three places. |
| **Large monolithic agents** | One role that does everything is reviewable by no one. |
| **Undocumented architecture** | Knowledge lives only in someone's head. |
| **Magic configuration** | Config that "just works" until it doesn't. |

## The reusability test

Every change to SEOS should answer these questions. If the answer is "no," reconsider the implementation.

- Does this improve the architecture?
- Does this improve reusability?
- Does this reduce Fasted coupling?
- Does this improve documentation?
- Does this improve composability?
- Does this improve repository intelligence?
- Does this move SEOS closer to becoming a complete Software Engineering Operating System?

## The separation rule

When adding a capability, decide explicitly where it lives:

- **Framework** (SEOS, this repo): generic, reusable, product-agnostic.
- **Repository** (the consuming repo): product-specific knowledge, rules, configuration.

If a capability proven in [Fasted](../06-case-studies/FASTED.md) is generic, migrate it into the framework. If it is domain-specific, it stays in Fasted. The framework must never depend on Fasted.

## Related reading

- [Engineering Philosophy](ENGINEERING_PHILOSOPHY.md)
- [Architecture Overview](../02-architecture/OVERVIEW.md)
- [Roadmap](ROADMAP.md)
