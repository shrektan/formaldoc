import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { renderDocModel } from './render.js';
import { parseDocModel } from './types.js';
import fixture from './fixtures/round6-numbering.json';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const first = (node: Document | Element, name: string) => node.getElementsByTagNameNS(W, name)[0];
const attr = (node: Element, name: string) => node.getAttributeNS(W, name);
function model() {
  const input = structuredClone(fixture.model);
  input.numbering[0].levels.forEach((level, index) =>
    Object.assign(level, { restartAfterLevel: [-1, 0, -1, 2][index] })
  );
  Object.assign(input.numberingInstances[1], {
    startOverrides: [
      { level: 1, start: 2 },
      { level: 2, start: 11 },
    ],
  });
  return parseDocModel(input);
}
async function numbering(input = model()) {
  const zip = await JSZip.loadAsync(await renderDocModel(input));
  return new JSDOM(await zip.file('word/numbering.xml')!.async('string'), {
    contentType: 'text/xml',
  }).window.document;
}

test('round6 actual chapter/section/article/item definition has explicit independent restart rules', async () => {
  const document = await numbering();
  const levels = Array.from(document.getElementsByTagNameNS(W, 'lvl'));
  expect(levels.map((level) => attr(first(level, 'lvlRestart'), 'val'))).toEqual([
    '0',
    '1',
    '0',
    '3',
  ]);
});

test('round6 every instance explicitly starts every level even when the abstract definition is shared', async () => {
  const document = await numbering();
  const instances = Array.from(document.getElementsByTagNameNS(W, 'num'));
  expect(instances).toHaveLength(2);
  expect(instances.map((num) => attr(first(num, 'abstractNumId'), 'val'))).toEqual(['0', '0']);
  expect(
    instances.map((num) =>
      Array.from(num.getElementsByTagNameNS(W, 'lvlOverride')).map((level) => ({
        level: attr(level, 'ilvl'),
        start: attr(first(level, 'startOverride'), 'val'),
      }))
    )
  ).toEqual([
    [
      { level: '0', start: '1' },
      { level: '1', start: '1' },
      { level: '2', start: '1' },
      { level: '3', start: '1' },
    ],
    [
      { level: '0', start: '3' },
      { level: '1', start: '2' },
      { level: '2', start: '11' },
      { level: '3', start: '1' },
    ],
  ]);
});

test('round6 omission preserves the legacy restart policy and explicit starts can replace the root default', async () => {
  const input = model();
  input.numbering[0].levels.forEach((level) => {
    delete level.restartAfterLevel;
  });
  delete input.numberingInstances[0].restartAt;
  input.numberingInstances[0].startOverrides = [{ level: 0, start: 4 }];
  const document = await numbering(input);
  expect(document.getElementsByTagNameNS(W, 'lvlRestart')).toHaveLength(0);
  const root = first(first(document, 'num'), 'lvlOverride');
  expect(attr(first(root, 'startOverride'), 'val')).toBe('4');
});

test('round6 invalid restart levels and conflicting or unknown start overrides have precise paths', () => {
  for (const restartAfterLevel of [-2, 1, 1.5]) {
    const input = model();
    input.numbering[0].levels[1].restartAfterLevel = restartAfterLevel;
    expect(() => parseDocModel(input)).toThrow('numbering[0].levels[1].restartAfterLevel');
  }
  for (const startOverrides of [
    [{ level: 7, start: 1 }],
    [
      { level: 1, start: 1 },
      { level: 1, start: 2 },
    ],
    [{ level: 0, start: 9 }],
    [{ level: 1, start: 0 }],
  ]) {
    const input = model();
    input.numberingInstances[1].startOverrides = startOverrides;
    expect(() => parseDocModel(input)).toThrow('numberingInstances[1].startOverrides');
  }
  const input = model();
  input.numberingInstances[1].startOverrides = [{ level: 0, start: 3 }];
  expect(() => parseDocModel(input)).not.toThrow();
});
