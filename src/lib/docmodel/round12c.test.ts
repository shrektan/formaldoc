import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import fixture from './fixtures/round12c-adjacent-tables.json';
import { renderDocModel, renderDocModelWithReport } from './render.js';
import { separateAdjacentTables } from './table-separators.js';
import { parseDocModel } from './types.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const parseXml = (xml: string) => new JSDOM(xml, { contentType: 'text/xml' }).window.document;
const attr = (element: Element, name: string) => element.getAttributeNS(W, name);
function assertSeparator(paragraph: Element) {
  expect(paragraph.localName).toBe('p');
  expect(paragraph.children).toHaveLength(1);
  const properties = paragraph.children[0];
  expect(Array.from(properties.children, (child) => child.localName)).toEqual([
    'pStyle',
    'spacing',
  ]);
  expect(attr(properties.children[0], 'val')).toBe('Normal');
  const spacing = properties.children[1];
  expect(attr(spacing, 'before')).toBe('0');
  expect(attr(spacing, 'after')).toBe('0');
  expect(attr(spacing, 'line')).toBe('20');
  expect(attr(spacing, 'lineRule')).toBe('exact');
  expect(paragraph.textContent).toBe('');
}

test('round12c runs8 scan-table-01 keeps each adjacent table grid and inserts empty exact 1pt Normal separators', async () => {
  const model = parseDocModel(fixture.model);
  const unchanged = structuredClone(model);
  const zip = await JSZip.loadAsync(await renderDocModel(model));
  const document = parseXml(await zip.file('word/document.xml')!.async('string'));
  const body = document.getElementsByTagNameNS(W, 'body')[0];
  const children = Array.from(body.children);
  expect(children.map((child) => child.localName)).toEqual([
    'tbl',
    'p',
    'tbl',
    'p',
    'tbl',
    'sectPr',
  ]);
  assertSeparator(children[1]);
  assertSeparator(children[3]);
  for (const [index, table] of children.filter((child) => child.localName === 'tbl').entries()) {
    const input = model.sections[0].blocks[index];
    if (input.type !== 'table') throw Error('Expected table');
    expect(Array.from(table.getElementsByTagNameNS(W, 'gridCol'), (col) => attr(col, 'w'))).toEqual(
      input.columnsPt.map((pt) => String(Math.round(pt * 20)))
    );
  }
  expect(model).toEqual(unchanged);
});

test('round12c XML writer separates nested cell tables and leaves existing content paragraphs alone', () => {
  const table = '<w:tbl><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>';
  const existing = '<w:p><w:r><w:t>保留</w:t></w:r></w:p>';
  const source = `<w:document xmlns:w="${W}"><w:body><w:tbl><w:tr><w:tc>${table}\n${table}${existing}${table}</w:tc></w:tr></w:tbl>${table}</w:body></w:document>`;
  const result = separateAdjacentTables(source);
  const document = parseXml(result);
  const body = document.getElementsByTagNameNS(W, 'body')[0];
  const outerCell = body.children[0].getElementsByTagNameNS(W, 'tc')[0];
  expect(Array.from(outerCell.children, (child) => child.localName)).toEqual([
    'tbl',
    'p',
    'tbl',
    'p',
    'tbl',
  ]);
  assertSeparator(outerCell.children[1]);
  expect(outerCell.children[3].textContent).toBe('保留');
  assertSeparator(body.children[1]);
  expect(separateAdjacentTables(result)).toBe(result);
});

test('round12c failed and blank math keep declared source text, emphasis and scripts before image fallback', async () => {
  const model = parseDocModel(fixture.model);
  const fallback = { path: '/missing-formula.png', widthPt: 20, heightPt: 10 };
  model.sections[0].blocks = [];
  const input = {
    ...model,
    sections: [
      {
        ...model.sections[0],
        blocks: [
          {
            type: 'p',
            styleId: 'Normal',
            runs: [
              {
                text: '',
                math: {
                  latex: '\\unknowncommand{x}',
                  fallback,
                  fallbackText: [
                    { text: 'Xe', bold: true, italic: true, underline: true, color: '123456' },
                    { text: '2', vertAlign: 'subscript' },
                  ],
                },
              },
              {
                text: '',
                math: {
                  latex: ' ',
                  fallback,
                  fallbackText: [
                    { text: 'Al', underline: false },
                    { text: '3', vertAlign: 'superscript' },
                  ],
                },
              },
            ],
          },
          { type: 'math', latex: '', fallback, fallbackText: [{ text: '保留原文' }] },
        ],
      },
    ],
  };
  const { buffer, report } = await renderDocModelWithReport(parseDocModel(input));
  const zip = await JSZip.loadAsync(buffer);
  const document = parseXml(await zip.file('word/document.xml')!.async('string'));
  const nodes = (name: string) => Array.from(document.getElementsByTagNameNS(W, name));
  expect(
    nodes('t')
      .map((node) => node.textContent)
      .join('')
  ).toBe('Xe2Al3保留原文');
  expect(nodes('drawing')).toHaveLength(0);
  expect(nodes('vertAlign').map((node) => attr(node, 'val'))).toEqual(['subscript', 'superscript']);
  expect(nodes('b')).toHaveLength(1);
  expect(nodes('i')).toHaveLength(1);
  expect(nodes('u').map((node) => attr(node, 'val'))).toEqual(['single', 'none']);
  expect(nodes('color').map((node) => attr(node, 'val'))).toEqual(['123456']);
  expect(report.mathConversions).toEqual({ display: 1, inline: 2, failed: 0, retainedText: 3 });
  expect(report.mathTextFallbacks).toEqual([fallback.path, fallback.path, fallback.path]);
});

test('round12c source-text math fallback rejects nested math or footnotes and empty text', () => {
  for (const fallbackText of [
    [],
    [{ text: '' }],
    [{ text: 'x', math: { latex: 'x' } }],
    [{ text: 'x', footnote: { id: 'x' } }],
  ]) {
    const model = structuredClone(fixture.model);
    const input = {
      ...model,
      sections: [{ ...model.sections[0], blocks: [{ type: 'math', latex: '', fallbackText }] }],
    };
    expect(() => parseDocModel(input)).toThrow();
  }
});
