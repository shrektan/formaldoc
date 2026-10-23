import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { renderDocModel } from './render.js';
import { parseDocModel } from './types.js';
import fixture from './fixtures/round4-empty-cells.json';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
test('round4 actual zigui-full empty table cells receive explicit styles before docx inserts defaults', async () => {
  const model = parseDocModel(fixture.model);
  const table = model.sections[0].blocks[0];
  expect(table.type).toBe('table');
  if (table.type !== 'table') return;
  expect(table.rows.slice(0, 2).map((row) => row.cells[1].blocks)).toEqual([[], []]);
  const zip = await JSZip.loadAsync(await renderDocModel(model));
  const document = new JSDOM(await zip.file('word/document.xml')!.async('string'), {
    contentType: 'text/xml',
  }).window.document;
  const rows = Array.from(document.getElementsByTagNameNS(W, 'tr'));
  for (const [index, row] of rows.slice(0, 2).entries()) {
    const cell = row.getElementsByTagNameNS(W, 'tc')[1];
    const paragraphs = cell.getElementsByTagNameNS(W, 'p');
    expect(paragraphs, fixture.sourceRows[index].join(',')).toHaveLength(1);
    const style = paragraphs[0].getElementsByTagNameNS(W, 'pStyle')[0];
    expect(style?.getAttributeNS(W, 'val'), `row ${index + 1}, empty cell 2`).toBe('Normal');
    expect(paragraphs[0].getElementsByTagNameNS(W, 't')).toHaveLength(0);
  }
  const paragraphs = Array.from(document.getElementsByTagNameNS(W, 'p'));
  expect(paragraphs.filter((p) => p.getElementsByTagNameNS(W, 'pStyle').length === 0)).toEqual([]);
  expect(paragraphs).toHaveLength(6);
});
