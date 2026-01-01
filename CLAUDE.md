# Claude Code Instructions

This file contains instructions for Claude Code when working on this project.

## Before Every Commit

After making any code changes, **always** run the following commands in order:

```bash
npm run format      # Format all source files with Prettier
npm run lint:fix    # Fix linting errors with ESLint
npm run build       # Verify the build passes
```

Fix any remaining errors before committing. Do not commit code that fails linting or build.

## Project Stack

- **Framework**: React 19 + TypeScript + Vite
- **Formatter**: Prettier (config in `.prettierrc`)
- **Linter**: ESLint (config in `eslint.config.js`)

## Key npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run format` | Format code with Prettier |
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Auto-fix linting errors |

## Project Purpose

FormalDoc is a browser-based markdown-to-Word converter that follows Chinese government document format (GB/T 9704-2012). Key features:

- Converts markdown to properly styled .docx files
- Uses Word styles (样式) for easy editing in Word
- In-browser preview before download
- All processing happens client-side (no server)

## Style Mapping

| Markdown | Word Style | Font |
|----------|------------|------|
| `# H1` | Title | 宋体 22pt bold |
| `## H2` | Heading 1 | 黑体 16pt |
| `### H3` | Heading 2 | 楷体 16pt |
| `#### H4` | Heading 3 | 仿宋 16pt bold |
| `##### H5` | Heading 4 | 仿宋 16pt bold |
| Paragraph | Body Text | 仿宋 16pt |
