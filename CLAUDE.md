# Claude Code Instructions

This file contains instructions for Claude Code when working on this project.

## Before Every Commit

After making any code changes, **always** run the following commands in order:

```bash
bun run format      # Format all source files with Prettier
bun run lint:fix    # Fix linting errors with ESLint
bun run build       # Verify the build passes
```

Fix any remaining errors before committing. Do not commit code that fails linting or build.

## Project Stack

- **Framework**: React 19 + TypeScript + Vite
- **Package Manager**: Bun
- **Formatter**: Prettier (config in `.prettierrc`)
- **Linter**: ESLint (config in `eslint.config.js`)

## Key Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run format` | Format code with Prettier |
| `bun run lint` | Check for linting errors |
| `bun run lint:fix` | Auto-fix linting errors |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |

## Project Purpose

FormalDoc is a browser-based markdown-to-Word converter that supports multiple document formats. Key features:

- Converts markdown to properly styled .docx files
- Uses Word styles (样式) for easy editing in Word
- Smart paste: auto-converts HTML to markdown when pasting from AI chatbots (using Turndown + GFM plugin for tables)
- Quote conversion: converts English quotes to Chinese quotes ("..." → "...") with count display
- Multiple templates: Chinese government format (cn-gov) and English standard format (en-standard)
- All processing happens client-side (no server, works offline)

## Template System

FormalDoc uses a template system to support different document formats.

### Available Templates

| Template | Description | Default Fonts |
|----------|-------------|---------------|
| `cn-gov` | Chinese government format (GB/T 9704-2012) | 宋体, 黑体, 楷体, 仿宋 |
| `en-standard` | English standard format | Times New Roman (body), Arial (headings) |

### Key Files

- `src/types/styles.ts` - Type definitions for templates, fonts, styles
- `src/lib/styles/templates.ts` - Template registry with style definitions
- `src/lib/styles/storage.ts` - Template/style persistence to localStorage
- `src/contexts/StyleContext.tsx` - React context for template state
- `src/components/StyleSettings/StyleDrawer.tsx` - Template selector UI

### CLI Template Flag

Use `-t` or `--template` to specify template:
```bash
formaldoc input.md -o output.docx -t en-standard
```

## Style Mapping (cn-gov template)

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
| Formula | Formula | Cambria Math, centered, 单倍行距 |
| Page Footer | - | 仿宋 14pt (四号) |

## Style Mapping (en-standard template)

| Markdown | Word Style | Font |
|----------|------------|------|
| `# H1` | Title | Arial 24pt bold |
| `## H2` | Heading 1 | Arial 16pt bold |
| `### H3` | Heading 2 | Arial 14pt bold |
| `#### H4` | Heading 3 | Arial 12pt bold |
| `##### H5` | Heading 4 | Arial 12pt bold italic |
| Paragraph | Body Text | Times New Roman 12pt |
| List | ListParagraph | Times New Roman 12pt |
| Table Header | TableText | Arial 11pt bold |
| Table Cell | TableText | Times New Roman 11pt |
| Page Footer | - | Times New Roman 10pt |

## LaTeX Formula Support

Formulas are converted to **native Word equations** (OMML format), which are editable in Word.

**Pipeline**: LaTeX → KaTeX (MathML) → mathml2omml (OMML) → docx Math objects

**Syntax**:
- Block formula: `$$...$$ ` (centered, on its own line)
- Inline formula: `$...$` (within text)

**Key files**:
- `src/lib/math/latex-to-docx.ts` - LaTeX → docx Math conversion
- `src/lib/markdown/latex-preprocessor.ts` - Auto-detects bare LaTeX from ChatGPT
