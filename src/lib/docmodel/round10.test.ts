import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { createFullExample } from './fixtures/full-example.js';
import fixture from './fixtures/round10-layout.json';
import { renderDocModelWithReport } from './render.js';
import { parseDocModel, sectionDefSchema, type DocModel, type ParagraphBlock } from './types.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes = (root: Document | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS(W, name));
const attr = (node: Element, name: string) => node.getAttributeNS(W, name);
const xml = async (zip: JSZip, name: string) =>
  new JSDOM(await zip.file(name)!.async('string'), { contentType: 'text/xml' }).window.document;
function model(): DocModel {
  const m = createFullExample('/unused.png');
  m.styles = [m.styles[0]];
  m.numbering = [];
  m.numberingInstances = [];
  m.sections = [{ page: sectionDefSchema.shape.page.parse(fixture.page), blocks: [] }];
  return m;
}
const paragraph = (text: string, styleId = 'Normal') => ({
  type: 'p' as const,
  styleId,
  runs: [{ text }],
});

test('round10 real paper geometry writes continuous two/single column sections without extra paragraphs', async () => {
  const m = model();
  m.sections = [1, 2, 1].map((count, index) => ({
    page: sectionDefSchema.shape.page.parse(fixture.page),
    ...(index ? { startType: 'continuous' as const } : {}),
    columns: { count, spacePt: count === 2 ? 18.4 : 0 },
    blocks: [paragraph(`段落${index}`)],
  }));
  const zip = await JSZip.loadAsync((await renderDocModelWithReport(m)).buffer);
  const document = await xml(zip, 'word/document.xml');
  expect(nodes(document, 'cols').map((node) => attr(node, 'num'))).toEqual(['1', '2', '1']);
  expect(nodes(document, 'cols').map((node) => attr(node, 'space'))).toEqual(['0', '368', '0']);
  expect(nodes(document, 'p')).toHaveLength(3);
  expect(nodes(document, 'type').filter((node) => attr(node, 'val') === 'continuous')).toHaveLength(
    2
  );
  for (const count of [0, 1.5]) {
    m.sections[0].columns!.count = count;
    expect(() => parseDocModel(m)).toThrow();
  }
  m.sections[0].columns = { count: 2, spacePt: fixture.page.widthPt };
  expect(() => parseDocModel(m)).toThrow('Column spacing consumes');
});

test('round10 real report headers and Chinese caption use built-ins with distinct even header parts', async () => {
  const m = model();
  m.styles.push(
    { ...m.styles[0], id: 'HeaderAlias', name: 'Header', builtIn: true },
    { ...m.styles[0], id: 'CaptionAlias', name: 'Caption', builtIn: true }
  );
  m.sections[0].header = [paragraph(fixture.header, 'HeaderAlias')];
  m.sections[0].headerEven = [paragraph('偶数页' + fixture.header, 'HeaderAlias')];
  m.sections[0].blocks = [paragraph(fixture.caption, 'CaptionAlias')];
  const zip = await JSZip.loadAsync((await renderDocModelWithReport(m)).buffer);
  const styles = await xml(zip, 'word/styles.xml');
  for (const [id, name] of [
    ['Header', 'header'],
    ['Caption', 'caption'],
  ]) {
    const matching = nodes(styles, 'style').filter((node) => attr(node, 'styleId') === id);
    expect(matching).toHaveLength(1);
    expect(attr(nodes(matching[0], 'name')[0], 'val')).toBe(name);
    expect(attr(matching[0], 'customStyle')).toBe('0');
  }
  expect(nodes(await xml(zip, 'word/settings.xml'), 'evenAndOddHeaders')).toHaveLength(1);
  const contents = await Promise.all(
    Object.keys(zip.files)
      .filter((name) => /^word\/header\d+\.xml$/.test(name))
      .map(async (name) => {
        const header = await xml(zip, name);
        expect(nodes(header, 'pStyle').map((node) => attr(node, 'val'))).toEqual(['Header']);
        return header.documentElement.textContent;
      })
  );
  expect(contents).toContain(fixture.header);
  expect(contents).toContain('偶数页' + fixture.header);
  expect(
    nodes(await xml(zip, 'word/document.xml'), 'pStyle').map((node) => attr(node, 'val'))
  ).toEqual(['Caption']);
  m.sections[0].headerEven![0] = paragraph('bad', 'UnknownStyle');
  expect(() => parseDocModel(m)).toThrow('Unknown style');
});

test('round10 tall real table text disables unsafe repeat headers and oversized row cantSplit, retaining atLeast', async () => {
  const m = model();
  m.sections[0].page = sectionDefSchema.shape.page.parse(fixture.tablePage);
  m.styles.push(fixture.largeStyle as DocModel['styles'][number]);
  const page = m.sections[0].page;
  const body = page.heightPt - page.margins.topPt - page.margins.bottomPt;
  m.sections[0].blocks = [
    {
      type: 'table',
      columnsPt: [100],
      borders: {},
      rows: [
        { header: true, heightPt: body / 3 + 1, cells: [{ blocks: [paragraph('表头')] }] },
        {
          cantSplit: true,
          heightPt: body + 1,
          cells: [
            {
              blocks: [
                fixture.largeParagraph as DocModel['sections'][number]['blocks'][number] & {
                  type: 'p';
                },
              ],
            },
          ],
        },
        { cantSplit: false, heightPt: 20, cells: [{ blocks: [paragraph('允许跨页')] }] },
        { cells: [{ blocks: [paragraph('普通行')] }] },
      ],
    },
  ];
  const result = await renderDocModelWithReport(m);
  const document = await xml(await JSZip.loadAsync(result.buffer), 'word/document.xml');
  const rows = nodes(document, 'tr');
  expect(
    nodes(document, 'tblHeader').filter(
      (node) => attr(node, 'val') !== 'false' && attr(node, 'val') !== '0'
    )
  ).toHaveLength(0);
  for (const index of [1, 2]) {
    expect(
      nodes(rows[index], 'cantSplit').every((node) =>
        ['0', 'false'].includes(attr(node, 'val') ?? '')
      )
    ).toBe(true);
  }
  expect(
    nodes(rows[3], 'cantSplit').some((node) => !['0', 'false'].includes(attr(node, 'val') ?? ''))
  ).toBe(true);
  expect(nodes(document, 'trHeight').every((node) => attr(node, 'hRule') === 'atLeast')).toBe(true);
  expect(result.report.layoutWarnings).toHaveLength(2);
  expect(result.report.xmlCharactersFiltered).toBe(0);
});

test('round10 real 72pt empty-form marker cannot hide an oversized row behind its shorter measured grid band', async () => {
  const m = model();
  const page = sectionDefSchema.shape.page.parse(fixture.tablePage);
  page.margins.bottomPt = page.heightPt - page.margins.topPt - 60;
  m.sections[0].page = page;
  m.styles.push(fixture.largeStyle as DocModel['styles'][number]);
  m.sections[0].blocks = [
    {
      type: 'table',
      columnsPt: [100],
      borders: {},
      rows: [
        {
          header: true,
          cantSplit: true,
          heightPt: fixture.rowHeightPt,
          cells: [{ blocks: [fixture.largeParagraph as ParagraphBlock] }],
        },
      ],
    },
  ];
  const result = await renderDocModelWithReport(m);
  const document = await xml(await JSZip.loadAsync(result.buffer), 'word/document.xml');
  expect(nodes(document, 'cantSplit')).toHaveLength(0);
  expect(nodes(document, 'tblHeader')).toHaveLength(0);
  expect(attr(nodes(document, 'trHeight')[0], 'val')).toBe(
    String(Math.round(fixture.rowHeightPt * 20))
  );
  expect(attr(nodes(document, 'trHeight')[0], 'hRule')).toBe('atLeast');
  expect(result.report.layoutWarnings).toHaveLength(2);
  expect(result.report.layoutWarnings!.every((warning) => warning.includes('86.50pt'))).toBe(true);
});
