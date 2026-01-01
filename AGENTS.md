# Repository Guidelines

FormalDoc is a client-side React + TypeScript app that converts Markdown into GB/T 9704-2012
formatted Word documents. Use this guide to keep contributions consistent and easy to review.

## Project Structure & Module Organization

- `src/` contains application code. Entry points are `src/main.tsx` and `src/App.tsx`.
- Feature folders: `src/components/` (UI), `src/hooks/` (`useX` hooks), `src/contexts/`,
  `src/lib/` (docx/markdown/html utilities), `src/styles/` (CSS), `src/types/`.
- `public/` holds static assets. `index.html`, `vite.config.ts`, and `tsconfig.json` sit at the root.
- `dist/` is build output and should not be edited by hand.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server.
- `npm run build` runs `tsc -b` then bundles for production.
- `npm run preview` serves the production build locally.
- `npm run lint` / `npm run lint:fix` checks or fixes ESLint issues in `src/`.
- `npm run format` / `npm run format:check` formats or checks Prettier rules for `src/`.

## Coding Style & Naming Conventions

- Prettier enforces 2-space indentation, single quotes, semicolons, trailing commas, and
  `printWidth: 100` (`.prettierrc`).
- ESLint uses TypeScript + React Hooks rules; unused args should be prefixed with `_`.
- React components use PascalCase names and `.tsx` files (see `src/components/`).
- Hooks are named `useSomething` in `src/hooks/`. CSS files are lower-case in `src/styles/`.

## Testing Guidelines

- No automated test framework is configured and there is no coverage requirement.
- Validate changes with `npm run build` and a quick manual check in `npm run dev`.
- If you add tests in the future, keep them near features (e.g., `*.test.tsx`) and document how to run
  them here.

## Commit & Pull Request Guidelines

- Commit messages in history are short, imperative sentences in sentence case (e.g., "Add ...",
  "Improve ...") with no scope prefixes.
- Before committing, run: `npm run format`, `npm run lint:fix`, `npm run build` (per `CLAUDE.md`).
- PRs should include a concise summary, testing notes, and screenshots for UI changes.
