# Engineering Standards

## Code Quality Pipeline

```bash
npm run check    # format → lint → build → test (must pass before commit)
```

- **Formatter**: Prettier — 2-space indent, single quotes, semicolons, trailing commas (ES5), 100 char width
- **Linter**: ESLint 9 — TypeScript plugin, React Hooks, React Refresh
- **Type Checking**: TypeScript strict mode, no unused locals/params
- **Tests**: Bun test, colocated `*.test.ts` files

## Testing Strategy

- **Unit tests** (`src/**/*.test.ts`): Fast (~1.5s), run with `bun run test:fast`
- **CLI integration** (`cli/cli.test.ts`): Slow (~19s, subprocess per test), run with `bun run test`
- Use `test:fast` during development, full `test` before commits

## Version Bumping

Every commit bumps `version` in `package.json`:
- **Patch** (x.y.Z): Bug fixes, minor tweaks, CSS adjustments
- **Minor** (x.Y.0): New features, significant enhancements

## Commit Style

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Concise messages focused on "why" not "what"

## Architecture Patterns

- **Lib-first**: Core logic in `src/lib/`, framework-agnostic, testable without React
- **Template registry**: All templates defined in `src/lib/styles/templates.ts`
- **Context providers**: StyleContext + LanguageContext for React state
- **Node.js exports**: `src/node.ts` wraps lib functions for package consumers

## File Organization

- Source and tests colocated (no separate `__tests__/` directory)
- Components in named directories (`ComponentName/index.tsx`)
- Types in `src/types/`, shared across lib and components
