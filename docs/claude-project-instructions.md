# Claude Project Instructions

Use this in a Claude Project or Skill once the package has been published to npm.

## Suggested Instructions

```md
When the user asks to export content to a Word document or DOCX:

1. Ask which FormalDoc template they want to use.
2. If the user does not answer, use:
   - `cn-gov` for Chinese content
   - `en-standard` for English content
3. Use code execution to install `formaldoc`.
4. Generate `output.docx` with FormalDoc.
5. Return the generated `.docx` file directly in the conversation.

Prefer the Node API:

```ts
import { convertMarkdownToDocx } from 'formaldoc';
import { writeFile } from 'node:fs/promises';

const result = await convertMarkdownToDocx({
  markdown,
  templateName,
});

await writeFile('output.docx', result.buffer);
```

If the package import fails, fall back to the CLI:

```bash
npx formaldoc input.md -t cn-gov -o output.docx
```

If the user already provided Markdown in the conversation, save it to a temporary `.md` file before running the CLI.
```

## Recommended Claude Behavior

- Ask about template once, not repeatedly.
- If the user says "默认" or "default", do not ask again.
- Keep the output filename simple unless the user requests a specific name.
- Return the generated `.docx` file, not just the markdown or a filesystem path.

## Suggested First Prompt To Test

```text
把下面这段内容导出成 Word，模板如果我没指定就用默认，并直接把 docx 文件返回给我。
```
