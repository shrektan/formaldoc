import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import fixture from './fixtures/round7-single-level.json';
import { renderDocModel } from './render.js';
import {
  assertSingleLevelNumberingText,
  createSingleLevelRegulationModel,
} from './single-level-numbering-check.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const first = (node: Document | Element, name: string) => node.getElementsByTagNameNS(W, name)[0];
const attr = (node: Element, name: string) => node.getAttributeNS(W, name);

test('round7 real regulation forms each use a level0 definition, with continuous articles and separate item restarts', async () => {
  const model = createSingleLevelRegulationModel();
  const zip = await JSZip.loadAsync(await renderDocModel(model));
  const xml = new JSDOM(await zip.file('word/numbering.xml')!.async('string'), {
    contentType: 'text/xml',
  }).window.document;
  const abstracts = Array.from(xml.getElementsByTagNameNS(W, 'abstractNum'));
  expect(abstracts).toHaveLength(3);
  for (const abstract of abstracts) {
    const levels = abstract.getElementsByTagNameNS(W, 'lvl');
    expect(levels).toHaveLength(1);
    expect(attr(levels[0], 'ilvl')).toBe('0');
  }
  expect(xml.getElementsByTagNameNS(W, 'lvlRestart')).toHaveLength(0);
  const instances = Array.from(xml.getElementsByTagNameNS(W, 'num'));
  expect(instances).toHaveLength(4);
  for (const num of instances) {
    const overrides = num.getElementsByTagNameNS(W, 'lvlOverride');
    expect(overrides).toHaveLength(1);
    expect(attr(overrides[0], 'ilvl')).toBe('0');
    expect(attr(first(overrides[0], 'startOverride'), 'val')).toBe('1');
  }
  const paragraphs = model.sections[0].blocks.filter((b) => b.type === 'p');
  expect(paragraphs.filter((b) => b.numbering?.instanceId === 'ArticlesPart')).toHaveLength(12);
  expect(paragraphs.filter((b) => b.numbering?.instanceId === 'ItemsArticle8')).toHaveLength(2);
  expect(paragraphs.filter((b) => b.numbering?.instanceId === 'ItemsArticle12')).toHaveLength(2);
  expect(new Set(paragraphs.filter((b) => b.numbering).map((b) => b.numbering!.level))).toEqual(
    new Set([0])
  );
});

test('round7 rendered acceptance detects chapter resets and item counters that fail to restart', () => {
  const correct = fixture.expected.map((p) => p.label + p.body).join('\n');
  expect(() => assertSingleLevelNumberingText(correct)).not.toThrow();
  expect(() => assertSingleLevelNumberingText(correct.replace('第六条', '第一条'))).toThrow(
    '第六条'
  );
  expect(() =>
    assertSingleLevelNumberingText(correct.replace('（一）变更名称', '（三）变更名称'))
  ).toThrow('（一）');
});
