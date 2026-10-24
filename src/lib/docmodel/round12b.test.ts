import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import fixture from './fixtures/round12b-empty-cells.json';
import { renderDocModel } from './render.js';
import { parseDocModel, type DocModel } from './types.js';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
async function renderedCells(model: DocModel) {
  const zip = await JSZip.loadAsync(await renderDocModel(model));
  const document = new JSDOM(await zip.file('word/document.xml')!.async('string'), {
    contentType: 'text/xml',
  }).window.document;
  return Array.from(document.getElementsByTagNameNS(W, 'tc'));
}
function paragraphStyle(cell: Element) {
  const paragraphs = cell.getElementsByTagNameNS(W, 'p');
  expect(paragraphs).toHaveLength(1);
  return paragraphs[0].getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val');
}
test('round12b real runs7 table empty cells use their existing table-specific text style instead of the 271pt Normal', async () => {
  const model = parseDocModel(fixture.model);
  expect(model.styles.find((style) => style.id === 'Normal')?.spaceBeforePt).toBe(
    fixture.originalNormalBeforePt
  );
  const table = model.sections[0].blocks[0];
  if (table.type !== 'table') throw Error('Expected actual table');
  expect(fixture.emptyColumns.map((column) => table.rows[0].cells[column].blocks)).toEqual([
    [],
    [],
  ]);
  const cells = await renderedCells(model);
  for (const column of fixture.emptyColumns) {
    expect(paragraphStyle(cells[column])).toBe(fixture.expectedStyleId);
    expect(cells[column].getElementsByTagNameNS(W, 't')).toHaveLength(0);
  }
  for (const [column, cell] of table.rows[0].cells.entries())
    if (cell.blocks[0]?.type === 'p')
      expect(paragraphStyle(cells[column])).toBe(cell.blocks[0].styleId);
});
test('round12b a completely empty table uses an existing TableText variant; documents without table text styles retain Normal fallback', async () => {
  const model = parseDocModel(fixture.model);
  const table = model.sections[0].blocks[0];
  if (table.type !== 'table') throw Error('Expected actual table');
  for (const cell of table.rows[0].cells) cell.blocks = [];
  model.styles = model.styles.filter(
    (style) => style.id === 'Normal' || style.id === 'TableTextVariant2'
  );
  for (const cell of await renderedCells(model))
    expect(paragraphStyle(cell)).toBe('TableTextVariant2');
  model.styles = model.styles.filter((style) => style.id === 'Normal');
  for (const cell of await renderedCells(model)) expect(paragraphStyle(cell)).toBe('Normal');
});
