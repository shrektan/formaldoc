# FormalDoc — Project Context

## Identity

**FormalDoc** is a browser-based Markdown-to-Word (.docx) converter supporting Chinese
and English document formats. All processing happens client-side (no server, works offline).

- **Repo**: https://github.com/shrektan/formaldoc
- **Version**: 1.16.1
- **License**: Apache-2.0
- **Platforms**: Web app, npm package, CLI tool, AI Skill

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript 5.9 + Vite 7 |
| Document Gen | docx-js 9.5 + remark (GFM, math) |
| Math Pipeline | LaTeX → KaTeX (MathML) → mathml2omml (OMML) |
| HTML Paste | Turndown + GFM plugin |
| Package Mgr | Bun (local) / npm (CI, Claude Code) |
| Code Quality | ESLint + Prettier + Bun test |
| Deployment | Vercel (web) + npm registry (package) |

## Architecture

```
src/
├── lib/              # Core conversion logic (~5,600 LOC)
│   ├── docx/         # AST → DOCX (generator, converter, styles)
│   ├── markdown/     # Markdown → AST (remark pipeline)
│   ├── math/         # LaTeX → native Word equations
│   ├── styles/       # Template registry & storage
│   └── node/         # Node.js API wrapper
├── components/       # React UI (~1,500 LOC)
├── contexts/         # State management (Style, Language)
├── hooks/            # useDocxGenerator, useTranslation
├── i18n/             # Bilingual content & translations
└── types/            # TypeScript definitions
cli/                  # CLI entrypoint (236 LOC)
```

## Template System

8 built-in templates: cn-gov, cn-general, cn-academic, cn-report,
en-standard, en-business, en-academic, en-legal.

Templates define heading fonts, body font, line spacing, and style mappings.
Users can customize via StyleDrawer UI or CLI `--styles` flag.

## Key Conventions

- Tests colocated with source (`*.test.ts`)
- `npm run check` before every commit (format + lint + build + test)
- Version bump required per commit (patch/minor)
- ESM-first (`"type": "module"`)
- Chinese government format (GB/T 9704) is the flagship template

## Active Work

- `feat/footnote-support` — Adding footnote/endnote support for markdown-to-docx
