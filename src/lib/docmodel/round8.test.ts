import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import * as api from '../../node.js';
import { createFullExample } from './fixtures/full-example.js';
import fixture from './fixtures/round8-xml-characters.json';
import type { DocModel } from './types.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function model(): DocModel {
  const m = createFullExample('/unused.png');
  m.styles = [m.styles[0]];
  m.numbering = [];
  m.numberingInstances = [];
  m.sections = [
    {
      page: m.sections[0].page,
      blocks: fixture.lines.map((l) => ({
        type: 'p',
        styleId: 'Normal',
        runs: [{ text: l.text }],
      })),
    },
  ];
  return m;
}
async function parseAllXml(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  for (const name of Object.keys(zip.files).filter((name) => /\.(?:xml|rels)$/i.test(name))) {
    const xml = await zip.file(name)!.async('string');
    expect(() => new JSDOM(xml, { contentType: 'text/xml' }), name).not.toThrow();
  }
  return zip;
}

test('round8 real paper controls cannot corrupt any XML part through the compatible Buffer API', async () => {
  const m = model();
  const original = structuredClone(m);
  const zip = await parseAllXml(await api.renderDocModel(m));
  const document = new JSDOM(await zip.file('word/document.xml')!.async('string'), {
    contentType: 'text/xml',
  }).window.document;
  expect(Array.from(document.getElementsByTagNameNS(W, 'p')).map((p) => p.textContent)).toEqual(
    fixture.lines.map((l) => l.expectedText)
  );
  expect(m).toEqual(original);
});

test('round8 reports source removals once, separately from final XML part safety filtering', async () => {
  expect(typeof api.renderDocModelWithReport).toBe('function');
  const result = await api.renderDocModelWithReport(model());
  expect(result.report).toEqual({
    xmlCharactersFiltered: 5,
    sourceXmlCharactersFiltered: 5,
    xmlPartsCharactersFiltered: {},
  });
  await parseAllXml(result.buffer);
});

test('round8 legal whitespace, astral characters, private use and replacement characters survive; invalid surrogates and noncharacters do not', async () => {
  const m = model();
  m.sections[0].blocks = [
    {
      type: 'p',
      styleId: 'Normal',
      runs: [{ text: '合法\t\n\r😀\ue000\uf8ff\ufffd\ud800X\udfff\ufffe\uffff' }],
    },
  ];
  const result = await api.renderDocModelWithReport(m);
  expect(result.report.xmlCharactersFiltered).toBe(4);
  const zip = await parseAllXml(result.buffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  for (const character of ['😀', '\ue000', '\uf8ff', '\ufffd']) expect(xml).toContain(character);
});

test('round8 attribute text source counts are not inflated by repeated font attributes; table height remains atLeast', async () => {
  const m = model();
  m.sections[0].blocks = [
    {
      type: 'table',
      columnsPt: [100],
      borders: {},
      rows: [
        {
          heightPt: 15.5,
          cells: [{ blocks: [{ type: 'p', styleId: 'Custom', runs: [{ text: '单元格' }] }] }],
        },
      ],
    },
  ];
  m.styles.push({
    ...m.styles[0],
    id: 'Custom',
    name: '样\u0000式',
    builtIn: false,
    font: { eastAsia: '仿\u0008宋', ascii: 'T\u000eNR' },
  });
  const result = await api.renderDocModelWithReport(m);
  expect(result.report.sourceXmlCharactersFiltered).toBe(3);
  expect(result.report.xmlCharactersFiltered).toBe(3);
  const zip = await parseAllXml(result.buffer);
  const styles = await zip.file('word/styles.xml')!.async('string');
  expect(styles).toContain('w:ascii="TNR" w:hAnsi="TNR" w:eastAsia="仿宋"');
  const document = new JSDOM(await zip.file('word/document.xml')!.async('string'), {
    contentType: 'text/xml',
  }).window.document;
  const height = document.getElementsByTagNameNS(W, 'trHeight')[0];
  expect(height.getAttributeNS(W, 'hRule')).toBe('atLeast');
  expect(height.getAttributeNS(W, 'val')).toBe('310');
});
