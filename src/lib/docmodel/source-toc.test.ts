import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { createFullExample } from './fixtures/full-example.js';
import { renderDocModel } from './render.js';

test('source TOC keeps unmatched text and printed page without a fabricated link', async () => {
  const model = createFullExample('unused.png');
  model.sections = [
    {
      ...model.sections[0],
      header: [],
      footer: [],
      blocks: [
        { type: 'p', styleId: 'Normal', bookmark: 'target', runs: [{ text: '正文标题' }] },
        {
          type: 'toc',
          levels: [1, 3],
          entries: [
            { text: '原件标题', level: 1, page: 2, bookmark: 'target' },
            { text: '缺少正文的条目', level: 2, page: 982 },
            { text: '未印页码的条目', level: 3 },
          ],
        },
      ],
    },
  ];
  const zip = await JSZip.loadAsync(await renderDocModel(model));
  const xml = await zip.file('word/document.xml')!.async('string');
  expect(xml.match(/<w:hyperlink\b/g)).toHaveLength(1);
  expect(xml).toContain('w:anchor="target"');
  expect(xml).toContain('缺少正文的条目');
  expect(xml).toContain('982');
  expect(xml).not.toContain('undefined');
  for (const level of [1, 2, 3]) expect(xml).toContain(`w:pStyle w:val="TOC${level}"`);
});
