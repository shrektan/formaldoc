import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { createFullExample } from './fixtures/full-example.js';
import { renderDocModel } from './render.js';
import { parseDocModel } from './types.js';

test('right-edge table alignment survives schema validation and reaches the writer', async () => {
  const model = createFullExample('/unused.png');
  model.sections = model.sections.slice(0, 1);
  const table = model.sections[0]!.blocks.find((b) => b.type === 'table')!;
  if (table.type !== 'table') throw new Error('missing fixture table');
  Object.assign(table, { align: 'right' });
  model.sections[0]!.blocks = [table];
  const zip = await JSZip.loadAsync(await renderDocModel(parseDocModel(model)));
  const doc = await zip.file('word/document.xml')!.async('string');
  expect(doc).toContain('<w:jc w:val="right"/>');
});

test('page and total page placeholders are independent updateable fields', async () => {
  const model = createFullExample('/unused.png');
  model.sections = model.sections.slice(0, 1);
  model.sections[0]!.blocks = [{ type: 'p', styleId: 'Normal', runs: [{ text: '正文' }] }];
  model.sections[0]!.pageNumber!.format = '第 %PAGE% 页 共 %NUMPAGES% 页';
  const zip = await JSZip.loadAsync(await renderDocModel(parseDocModel(model)));
  const footers = await Promise.all(
    Object.keys(zip.files)
      .filter((p) => /word\/footer\d+\.xml$/.test(p))
      .map((p) => zip.file(p)!.async('string'))
  );
  expect(
    footers.some((text) => /w:instr="PAGE"/.test(text) && /w:instr="NUMPAGES"/.test(text))
  ).toBe(true);
  expect(footers.join('')).not.toContain('%NUMPAGES%');
});
