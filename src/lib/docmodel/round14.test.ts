import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { renderDocModel } from './render.js';
import { parseDocModel } from './types.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes = (root: Document | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS(W, name));
const attr = (element: Element, name: string) => element.getAttributeNS(W, name);
const fontPair = (element: Element) => {
  const font = nodes(element, 'rFonts')[0];
  expect(font).toBeDefined();
  return ['eastAsia', 'ascii', 'hAnsi'].map((name) => attr(font, name));
};

describe('DocModel script-specific font declarations', () => {
  for (const ascii of ['Arial', '黑体']) {
    it(`preserves Chinese / ${ascii} fonts in styles, numbering and page-number styles`, async () => {
      const font = { eastAsia: '黑体', ascii };
      const model = parseDocModel({
        version: 1,
        styles: [
          {
            id: 'Normal',
            name: 'Normal',
            builtIn: true,
            font,
            sizePt: 12,
            align: 'left',
            lineSpacing: { rule: 'exact', pt: 18 },
          },
        ],
        numbering: [
          {
            id: 'items',
            levels: [
              {
                level: 0,
                format: 'decimal',
                text: '%1.',
                start: 1,
                suffix: 'space',
                styleId: 'Normal',
                run: { font },
              },
            ],
          },
        ],
        numberingInstances: [{ id: 'list', numberingId: 'items' }],
        sections: [
          {
            page: {
              widthPt: 595,
              heightPt: 842,
              orientation: 'portrait',
              margins: {
                topPt: 36,
                bottomPt: 36,
                leftPt: 36,
                rightPt: 36,
                headerPt: 18,
                footerPt: 18,
              },
            },
            pageNumber: { format: '第 %PAGE% 页', font, sizePt: 10, placement: 'center' },
            blocks: [
              {
                type: 'p',
                styleId: 'Normal',
                runs: [{ text: '标题 2026 ABC', bold: true }],
                numbering: { instanceId: 'list', level: 0 },
              },
            ],
          },
        ],
      });
      const zip = await JSZip.loadAsync(await renderDocModel(model));
      const part = async (path: string) =>
        new JSDOM(await zip.file(path)!.async('string'), { contentType: 'text/xml' }).window
          .document;
      const styles = await part('word/styles.xml');
      const normal = nodes(styles, 'style').find((style) => attr(style, 'styleId') === 'Normal')!;
      expect(fontPair(normal)).toEqual(['黑体', ascii, ascii]);
      const numbering = await part('word/numbering.xml');
      const level = nodes(numbering, 'lvl').find((level) =>
        nodes(level, 'lvlText').some((text) => attr(text, 'val') === '%1.')
      )!;
      expect(fontPair(level)).toEqual(['黑体', ascii, ascii]);
      const document = await part('word/document.xml');
      const paragraph = nodes(document, 'p').find((p) => p.textContent === '标题 2026 ABC')!;
      expect(attr(nodes(paragraph, 'pStyle')[0], 'val')).toBe('Normal');
      expect(nodes(paragraph, 'rFonts')).toHaveLength(0);
      const footerPaths = Object.keys(zip.files).filter((path) =>
        /^word\/footer\d+\.xml$/.test(path)
      );
      expect(footerPaths.length).toBeGreaterThan(0);
      for (const path of footerPaths) {
        const footer = await part(path);
        const page = nodes(footer, 'p').find((p) => nodes(p, 'fldSimple').length > 0)!;
        expect(page).toBeDefined();
        const styleId = attr(nodes(page, 'pStyle')[0], 'val');
        const style = nodes(styles, 'style').find((style) => attr(style, 'styleId') === styleId)!;
        expect(fontPair(style)).toEqual(['黑体', ascii, ascii]);
        expect(nodes(page, 'rFonts')).toHaveLength(0);
      }
    });
  }
});
