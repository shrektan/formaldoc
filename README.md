# FormalDoc

[![npm version](https://img.shields.io/npm/v/formaldoc.svg)](https://www.npmjs.com/package/formaldoc)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

[中文文档](./README_zh.md)

FormalDoc turns Markdown into polished Word documents.

It is built for people who draft with AI tools, write in Markdown, and still need a real `.docx`
deliverable with formal styles, headings, tables, spacing, and editable equations.

- Web app: [formaldoc.app](https://formaldoc.app)
- npm package: [`formaldoc` on npm](https://www.npmjs.com/package/formaldoc)
- AI skill: [`skills/formaldoc/SKILL.md`](./skills/formaldoc/SKILL.md)

![Screenshot](docs/screenshot.png)

## Why FormalDoc

AI tools are good at drafting, but Word output is still painful. Copying from ChatGPT, Claude,
DeepSeek, Kimi, Qwen, Doubao, or other tools often leaves you fixing:

- broken heading levels
- inconsistent fonts and spacing
- tables copied as messy rich text
- LaTeX formulas that become plain text or screenshots
- Chinese official-document layouts that are hard to reproduce manually

FormalDoc closes that gap. Write or generate content in Markdown first, then export a `.docx` that
is much closer to a final document.

## What Makes It Useful

### AI paste that keeps structure

Paste Markdown or rich text from an AI chat window. FormalDoc normalizes it into Markdown while
preserving the parts that matter:

- headings
- lists
- tables
- code blocks
- bold, italic, links, and inline structure

It is designed for the way AI-generated content is actually copied and edited.

### LaTeX formulas become editable Word equations

FormalDoc has first-class LaTeX math support. Formulas are converted into native Word equations, so
they remain editable in Microsoft Word instead of being flattened into images.

### Formal templates, not generic export

Choose from Chinese and English templates for official documents, reports, academic writing,
business documents, and legal-style documents.

### Local-first web generation

The web app generates documents in the browser. For one-off exports, you can paste, choose a
template, and download without setting up a backend workflow.

### Also available for automation

FormalDoc is also a published npm package, CLI, and AI-agent building block. Use the same document
engine from the browser, Node.js scripts, terminal commands, or reusable AI skills.

## LaTeX Formula Support

Formula handling is one of the strongest parts of FormalDoc.

| Input | Word output |
| --- | --- |
| `$E = mc^2$` | Inline editable Word equation |
| `$$\frac{a}{b}$$` | Centered block equation |
| `$\sum_{i=1}^{n} x_i$` | Inline equation with limits |
| `$$\begin{cases} a & x > 0 \\ b & x \le 0 \end{cases}$$` | Structured block equation |

Supported formula scenarios include:

- inline math inside normal paragraphs
- block math between paragraphs
- fractions, roots, sums, integrals, products, Greek letters, accents, matrices, and cases
- formulas mixed with bold or emphasized text
- AI-copied LaTeX that may contain escaped backslashes

The conversion path is LaTeX to MathML to OMML to Word equation objects. In practical terms, that
means the generated `.docx` uses Word's native math model instead of a screenshot-based workaround.

## Templates

FormalDoc ships with 8 built-in templates.

| Template | Best for |
| --- | --- |
| `cn-gov` | Chinese government and official documents, GB/T 9704-style layout |
| `cn-general` | General Chinese documents |
| `cn-academic` | Chinese academic writing |
| `cn-report` | Chinese reports, work summaries, and briefings |
| `en-standard` | Standard English documents |
| `en-business` | Modern English business documents |
| `en-academic` | English academic papers |
| `en-legal` | English legal or contract-style documents |

## Quick Start

### Use the web app

1. Open [formaldoc.app](https://formaldoc.app)
2. Paste Markdown or rich text copied from an AI tool
3. Choose a template
4. Download the generated `.docx`

### Run with `npx`

```bash
npx formaldoc input.md -o output.docx
```

### Install from npm

```bash
npm install formaldoc
```

### Install globally

```bash
npm install -g formaldoc
formaldoc input.md -o output.docx
```

## Markdown Support

FormalDoc supports GitHub Flavored Markdown plus LaTeX math.

| Markdown | Output |
| --- | --- |
| `# Title` | Document title |
| `## Heading` | Heading 1 |
| `### Heading` | Heading 2 |
| `#### Heading` | Heading 3 |
| `##### Heading` | Heading 4 |
| Paragraphs | Body text |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `~~strike~~` | Strikethrough |
| `[text](url)` | Hyperlinks |
| `- item` / `1. item` | Lists |
| `> quote` | Blockquotes |
| `` `code` `` | Inline code |
| Code fences | Code blocks |
| GFM tables | Word tables |
| `$...$` | Inline equations |
| `$$...$$` | Block equations |

## CLI Usage

```bash
# Default template: cn-gov
formaldoc document.md

# Write to a specific file
formaldoc document.md -o output.docx

# Pick a template
formaldoc document.md -t en-standard

# Read from stdin
cat document.md | formaldoc --stdin -o output.docx

# Help
formaldoc --help
```

## Node.js API

FormalDoc is ESM-first.

### Convert Markdown in memory

```ts
import { writeFile } from 'node:fs/promises';
import { convertMarkdownToDocx } from 'formaldoc';

const result = await convertMarkdownToDocx({
  markdown: '# Hello\n\nGenerated by FormalDoc.',
  templateName: 'en-business',
});

await writeFile('output.docx', result.buffer);
console.log(result.outputPath ?? 'output.docx');
```

### Convert from a Markdown file

When you already have a `.md` file, prefer the file-based API:

```ts
import { convertMarkdownToDocxFile } from 'formaldoc';

const result = await convertMarkdownToDocxFile({
  inputPath: './input.md',
  outputPath: './output.docx',
  templateName: 'cn-report',
});

console.log(result.outputPath);
```

## Use With Claude, Codex, Or Other AI Tools

FormalDoc is especially useful in AI-assisted document workflows.

Typical flow:

1. The AI writes or receives Markdown content
2. The AI selects a template
3. The AI installs `formaldoc` from npm
4. The AI runs the Node API or CLI
5. The AI returns the generated `.docx`

This means the AI can produce a real Word document, not just draft text.

### Included skill

This repo includes a reusable skill at [`skills/formaldoc/SKILL.md`](./skills/formaldoc/SKILL.md).

The skill helps an AI tool:

- choose an appropriate template
- prefer file-based conversion when a Markdown file already exists
- fall back to inline conversion when needed
- save the generated `.docx` as a real output artifact

If you use Claude Projects, Claude Code style environments, Codex, or other agent systems with
reusable instructions, start from:

- [`skills/formaldoc/SKILL.md`](./skills/formaldoc/SKILL.md)
- [`docs/claude-file-creation.md`](./docs/claude-file-creation.md)
- [`docs/claude-project-instructions.md`](./docs/claude-project-instructions.md)

### Install the skill with `npx`

If you use the `skills` installer ecosystem, install the skill directly from this GitHub repository:

```bash
npx skills add https://github.com/shrektan/formaldoc --skill formaldoc
```

Examples:

```bash
# Install globally for Claude Code
npx skills add https://github.com/shrektan/formaldoc --skill formaldoc -g -a claude-code -y

# Install globally for Codex
npx skills add https://github.com/shrektan/formaldoc --skill formaldoc -g -a codex -y
```

Notes:

- this flow installs the skill from GitHub, not from the npm tarball
- the repository must be pushed to GitHub before others can install the latest skill version
- the skill name is `formaldoc`, which matches the included frontmatter

## Development

```bash
npm run dev
npm run build
npm run lint
```

Project layout:

- `src/`: React app and document generation logic
- `cli/`: CLI entrypoint
- `docs/`: supporting documentation
- `skills/`: AI skill definitions included with the repo

## License

Apache-2.0. See [LICENSE](LICENSE).
