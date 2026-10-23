import { expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

it('loads the Markdown DOM only when Markdown conversion is requested through the Node API', () => {
  const entry = fileURLToPath(new URL('../../node.ts', import.meta.url));
  const fixture = fileURLToPath(new URL('./fixtures/full-example.ts', import.meta.url));
  const script = `
    const {renderDocModel, convertMarkdownToDocx} = await import(${JSON.stringify(entry)});
    const {createFullExample} = await import(${JSON.stringify(fixture)});
    const afterImport = typeof globalThis.DOMParser;
    const model = createFullExample('/unused.png');
    model.sections = [{...model.sections[0], header: [], footer: [], blocks: [
      {type: 'p', styleId: 'Normal', runs: [{text: 'DocModel 正文'}]}
    ]}];
    const document = await renderDocModel(model);
    const afterDocModel = typeof globalThis.DOMParser;
    const markdown = await convertMarkdownToDocx({markdown: '# 标题\\n\\n正文与 $x^2$ 公式。'});
    console.log(JSON.stringify({afterImport, afterDocModel, afterMarkdown: typeof globalThis.DOMParser,
      document: document.subarray(0, 2).toString(), markdown: markdown.buffer.subarray(0, 2).toString()}));
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    afterImport: 'undefined',
    afterDocModel: 'undefined',
    afterMarkdown: 'function',
    document: 'PK',
    markdown: 'PK',
  });
});
