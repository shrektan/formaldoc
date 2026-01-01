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
- Smart paste: auto-converts HTML to markdown when pasting from AI chatbots (using Turndown + GFM plugin for tables)
- Quote conversion: converts English quotes to Chinese quotes ("..." → "...") with count display
- All processing happens client-side (no server, works offline)

## Style Mapping

| Markdown | Word Style | Font |
|----------|------------|------|
| `# H1` | Title | 宋体 22pt bold |
| `## H2` | Heading 1 | 黑体 16pt |
| `### H3` | Heading 2 | 楷体 16pt |
| `#### H4` | Heading 3 | 仿宋 16pt bold |
| `##### H5` | Heading 4 | 仿宋 16pt bold |
| Paragraph | Body Text | 仿宋 16pt |
| List | ListParagraph | 仿宋 16pt (nested lists supported with 2-char indent per level) |
| Table | TableText/TableCaption | 仿宋 16pt, centered, 单倍行距 |
| Page Footer | - | 仿宋 14pt (四号) |
