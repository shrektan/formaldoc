import { describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { renderDocModel } from './render.js';
import { imageBlockSchema, parseDocModel, type DocModel } from './types.js';
import { createFullExample, transparentPng } from './fixtures/full-example.js';
import regression from './fixtures/round2-indent.json';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const part = async (zip: JSZip, name: string) =>
  new JSDOM(await zip.file(`word/${name}.xml`)!.async('string'), { contentType: 'text/xml' }).window
    .document;
const first = (root: Document | Element, name: string, ns = W) =>
  root.getElementsByTagNameNS(ns, name)[0];
const attr = (node: Element, name: string) => node.getAttributeNS(W, name);
function numberedModel(): DocModel {
  const model = createFullExample('/unused.png');
  model.styles = [structuredClone(regression.style)] as DocModel['styles'];
  delete model.styles[0].basedOn;
  delete model.styles[0].next;
  model.numbering = [
    { id: 'real', levels: [structuredClone(regression.level)] },
  ] as DocModel['numbering'];
  model.numberingInstances = [{ id: 'real', numberingId: 'real' }];
  model.sections = [
    {
      page: model.sections[0].page,
      blocks: [
        {
          type: 'p',
          styleId: regression.style.id,
          runs: [{ text: '真实样张的编号条目' }],
          numbering: { instanceId: 'real', level: regression.level.level },
        },
      ],
    },
  ];
  return model;
}

describe('round 2 writer regressions', () => {
  it('requires the bound paragraph style when a numbering level specifies indentation', () => {
    const model = numberedModel();
    delete model.numbering[0].levels[0].styleId;
    expect(() => parseDocModel(model)).toThrow('numbering[0].levels[0].styleId');
  });

  it('writes character and twip indentation using the real regulation paragraph font size', async () => {
    const zip = await JSZip.loadAsync(await renderDocModel(numberedModel()));
    for (const name of ['styles', 'numbering']) {
      const indent = first(await part(zip, name), 'ind');
      expect(attr(indent, 'firstLineChars')).toBe('200');
      expect(attr(indent, 'firstLine')).toBe('640');
      expect(attr(indent, 'leftChars')).toBe('0');
      expect(attr(indent, 'left')).toBe('0');
    }
  });

  it('writes hanging and right indentation fallbacks at each owning style size', async () => {
    const model = numberedModel();
    model.styles[0].sizePt = 13.5;
    model.styles[0].indent = { hangingChars: 0.5, leftChars: 2, rightChars: 1.5 };
    model.numbering[0].levels[0].indent = { hangingChars: 0.5, leftChars: 2 };
    const zip = await JSZip.loadAsync(await renderDocModel(model));
    const style = first(await part(zip, 'styles'), 'ind');
    const level = first(await part(zip, 'numbering'), 'ind');
    for (const indent of [style, level]) {
      expect(attr(indent, 'hangingChars')).toBe('50');
      expect(attr(indent, 'hanging')).toBe('135');
      expect(attr(indent, 'left')).toBe('540');
    }
    expect(attr(style, 'right')).toBe('405');
  });

  it('restarts a single nonzero numbering level at that defined level', async () => {
    const model = numberedModel();
    model.numberingInstances[0].restartAt = 4;
    const zip = await JSZip.loadAsync(await renderDocModel(model));
    const override = first(await part(zip, 'numbering'), 'lvlOverride');
    expect(attr(override, 'ilvl')).toBe('1');
    expect(attr(first(override, 'startOverride'), 'val')).toBe('4');
  });

  it('retains distributed alignment on the paragraph style', async () => {
    const model = numberedModel();
    Object.assign(model.styles[0], { align: 'distribute' });
    const zip = await JSZip.loadAsync(await renderDocModel(model));
    const styles = await part(zip, 'styles');
    const style = Array.from(styles.getElementsByTagNameNS(W, 'style')).find(
      (node) => attr(node, 'styleId') === regression.style.id
    )!;
    expect(attr(first(style, 'jc'), 'val')).toBe('distribute');
  });

  it('rejects the obsolete shared image reference and requires each positioning axis', () => {
    const image = {
      type: 'image',
      path: '/unused.png',
      widthPt: 10,
      heightPt: 10,
      floating: { xPt: 0, yPt: 0, wrap: 'none', inFront: true },
    };
    expect(
      imageBlockSchema.safeParse({ ...image, floating: { ...image.floating, relativeTo: 'page' } })
        .success
    ).toBe(false);
    for (const yRelativeTo of ['page', 'margin', 'paragraph']) {
      expect(
        imageBlockSchema.safeParse({
          ...image,
          floating: { ...image.floating, xRelativeTo: 'page', yRelativeTo },
        }).success
      ).toBe(true);
    }
    expect(
      imageBlockSchema.safeParse({
        ...image,
        floating: { ...image.floating, xRelativeTo: 'paragraph', yRelativeTo: 'column' },
      }).success
    ).toBe(false);
  });

  it('anchors the stamp vertically to its signing paragraph and horizontally to page or column', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'round2-writer-'));
    try {
      const imagePath = join(dir, 'stamp.png');
      await writeFile(imagePath, transparentPng);
      for (const xRelativeTo of ['page', 'margin', 'column']) {
        const model = numberedModel();
        const p = model.sections[0].blocks[0];
        Object.assign(p, {
          anchors: [
            {
              type: 'image',
              path: imagePath,
              widthPt: 141.015,
              heightPt: 150.718,
              floating: {
                xPt: 86.275,
                yPt: -12.5,
                xRelativeTo,
                yRelativeTo: 'paragraph',
                wrap: 'none',
                inFront: true,
              },
            },
          ],
        });
        const zip = await JSZip.loadAsync(await renderDocModel(model));
        const document = await part(zip, 'document');
        const anchor = first(document, 'anchor', WP);
        expect(first(anchor, 'positionH', WP).getAttribute('relativeFrom')).toBe(xRelativeTo);
        expect(first(anchor, 'positionV', WP).getAttribute('relativeFrom')).toBe('paragraph');
        const offsets = Array.from(anchor.getElementsByTagNameNS(WP, 'posOffset'));
        expect(offsets.map((n) => n.textContent)).toEqual([
          String(Math.round(86.275 * 12700)),
          '-158750',
        ]);
        expect(first(document, 'p').contains(anchor)).toBe(true);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
