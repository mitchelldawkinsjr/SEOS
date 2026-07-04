## Product and stack notes

- **Frontend:** Vite + React, React Router, Tailwind CSS
- **Testing:** Playwright e2e (`e2e/`), `npm run build`, `npm run test:e2e`
- **Deployment:** static build or Docker (customize for your host)

This is a **client-side SPA**. Document your state management and API client patterns here.

### Key directories

| Path | Purpose |
|------|---------|
| `src/` | React components, pages, hooks |
| `src/lib/` | Utilities, API clients, storage |
| `e2e/` | Playwright tests |

### Extension patterns

1. Add types and domain models alongside existing ones
2. Add routes in your router entry (e.g. `src/App.tsx`)
3. Match existing component and Tailwind utility patterns

### Key directories

| Path | Purpose |
|------|---------|
| `src/` | Application source |
| `tests/` or `e2e/` | Automated tests (if applicable) |

### Naming conventions

- Match existing file and symbol naming in the repo
- Prefer extending existing patterns over new abstractions

### Extension patterns

- New features should follow the same layering as neighboring code
- One issue = one focused change set
