import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { renderDocModel } from './render.js';
import { parseDocModel, type DocModel, type ImageBlock } from './types.js';
import { createFullExample, transparentPng } from './fixtures/full-example.js';
import real from './fixtures/round3-layout.json';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const part = async (zip: JSZip, name: string) =>
  new JSDOM(await zip.file(`word/${name}.xml`)!.async('string'), { contentType: 'text/xml' }).window
    .document;
const first = (root: Document | Element, name: string) => root.getElementsByTagNameNS(W, name)[0];
const attr = (node: Element, name: string) => node.getAttributeNS(W, name);
function model(): DocModel {
  const m = createFullExample('/unused.png');
  m.styles = [structuredClone(real.body)] as DocModel['styles'];
  m.numbering = [];
  m.numberingInstances = [];
  m.sections = [
    {
      page: m.sections[0].page,
      blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '正文' }] }],
    },
  ];
  return m;
}
test('C1 atLeast spacing preserves the minimum while allowing real oversized titles', async () => {
  const m = model();
  const title = structuredClone(real.title);
  Object.assign(title, { lineSpacing: { rule: 'atLeast', pt: 30 } });
  m.styles.push(title as DocModel['styles'][number]);
  m.sections[0].blocks.push({
    type: 'p',
    styleId: title.id,
    runs: [{ text: '国家金融监督管理总局令' }],
  });
  const zip = await JSZip.loadAsync(await renderDocModel(m));
  const styles = await part(zip, 'styles');
  const node = Array.from(styles.getElementsByTagNameNS(W, 'style')).find(
    (s) => attr(s, 'styleId') === title.id
  )!;
  expect(attr(first(node, 'spacing'), 'lineRule')).toBe('atLeast');
  expect(attr(first(node, 'spacing'), 'line')).toBe('600');
});
test('I2 punctuation compression is explicit, can be disabled, and does not change the omitted default', async () => {
  for (const value of [true, false, undefined]) {
    const m = model();
    m.settings = value === undefined ? {} : Object.assign({}, { compressPunctuation: value });
    expect(() => parseDocModel(m)).not.toThrow();
    const zip = await JSZip.loadAsync(await renderDocModel(m));
    const settings = await part(zip, 'settings');
    const nodes = settings.getElementsByTagNameNS(W, 'characterSpacingControl');
    if (value === undefined) expect(nodes).toHaveLength(0);
    else {
      expect(nodes).toHaveLength(1);
      expect(attr(nodes[0], 'val')).toBe(value ? 'compressPunctuation' : 'doNotCompress');
    }
  }
});
test('C2 real standalone stamp and cell picture paragraphs use one unclipped picture style', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'round3-writer-'));
  try {
    const imagePath = join(dir, 'stamp.png');
    await writeFile(imagePath, transparentPng);
    const m = model();
    const image = {
      ...real.image,
      path: imagePath,
    } as ImageBlock;
    m.sections[0].blocks.push(image, {
      type: 'table',
      columnsPt: [200],
      borders: {},
      rows: [{ cells: [{ blocks: [image] }] }],
    });
    const zip = await JSZip.loadAsync(await renderDocModel(m));
    const document = await part(zip, 'document');
    const styles = await part(zip, 'styles');
    const pictureParagraphs = Array.from(document.getElementsByTagNameNS(W, 'p')).filter(
      (p) => p.getElementsByTagNameNS(W, 'drawing').length > 0
    );
    expect(pictureParagraphs).toHaveLength(2);
    const pictureStyles = new Set<string>();
    for (const p of pictureParagraphs) {
      const styleId = attr(first(p, 'pStyle'), 'val')!;
      pictureStyles.add(styleId);
      expect(styleId).not.toBe('Normal');
      const style = Array.from(styles.getElementsByTagNameNS(W, 'style')).find(
        (s) => attr(s, 'styleId') === styleId
      )!;
      expect(attr(first(style, 'name'), 'val')).toBe('图片');
      expect(attr(first(style, 'spacing'), 'lineRule')).toBe('auto');
      expect(attr(first(style, 'spacing'), 'line')).toBe('240');
      for (const key of ['firstLineChars', 'leftChars', 'rightChars'])
        expect(attr(first(style, 'ind'), key)).toBe('0');
    }
    expect(pictureStyles.size).toBe(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('C2 inline picture alignment stays in separate single-spaced styles without direct paragraph layout', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'round3-picture-align-'));
  try {
    const imagePath = join(dir, 'stamp.png');
    await writeFile(imagePath, transparentPng);
    const m = model();
    const alignments = [undefined, 'left', 'center', 'right'] as const;
    for (const align of alignments)
      m.sections[0].blocks.push({ ...real.image, path: imagePath, align } as ImageBlock);
    const zip = await JSZip.loadAsync(await renderDocModel(m));
    const document = await part(zip, 'document');
    const styles = await part(zip, 'styles');
    const paragraphs = Array.from(document.getElementsByTagNameNS(W, 'p')).filter(
      (p) => p.getElementsByTagNameNS(W, 'drawing').length > 0
    );
    const ids: string[] = [];
    expect(paragraphs).toHaveLength(4);
    for (const [index, p] of paragraphs.entries()) {
      const styleId = attr(first(p, 'pStyle'), 'val')!;
      ids.push(styleId);
      const style = Array.from(styles.getElementsByTagNameNS(W, 'style')).find(
        (s) => attr(s, 'styleId') === styleId
      )!;
      expect(attr(first(style, 'jc'), 'val')).toBe(alignments[index] ?? 'left');
      expect(attr(first(style, 'spacing'), 'lineRule')).toBe('auto');
      expect(attr(first(style, 'spacing'), 'line')).toBe('240');
      expect(attr(first(style, 'ind'), 'firstLineChars')).toBe('0');
      expect(Array.from(first(p, 'pPr').children).map((child) => child.localName)).toEqual([
        'pStyle',
      ]);
    }
    expect(ids[0]).toBe(ids[1]);
    expect(new Set(ids).size).toBe(3);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
