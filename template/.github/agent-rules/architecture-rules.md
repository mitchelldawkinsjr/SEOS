## Architecture rules

- Prefer extending existing modules and patterns over new abstractions.
- Match naming, layering, and import style of neighboring code.
- One issue = one focused change set; do not refactor unrelated code.
- Call out migrations, new routes, schema changes, or public API changes explicitly in the spec.
- If the change is ambiguous or spans multiple subsystems, say so in Notes and recommend human review before implement.
