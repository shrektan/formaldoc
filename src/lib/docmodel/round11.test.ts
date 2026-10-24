import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import fixture from './fixtures/round11-content.json';
import { createFullExample } from './fixtures/full-example.js';
import { renderDocModelWithReport } from './render.js';
import { parseDocModel, type DocModel } from './types.js';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const nodes = (root: Document | Element, name: string, ns = W) =>
  Array.from(root.getElementsByTagNameNS(ns, name));
const attr = (node: Element, name: string) => node.getAttributeNS(W, name);
const fallback = {
  path: fileURLToPath(new URL('./fixtures/round11-formula-fallback.png', import.meta.url)),
  ...fixture.fallback,
};
const paragraph = (text: string) => ({ type: 'p' as const, styleId: 'Normal', runs: [{ text }] });
function model(): DocModel {
  const m = createFullExample('/unused.png');
  m.styles = [m.styles[0]];
  m.numbering = [];
  m.numberingInstances = [];
  m.sections = [{ page: m.sections[0].page, blocks: [] }];
  return m;
}
async function packed(m: DocModel) {
  const result = await renderDocModelWithReport(m);
  const zip = await JSZip.loadAsync(result.buffer);
  const docs = new Map<string, Document>();
  for (const name of Object.keys(zip.files).filter((name) => /\.(?:xml|rels)$/.test(name)))
    docs.set(
      name,
      new JSDOM(await zip.file(name)!.async('string'), { contentType: 'text/xml' }).window.document
    );
  return {
    ...result,
    zip,
    docs,
    document: docs.get('word/document.xml')!,
    styles: docs.get('word/styles.xml')!,
  };
}
test('round11 chemical content preserves superscript/subscript as native run semantics', async () => {
  const m = model();
  m.sections[0].blocks = [
    {
      type: 'p',
      styleId: 'Normal',
      runs: [
        { text: 'U' },
        { text: '3', vertAlign: 'subscript' },
        { text: 'Si' },
        { text: '2', vertAlign: 'subscript' },
        { text: ' Å' },
        { text: '3', vertAlign: 'superscript' },
      ],
    },
  ];
  const { document } = await packed(m);
  expect(nodes(document, 'vertAlign').map((node) => attr(node, 'val'))).toEqual([
    'subscript',
    'subscript',
    'superscript',
  ]);
  expect(
    nodes(document, 't')
      .map((node) => node.textContent)
      .join('')
  ).toBe('U3Si2 Å3');
});
test('round11 controlled readers on real CN/arxiv regions create editable OMML and right-edge equation numbers', async () => {
  const m = model();
  m.sections[0].blocks = [
    ...fixture.math.map((item) => ({
      type: 'math' as const,
      latex: item.mockLatex,
      numberText: item.numberText,
      fallback,
    })),
    {
      type: 'p',
      styleId: 'Normal',
      runs: [{ text: '公式' }, { text: '', math: { latex: 'E=mc^2', fallback } }],
    },
  ];
  const { document, styles, report } = await packed(m);
  expect(nodes(document, 'oMath', M)).toHaveLength(3);
  expect(nodes(document, 'nary', M).length).toBeGreaterThan(0);
  expect(report.mathConversions).toEqual({ display: 2, inline: 1, failed: 0 });
  expect(nodes(document, 't').map((node) => node.textContent)).toContain('(22)');
  const right = nodes(styles, 'tab').filter((node) => attr(node, 'val') === 'right');
  const center = nodes(styles, 'tab').filter((node) => attr(node, 'val') === 'center');
  expect(right.length).toBeGreaterThan(0);
  expect(center.length).toBeGreaterThan(0);
  const page = m.sections[0].page;
  const width = page.widthPt - page.margins.leftPt - page.margins.rightPt;
  expect(right.some((node) => attr(node, 'pos') === String(Math.round(width * 20)))).toBe(true);
  expect(nodes(document, 'pPr').every((node) => nodes(node, 'tabs').length === 0)).toBe(true);
  expect(nodes(document, 't').some((node) => node.textContent?.includes('d\u0015'))).toBe(false);
});
test('round11 rejected or empty LaTeX falls back to the true cropped formula, recording each failure once', async () => {
  const m = model();
  m.sections[0].blocks = [
    { type: 'math', latex: '\\unknowncommand{x}', numberText: '(22)', fallback },
    { type: 'math', latex: '\\text{a\\&b}', fallback },
    { type: 'p', styleId: 'Normal', runs: [{ text: '', math: { latex: '', fallback } }] },
  ];
  const { document, report } = await packed(m);
  expect(nodes(document, 'drawing')).toHaveLength(3);
  expect(nodes(document, 'oMath', M)).toHaveLength(0);
  expect(report.mathConversions).toEqual({ display: 2, inline: 1, failed: 3 });
  m.sections[0].blocks = [{ type: 'math', latex: '' }];
  await expect(renderDocModelWithReport(m)).rejects.toThrow('fallback');
});
test('round11 native footnotes preserve funding marker literals and use built-in text/reference styles', async () => {
  const m = model();
  m.footnotes = [
    { id: 'funding', blocks: [paragraph(fixture.footnote.replace(/^\*\s*/, ''))] },
    { id: 'auto', blocks: [paragraph('自动脚注')] },
  ];
  m.sections[0].blocks = [
    {
      type: 'p',
      styleId: 'Normal',
      runs: [
        { text: '正文' },
        { text: '*', footnote: { id: 'funding' } },
        { text: '', footnote: { id: 'auto' } },
      ],
    },
  ];
  const { document, styles, docs, zip } = await packed(m);
  expect(nodes(document, 'footnoteReference').map((node) => attr(node, 'id'))).toEqual(['1', '2']);
  expect(attr(nodes(document, 'footnoteReference')[0], 'customMarkFollows')).toBe('1');
  expect(
    nodes(document, 't')
      .map((node) => node.textContent)
      .join('')
  ).toBe('正文*');
  const footnotes = docs.get('word/footnotes.xml')!;
  const real = nodes(footnotes, 'footnote').filter((node) => Number(attr(node, 'id')) > 0);
  expect(real).toHaveLength(2);
  expect(
    real.every((node) =>
      nodes(node, 'pStyle').every((style) => attr(style, 'val') === 'FootnoteText')
    )
  ).toBe(true);
  expect(real[0].textContent).toContain('贵州省基础研究计划');
  expect(real[0].textContent?.startsWith('*')).toBe(true);
  expect(nodes(footnotes, 'pPr').every((node) => nodes(node, 'spacing').length === 0)).toBe(true);
  for (const [id, type] of [
    ['FootnoteText', 'paragraph'],
    ['FootnoteReference', 'character'],
  ]) {
    const style = nodes(styles, 'style').find((node) => attr(node, 'styleId') === id)!;
    expect(style).toBeDefined();
    expect(attr(style, 'type')).toBe(type);
    expect(attr(style, 'customStyle')).toBe('0');
  }
  expect(await zip.file('word/_rels/document.xml.rels')!.async('string')).toContain('/footnotes');
  m.sections[0].blocks = [
    { type: 'p', styleId: 'Normal', runs: [{ text: '', footnote: { id: 'missing' } }] },
  ];
  expect(() => parseDocModel(m)).toThrow('Unknown footnote');
  m.sections[0].blocks = [paragraph('旧模型')];
  m.footnotes = undefined;
  expect(() => parseDocModel(m)).not.toThrow();
});

test('round11 real whitepaper [38]/[39] markers stay custom references, with strict note identities and no recursive/header references', async () => {
  const m = model();
  m.footnotes = fixture.whitepaperFootnotes.map((note) => ({
    id: note.id,
    blocks: [paragraph(note.text)],
  }));
  m.sections[0].blocks = [
    {
      type: 'p',
      styleId: 'Normal',
      runs: fixture.whitepaperFootnotes.map((note) => ({
        text: note.marker,
        footnote: { id: note.id },
      })),
    },
  ];
  const { document, docs } = await packed(m);
  expect(
    nodes(document, 't')
      .map((node) => node.textContent)
      .join('')
  ).toBe('[38][39]');
  expect(
    nodes(document, 'footnoteReference').every((node) => attr(node, 'customMarkFollows') === '1')
  ).toBe(true);
  const real = nodes(docs.get('word/footnotes.xml')!, 'footnote').filter(
    (node) => Number(attr(node, 'id')) > 0
  );
  for (const [index, note] of fixture.whitepaperFootnotes.entries())
    expect(real[index].textContent).toBe(note.marker + note.text);
  m.footnotes.push(structuredClone(m.footnotes[0]));
  expect(() => parseDocModel(m)).toThrow('Duplicate id');
  m.footnotes.pop();
  m.sections[0].header = [
    { type: 'p', styleId: 'Normal', runs: [{ text: '[38]', footnote: { id: 'note38' } }] },
  ];
  expect(() => parseDocModel(m)).toThrow('only allowed in document body');
  m.sections[0].header = undefined;
  m.footnotes[0].blocks[0].runs = [{ text: '[39]', footnote: { id: 'note39' } }];
  expect(() => parseDocModel(m)).toThrow('only allowed in document body');
});

test('round11 formula fallback inside a real native footnote has a resolved image relationship and embedded media', async () => {
  const m = model();
  m.sections[0].blocks = [
    { type: 'p', styleId: 'Normal', runs: [{ text: '*', footnote: { id: 'funding' } }] },
  ];
  m.footnotes = [
    {
      id: 'funding',
      blocks: [
        {
          type: 'p',
          styleId: 'Normal',
          runs: [{ text: fixture.footnote }, { text: '', math: { latex: '', fallback } }],
        },
      ],
    },
  ];
  const { docs, zip, report } = await packed(m);
  const footnotes = docs.get('word/footnotes.xml')!;
  const blip = nodes(footnotes, 'blip', 'http://schemas.openxmlformats.org/drawingml/2006/main')[0];
  const reference = blip.getAttributeNS(
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'embed'
  );
  expect(reference).not.toContain('{');
  const rels = docs.get('word/_rels/footnotes.xml.rels')!;
  const relationship = nodes(
    rels,
    'Relationship',
    'http://schemas.openxmlformats.org/package/2006/relationships'
  ).find((node) => node.getAttribute('Id') === reference);
  expect(relationship).toBeDefined();
  expect(relationship!.getAttribute('Type')).toEndWith('/image');
  expect(zip.file('word/' + relationship!.getAttribute('Target'))).not.toBeNull();
  expect(report.mathConversions).toEqual({ display: 0, inline: 1, failed: 1 });
});
