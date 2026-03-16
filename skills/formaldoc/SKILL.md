---
name: formaldoc
description: |
  Convert Markdown text or Markdown artifacts into professionally formatted .docx files using the formaldoc npm package. Use this skill whenever the user wants to export, download, or save Markdown content as a Word document (.docx), or asks to "generate a docx", "export to Word", "turn this into a Word file", "download as docx", or "save as document". Also trigger when the user has a Markdown artifact and asks for a formatted document version. Always prefer this skill over manual docx generation when Markdown source is available.

  Available templates:
  - cn-gov      Chinese official document, GB/T 9704 style
  - cn-general  Chinese general-purpose document
  - cn-academic Chinese academic paper
  - cn-report   Chinese business or work report
  - en-standard Standard — Times New Roman + Arial
  - en-business Business — Calibri + Arial, modern
  - en-academic Academic — APA style, double-spaced
  - en-legal    Legal — Contracts, legal docs
---

# formaldoc Skill

Convert Markdown to `.docx` using the published `formaldoc` npm package.

## When to use

Use this skill when the user wants a real Word document output rather than only Markdown or plain text.

Common triggers:

- "generate a docx"
- "export this to Word"
- "turn this markdown into a document"
- "save this as a .docx"
- "download a Word file"

## Workflow

### 1. Determine the template

If the user already picked a template or the context makes it obvious, use it directly.

If the template is unclear, ask once and keep it brief.

Default guidance:

- `cn-report` for Chinese business or work-report content
- `cn-gov` for Chinese official or government-style content
- `en-business` for English professional content
- fallback default: `cn-gov`

Short prompt example:

> Which template should I use? Default is `cn-report`. Available options: `cn-gov` / `cn-general` / `cn-academic` / `cn-report` / `en-standard` / `en-business` / `en-academic` / `en-legal`

### 2. Write Markdown to a file first, then convert from file

**IMPORTANT: Always write content to a `.md` file first, then convert from that file.** This is the strongly preferred path because:

- It avoids embedding the entire document as a string literal in code, which wastes tokens
- If the Markdown already exists as a file, you skip writing entirely — just point to it
- The file serves as an artifact the user can inspect, edit, and re-convert later

**Decision flow:**

```
Does a .md file already exist on disk?
  ├── YES → use it directly (Step 3a)
  └── NO → write the content to a .md file first, then use it (Step 3a)
```

Only use in-memory conversion (Step 3b) when writing a temp file is truly impractical (e.g., a sandboxed environment with no filesystem access).

### 3a. File-based conversion (preferred)

Use the CLI — it's the simplest and most token-efficient approach:

```bash
npx formaldoc input.md -t cn-report -o output.docx
```

Use `-l` to set the title heading level (when the doc starts with `##` instead of `#`):

```bash
npx formaldoc input.md -t cn-report -l 2 -o output.docx
```

Or use the Node API if you need programmatic control:

```ts
import { convertMarkdownToDocxFile } from 'formaldoc';

const result = await convertMarkdownToDocxFile({
  inputPath: '/absolute/path/to/input.md',
  outputPath: '/absolute/path/to/output.docx',
  templateName: 'cn-report',
  titleLevel: 1, // 1-5: which heading level maps to Title (default: 1)
});

console.log(result.outputPath);
```

### 3b. In-memory conversion (last resort)

Only use this when no filesystem is available. **Do not use this path if you can write a file instead** — embedding large Markdown strings in code wastes tokens significantly.

```ts
import { writeFile } from 'node:fs/promises';
import { convertMarkdownToDocx } from 'formaldoc';

const result = await convertMarkdownToDocx({
  markdown: '## Title\n\nShort content only.',
  templateName: 'cn-report',
  titleLevel: 2, // ## maps to Title, ### to Heading1, etc.
});

await writeFile('/absolute/path/to/output.docx', result.buffer);
```

### 4. Return the generated file

The final output should be the `.docx` file itself whenever the environment supports returning files.

## Important notes

- **File-first, always.** If content exists as a `.md` file, convert from file. If it doesn't, write it to a `.md` file first, then convert. In-memory conversion with inline Markdown strings is the last resort — it wastes tokens on large documents.
- `formaldoc` is ESM-first. Prefer `import`, not `require()`.
- Prefer absolute paths in agent environments.
- Choose an output filename that matches the document title when practical.
- Return the real `.docx` artifact, not just a path or a success message.
- Use `titleLevel` (API) or `-l` (CLI) when the Markdown starts at `##` or lower instead of `#`. For example, `titleLevel: 2` makes `##` map to Title, `###` to Heading1, etc. Valid range: 1-5.

## Template cheat sheet

| Context | Recommended template |
| --- | --- |
| Chinese work reports, updates, analysis | `cn-report` |
| Government, regulatory, or official Chinese docs | `cn-gov` |
| General Chinese documents | `cn-general` |
| Chinese academic content | `cn-academic` |
| English business content | `en-business` |
| English academic content | `en-academic` |
| English legal content | `en-legal` |
| General English document | `en-standard` |
