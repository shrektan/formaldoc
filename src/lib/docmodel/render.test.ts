import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { renderDocModel } from './render.js';
import { createFullExample, transparentPng } from './fixtures/full-example.js';
import type { DocModel } from './types.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const nodes = (root: Document | Element, name: string, ns = W): Element[] =>
  Array.from(root.getElementsByTagNameNS(ns, name));
const attr = (el: Element | undefined, name: string) => el?.getAttributeNS(W, name) ?? '';
const first = (root: Document | Element, name: string, ns = W) => nodes(root, name, ns)[0];
const xml = async (zip: JSZip, path: string): Promise<Document> => {
  const file = zip.file(path);
  expect(file, path).not.toBeNull();
  return new JSDOM(await file!.async('string'), { contentType: 'text/xml' }).window.document;
};

let dir: string;
let imagePath: string;
let model: DocModel;
let zip: JSZip;
let document: Document;
let styles: Document;
let numbering: Document;
let settings: Document;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'formaldoc-docmodel-'));
  imagePath = join(dir, 'transparent.png');
  await writeFile(imagePath, transparentPng);
  model = createFullExample(imagePath);
  zip = await JSZip.loadAsync(await renderDocModel(model));
  [document, styles, numbering, settings] = await Promise.all(
    ['document', 'styles', 'numbering', 'settings'].map((part) => xml(zip, `word/${part}.xml`))
  );
});
afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

const findStyle = (id: string) => nodes(styles, 'style').find((el) => attr(el, 'styleId') === id)!;

describe('DocModel DOCX XML', () => {
  it('writes every declared style and overrides built-in styles without duplicate definitions', () => {
    for (const definition of model.styles) {
      const matching = nodes(styles, 'style').filter((el) => attr(el, 'styleId') === definition.id);
      expect(matching, definition.id).toHaveLength(1);
      const style = matching[0];
      expect(attr(first(style, 'name'), 'val')?.toLowerCase()).toBe(definition.name.toLowerCase());
      expect(attr(first(style, 'rFonts'), 'eastAsia')).toBe(definition.font.eastAsia);
      expect(attr(first(style, 'rFonts'), 'ascii')).toBe(definition.font.ascii);
      expect(attr(first(style, 'rFonts'), 'hAnsi')).toBe(definition.font.ascii);
      expect(attr(first(style, 'sz'), 'val')).toBe(String(definition.sizePt * 2));
      expect(attr(first(style, 'jc'), 'val')).toBe(
        definition.align === 'justify' ? 'both' : definition.align
      );
      if (definition.outlineLevel !== undefined) {
        expect(attr(first(style, 'outlineLvl'), 'val')).toBe(String(definition.outlineLevel));
      }
      if (definition.lineSpacing.rule === 'exact') {
        expect(attr(first(style, 'spacing'), 'lineRule')).toBe('exact');
        expect(attr(first(style, 'spacing'), 'line')).toBe(String(definition.lineSpacing.pt * 20));
      }
    }
    expect(attr(first(findStyle('Normal'), 'ind'), 'firstLineChars')).toBe('200');
    expect(['0', 'false']).toContain(attr(first(findStyle('Normal'), 'snapToGrid'), 'val'));
    const signature = findStyle('Signature');
    const indent = first(signature, 'ind');
    expect(attr(indent, 'firstLineChars')).toBe('150');
    expect(attr(indent, 'hangingChars')).toBe('50');
    expect(attr(indent, 'leftChars')).toBe('200');
    expect(attr(indent, 'rightChars')).toBe('100');
    expect(attr(first(signature, 'spacing'), 'line')).toBe('360');
    expect(attr(first(signature, 'spacing'), 'lineRule')).toBe('auto');
    expect(attr(first(signature, 'spacing'), 'before')).toBe('120');
    expect(attr(first(signature, 'spacing'), 'after')).toBe('60');
    expect(attr(first(signature, 'color'), 'val')).toBe('123456');
    expect(first(signature, 'pageBreakBefore')).toBeDefined();
    expect(attr(first(findStyle('Heading1'), 'basedOn'), 'val')).toBe('Normal');
    expect(attr(first(findStyle('Heading1'), 'next'), 'val')).toBe('Normal');
    expect(first(findStyle('Heading1'), 'keepNext')).toBeDefined();
  });

  it('keeps paragraph and run formatting on styles throughout document, headers, footers and TOC', async () => {
    let paragraphCount = 0;
    for (const path of Object.keys(zip.files).filter((path) => /^word\/.*\.xml$/.test(path))) {
      const part = await xml(zip, path);
      for (const p of nodes(part, 'p')) {
        paragraphCount++;
        const pPr = Array.from(p.children).find((child) => child.localName === 'pPr');
        for (const child of Array.from(pPr?.children ?? [])) {
          // pageBreakBefore is where a declared page break lands, not formatting.
          expect(
            ['pStyle', 'pageBreakBefore', 'numPr', 'sectPr'],
            `${path}: pPr/${child.localName}`
          ).toContain(child.localName);
        }
        for (const run of nodes(p, 'r')) {
          for (const child of Array.from(first(run, 'rPr')?.children ?? [])) {
            expect(['b', 'i', 'u', 'color'], `${path}: rPr/${child.localName}`).toContain(
              child.localName
            );
          }
        }
      }
    }
    expect(paragraphCount).toBeGreaterThan(20);
    const emphasis = nodes(document, 'r').find((run) => run.textContent === '三级条款')!;
    for (const property of ['b', 'i', 'u', 'color'])
      expect(first(emphasis, property)).toBeDefined();
  });

  it('defines three automatic numbering levels, their layout and independent restart instances', () => {
    const levels = nodes(numbering, 'lvl').filter((el) => first(el, 'lvlText'));
    for (let level = 0; level < 3; level++) {
      const definition = levels.find(
        (el) =>
          attr(el, 'ilvl') === String(level) &&
          attr(first(el, 'lvlText'), 'val') === ['第%1条', '（%2）', '%3.'][level]
      );
      expect(definition).toBeDefined();
      expect(attr(first(definition!, 'suff'), 'val')).toBe(['nothing', 'space', 'tab'][level]);
      expect(attr(first(definition!, 'start'), 'val')).toBe('1');
    }
    const top = levels.find((el) => attr(first(el, 'lvlText'), 'val') === '第%1条')!;
    expect(['chineseCounting', 'chineseCountingThousand']).toContain(
      attr(first(top, 'numFmt'), 'val')
    );
    expect(first(top, 'b')).toBeDefined();
    expect(attr(first(top, 'rFonts'), 'eastAsia')).toBe('黑体');
    expect(attr(first(top, 'rFonts'), 'ascii')).toBe('Arial');
    expect(attr(first(top, 'rFonts'), 'hAnsi')).toBe('Arial');
    expect(attr(first(top, 'pStyle'), 'val')).toBe('Heading1');
    expect(attr(first(top, 'ind'), 'firstLineChars')).toBe('200');
    expect(attr(first(top, 'ind'), 'leftChars')).toBe('100');
    const nums = nodes(numbering, 'num');
    const referenced = nodes(document, 'numId').map((el) => attr(el, 'val'));
    const usedNums = nums.filter((el) => referenced.includes(attr(el, 'numId')));
    expect(usedNums).toHaveLength(2);
    expect(new Set(usedNums.map((el) => attr(first(el, 'abstractNumId'), 'val'))).size).toBe(1);
    expect(usedNums.some((el) => attr(first(el, 'startOverride'), 'val') === '7')).toBe(true);
    expect(nodes(document, 'ilvl').map((el) => attr(el, 'val'))).toContain('2');
    expect(nodes(document, 't').some((el) => el.textContent?.includes('第一条'))).toBe(false);
  });

  it('writes section geometry, section starts and PAGE fields with outside footer styles', async () => {
    const sections = nodes(document, 'sectPr');
    expect(sections).toHaveLength(2);
    expect(first(settings, 'evenAndOddHeaders')).toBeDefined();
    expect(first(settings, 'updateFields')).toBeUndefined();
    for (const [index, section] of sections.entries()) {
      const input = model.sections[index];
      expect(Number(attr(first(section, 'pgSz'), 'w'))).toBe(Math.round(input.page.widthPt * 20));
      expect(Number(attr(first(section, 'pgSz'), 'h'))).toBe(Math.round(input.page.heightPt * 20));
      for (const side of ['top', 'bottom', 'left', 'right', 'header', 'footer'] as const) {
        expect(attr(first(section, 'pgMar'), side)).toBe(
          String(input.page.margins[`${side}Pt`] * 20)
        );
      }
      expect(attr(first(section, 'pgNumType'), 'start')).toBe(String(input.pageNumber!.restart));
      for (const [type, alignment, indentSide] of [
        ['default', 'right', 'rightChars'],
        ['even', 'left', 'leftChars'],
      ]) {
        const reference = nodes(section, 'footerReference').find(
          (ref) => attr(ref, 'type') === type
        )!;
        expect(reference).toBeDefined();
        const rels = await xml(zip, 'word/_rels/document.xml.rels');
        const relation = Array.from(rels.documentElement.children).find(
          (rel) => rel.getAttribute('Id') === reference.getAttributeNS(R, 'id')
        )!;
        const footer = await xml(
          zip,
          `word/${relation.getAttribute('Target')!.replace(/^\/?word\//, '')}`
        );
        const page = nodes(footer, 'p').find(
          (p) =>
            nodes(p, 'fldSimple').some((field) => /\bPAGE\b/.test(attr(field, 'instr') ?? '')) ||
            /PAGE/.test(p.textContent ?? '')
        )!;
        expect(page).toBeDefined();
        expect(
          nodes(page, 'instrText').some((el) => /\bPAGE\b/.test(el.textContent ?? '')) ||
            nodes(page, 'fldSimple').some((el) => /\bPAGE\b/.test(attr(el, 'instr') ?? ''))
        ).toBe(true);
        expect(
          nodes(page, 't')
            .map((el) => el.textContent)
            .join('')
        ).toContain(index === 0 ? '— ' : '- ');
        const style = findStyle(attr(first(page, 'pStyle'), 'val')!);
        expect(style).toBeDefined();
        expect(attr(first(style, 'jc'), 'val')).toBe(alignment);
        expect(attr(first(style, 'ind'), indentSide)).toBe('100');
        expect(attr(first(style, 'sz'), 'val')).toBe(String(input.pageNumber!.sizePt * 2));
      }
    }
    expect(first(sections[0], 'titlePg')).toBeDefined();
    expect(attr(first(sections[1], 'type'), 'val')).toBe('oddPage');
    expect(attr(first(sections[1], 'pgSz'), 'orient')).toBe('landscape');
  });

  it('writes table widths, horizontal and vertical merges, repeat headers, alignment and borders', () => {
    const table = first(document, 'tbl')!;
    expect(nodes(table, 'gridCol').map((el) => attr(el, 'w'))).toEqual(['1600', '2000', '2400']);
    expect(attr(first(table, 'jc'), 'val')).toBe('center');
    const tableBorders = first(table, 'tblBorders')!;
    for (const edge of ['top', 'bottom', 'left', 'right', 'insideH', 'insideV']) {
      expect(['nil', 'none']).toContain(attr(first(tableBorders, edge), 'val'));
    }
    expect(attr(first(table, 'gridSpan'), 'val')).toBe('2');
    const vertical = nodes(table, 'vMerge');
    expect(vertical).toHaveLength(2);
    expect(attr(vertical[0], 'val')).toBe('restart');
    expect(['', 'continue']).toContain(attr(vertical[1], 'val'));
    expect(nodes(table, 'tr')).toHaveLength(2);
    expect(nodes(table, 'tc').map((cell) => first(cell, 't')?.textContent ?? '')).toEqual([
      '纵向合并',
      '横向合并',
      '',
      '第二列',
      '第三列',
    ]);
    expect(nodes(table, 'tblHeader')).toHaveLength(1);
    expect(attr(first(table, 'trHeight'), 'val')).toBe('600');
    expect(nodes(table, 'vAlign').map((el) => attr(el, 'val'))).toEqual(
      expect.arrayContaining(['center', 'bottom'])
    );
    const explicit = nodes(table, 'tcBorders')
      .flatMap((el) => nodes(el, 'bottom'))
      .find((el) => attr(el, 'val') === 'double')!;
    expect(attr(explicit, 'sz')).toBe('8');
    expect(attr(explicit, 'color')).toBe('225588');
  });

  it('keeps PNG bytes and alpha and writes inline and page-positioned foreground floating images', async () => {
    expect(transparentPng[25]).toBe(6); // RGBA, not an opaque RGB replacement.
    let offset = 8;
    const compressed: Buffer[] = [];
    while (offset < transparentPng.length) {
      const length = transparentPng.readUInt32BE(offset);
      if (transparentPng.toString('ascii', offset + 4, offset + 8) === 'IDAT')
        compressed.push(transparentPng.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    expect(inflateSync(Buffer.concat(compressed))[4]).toBe(0);
    const media = Object.keys(zip.files).filter((path) => /^word\/media\/.*\.png$/.test(path));
    expect(media.length).toBeGreaterThan(0);
    for (const path of media)
      expect(Buffer.from(await zip.file(path)!.async('uint8array'))).toEqual(
        await readFile(imagePath)
      );
    const inline = first(document, 'inline', WP)!;
    expect(inline).toBeDefined();
    expect(first(inline, 'extent', WP).getAttribute('cx')).toBe(String(24 * 12700));
    expect(first(inline, 'extent', WP).getAttribute('cy')).toBe(String(18 * 12700));
    const anchor = first(document, 'anchor', WP)!;
    expect(anchor).toBeDefined();
    expect(['0', 'false']).toContain(anchor.getAttribute('behindDoc') ?? '');
    expect(first(anchor, 'wrapNone', WP)).toBeDefined();
    expect(first(anchor, 'positionH', WP).getAttribute('relativeFrom')).toBe('page');
    expect(first(anchor, 'positionV', WP).getAttribute('relativeFrom')).toBe('page');
    expect(nodes(anchor, 'posOffset', WP).map((el) => el.textContent)).toEqual([
      String(120 * 12700),
      String(200 * 12700),
    ]);
    expect(nodes(document, 'blip', A)).toHaveLength(2);
  });

  it('prefills a real TOC field with styled entries, right dotted page tabs and bookmark links', () => {
    const instructions = nodes(document, 'instrText')
      .map((el) => el.textContent)
      .join(' ');
    expect(instructions).toMatch(/TOC\s+\\o\s+"1-2"\s+\\h\s+\\z\s+\\u/);
    const links = nodes(document, 'hyperlink');
    for (const [index, entry] of model.sections[0].blocks
      .filter((block) => block.type === 'toc')[0]
      .entries.entries()) {
      const link = links.find((el) => attr(el, 'anchor') === entry.bookmark)!;
      expect(link).toBeDefined();
      const p = link.closest('p') ?? link.parentElement!;
      expect(p.textContent).toContain(entry.text);
      expect(p.textContent).toContain(String(entry.page));
      expect(nodes(p, 'tab')).toHaveLength(1);
      expect(attr(first(p, 'pStyle'), 'val')).toBe(`TOC${index + 1}`);
      const tocStyle = findStyle(`TOC${index + 1}`);
      const tab = nodes(tocStyle, 'tab').find((el) => attr(el, 'val') === 'right')!;
      expect(tab).toBeDefined();
      expect(attr(tab, 'leader')).toBe('dot');
    }
    const bookmarks = nodes(document, 'bookmarkStart');
    for (const name of ['general', 'scope'])
      expect(bookmarks.some((el) => attr(el, 'name') === name)).toBe(true);
    const automaticHeading = nodes(document, 'p').find((p) => p.textContent === '自动书签标题')!;
    expect(first(automaticHeading, 'bookmarkStart')).toBeDefined();
    expect(nodes(document, 'bookmarkEnd')).toHaveLength(bookmarks.length);
    expect(first(settings, 'updateFields')).toBeUndefined();
  });

  it('sets zh-CN by default and emits no textboxes or gratuitous empty body paragraphs', () => {
    const defaultProperties = first(styles, 'docDefaults')!;
    expect(attr(first(defaultProperties, 'lang'), 'val')).toBe('zh-CN');
    expect(nodes(document, 'txbxContent')).toHaveLength(0);
    const body = first(document, 'body')!;
    for (const p of Array.from(body.children).filter((el) => el.localName === 'p')) {
      expect(
        (p.textContent ?? '').trim().length > 0 ||
          ['drawing', 'br', 'sectPr', 'fldChar'].some((name) => nodes(p, name).length > 0),
        p.outerHTML
      ).toBe(true);
    }
    expect(
      nodes(document, 'br').some((el) => attr(el, 'type') === 'page') ||
        nodes(document, 'p').some((p) => first(p, 'pageBreakBefore'))
    ).toBe(true);
  });
});

describe('DocModel rendering variants', () => {
  it('uses native thousand counting for Chinese article wording above ninety-nine', async () => {
    const value = createFullExample(imagePath);
    value.numbering[0].levels[0].format = 'chineseCounting';
    const output = await JSZip.loadAsync(await renderDocModel(value));
    const definitions = await xml(output, 'word/numbering.xml');
    expect(nodes(definitions, 'numFmt').map((el) => attr(el, 'val'))).toEqual([
      'chineseCountingThousand',
      'chineseCountingThousand',
      'decimal',
    ]);
  });

  it('rounds fractional font sizes to valid half-point units', async () => {
    const value = createFullExample(imagePath);
    value.styles[0].sizePt = 10.3;
    const output = await JSZip.loadAsync(await renderDocModel(value));
    const stylePart = await xml(output, 'word/styles.xml');
    const normal = nodes(stylePart, 'style').find((style) => attr(style, 'styleId') === 'Normal')!;
    expect(attr(first(normal, 'sz'), 'val')).toBe('21');
    expect(attr(first(normal, 'szCs'), 'val')).toBe('21');
  });

  it('gives TOCs in different width sections separate tab stops through inherited TOC styles', async () => {
    const value = createFullExample(imagePath);
    const originalToc = value.sections[0].blocks.find((block) => block.type === 'toc')!;
    value.sections[1].blocks.push(structuredClone(originalToc));
    const output = await JSZip.loadAsync(await renderDocModel(value));
    const part = await xml(output, 'word/document.xml');
    const stylePart = await xml(output, 'word/styles.xml');
    const definitions = new Map(
      nodes(stylePart, 'style').map((style) => [attr(style, 'styleId'), style])
    );
    const tocParagraphs = nodes(part, 'p').filter((p) => nodes(p, 'hyperlink').length > 0);
    expect(tocParagraphs).toHaveLength(4);
    for (const [index, p] of tocParagraphs.entries()) {
      const section = value.sections[Math.floor(index / 2)];
      const definition = definitions.get(attr(first(p, 'pStyle'), 'val'))!;
      if (index >= 2) {
        expect(attr(first(definition, 'basedOn'), 'val')).toBe(`TOC${(index % 2) + 1}`);
        const inherited = value.sections[0].page;
        const cleared = nodes(definition, 'tab').find((el) => attr(el, 'val') === 'clear')!;
        expect(attr(cleared, 'pos')).toBe(
          String(
            Math.round(
              (inherited.widthPt - inherited.margins.leftPt - inherited.margins.rightPt) * 20
            )
          )
        );
      }
      const stop = nodes(definition, 'tab').find((el) => attr(el, 'val') === 'right')!;
      expect(attr(stop, 'pos')).toBe(
        String(
          Math.round(
            (section.page.widthPt - section.page.margins.leftPt - section.page.margins.rightPt) * 20
          )
        )
      );
    }
  });

  it('preserves an empty middle section without nesting multiple section properties in a paragraph', async () => {
    const input = createFullExample(imagePath);
    const section = input.sections[0];
    input.sections = [
      { ...section, blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: 'A' }] }] },
      { ...section, blocks: [] },
      { ...section, blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: 'B' }] }] },
    ];
    const result = await JSZip.loadAsync(await renderDocModel(input));
    const doc = await xml(result, 'word/document.xml');
    expect(nodes(doc, 'sectPr')).toHaveLength(3);
    for (const pPr of nodes(doc, 'pPr')) expect(nodes(pPr, 'sectPr').length).toBeLessThanOrEqual(1);
    expect(nodes(doc, 'p').filter((p) => ['A', 'B'].includes(p.textContent ?? ''))).toHaveLength(2);
  });

  it('honors en-US and normalizes aliased built-in styles and every style reference', async () => {
    const input = createFullExample(imagePath);
    input.settings = { language: 'en-US' };
    const heading = input.styles.find((style) => style.id === 'Heading1')!;
    heading.id = 'MyHeading';
    heading.name = 'heading 1';
    for (const section of input.sections) {
      for (const block of section.blocks) {
        if (block.type === 'p' && block.styleId === 'Heading1') block.styleId = 'MyHeading';
      }
    }
    input.numbering[0].levels[0].styleId = 'MyHeading';
    const result = await JSZip.loadAsync(await renderDocModel(input));
    const resultStyles = await xml(result, 'word/styles.xml');
    const resultDocument = await xml(result, 'word/document.xml');
    const resultNumbering = await xml(result, 'word/numbering.xml');
    expect(attr(first(first(resultStyles, 'docDefaults'), 'lang'), 'val')).toBe('en-US');
    const matching = nodes(resultStyles, 'style').filter(
      (style) => attr(style, 'styleId') === 'Heading1'
    );
    expect(matching).toHaveLength(1);
    expect(attr(first(matching[0], 'name'), 'val')).toBe('heading 1');
    expect(
      nodes(resultStyles, 'style').some((style) => attr(style, 'styleId') === 'MyHeading')
    ).toBe(false);
    expect(
      nodes(resultDocument, 'pStyle').some((style) => attr(style, 'val') === 'MyHeading')
    ).toBe(false);
    expect(attr(first(resultNumbering, 'pStyle'), 'val')).toBe('Heading1');
  });

  it('supports center, inside, left and right page placements and continuous section starts', async () => {
    const input = createFullExample(imagePath);
    const template = input.sections[1];
    input.sections = (['center', 'inside', 'left', 'right'] as const).map((placement, index) => ({
      ...template,
      startType: index === 0 ? 'nextPage' : 'continuous',
      pageNumber: { ...template.pageNumber!, placement, outsideIndentChars: 1 },
    }));
    const result = await JSZip.loadAsync(await renderDocModel(input));
    const resultDocument = await xml(result, 'word/document.xml');
    const resultStyles = await xml(result, 'word/styles.xml');
    const rels = await xml(result, 'word/_rels/document.xml.rels');
    const sections = nodes(resultDocument, 'sectPr');
    expect(sections).toHaveLength(4);
    const expected = [
      ['center', 'center'],
      ['left', 'right'],
      ['left', 'left'],
      ['right', 'right'],
    ];
    for (const [index, section] of sections.entries()) {
      if (index) expect(attr(first(section, 'type'), 'val')).toBe('continuous');
      for (const [footerType, column] of [
        ['default', 0],
        ['even', 1],
      ] as const) {
        const ref = nodes(section, 'footerReference').find(
          (el) => attr(el, 'type') === footerType
        )!;
        expect(ref).toBeDefined();
        const relation = Array.from(rels.documentElement.children).find(
          (rel) => rel.getAttribute('Id') === ref.getAttributeNS(R, 'id')
        )!;
        const footer = await xml(
          result,
          `word/${relation.getAttribute('Target')!.replace(/^\/?word\//, '')}`
        );
        const p = nodes(footer, 'p').find((el) =>
          nodes(el, 'fldSimple').some((field) => /PAGE/.test(attr(field, 'instr')))
        )!;
        const styleId = attr(first(p, 'pStyle'), 'val');
        const style = nodes(resultStyles, 'style').find((el) => attr(el, 'styleId') === styleId)!;
        expect(attr(first(style, 'jc'), 'val')).toBe(expected[index][column]);
      }
    }
  });

  it('preserves explicit table borders and margin-relative images behind text', async () => {
    const input = createFullExample(imagePath);
    input.sections = [input.sections[0]];
    const edge = { sizePt: 0.75, color: '123ABC', style: 'single' as const };
    input.sections[0].blocks = [
      {
        type: 'table',
        columnsPt: [100],
        align: 'left',
        borders: { top: edge, bottom: edge, left: edge, right: edge, insideH: edge, insideV: edge },
        rows: [
          {
            cells: [
              {
                blocks: [{ type: 'p', styleId: 'TableText', runs: [{ text: '有框表格' }] }],
                borders: { top: edge, bottom: edge, left: edge, right: edge },
                vAlign: 'top',
              },
            ],
          },
        ],
      },
      {
        type: 'image',
        path: imagePath,
        widthPt: 20,
        heightPt: 20,
        floating: {
          xPt: -3,
          yPt: 5,
          xRelativeTo: 'margin',
          yRelativeTo: 'margin',
          wrap: 'none',
          inFront: false,
        },
      },
    ];
    const result = await JSZip.loadAsync(await renderDocModel(input));
    const doc = await xml(result, 'word/document.xml');
    for (const border of [
      ...Array.from(first(doc, 'tblBorders')!.children),
      ...Array.from(first(doc, 'tcBorders')!.children),
    ]) {
      expect(attr(border, 'val')).toBe('single');
      expect(attr(border, 'sz')).toBe('6');
      expect(attr(border, 'color')).toBe('123ABC');
    }
    expect(attr(first(doc, 'vAlign'), 'val')).toBe('top');
    const anchor = first(doc, 'anchor', WP)!;
    expect(['1', 'true']).toContain(anchor.getAttribute('behindDoc') ?? '');
    expect(first(anchor, 'positionH', WP).getAttribute('relativeFrom')).toBe('margin');
    expect(first(anchor, 'positionV', WP).getAttribute('relativeFrom')).toBe('margin');
    expect(nodes(anchor, 'posOffset', WP).map((el) => el.textContent)).toEqual([
      String(-3 * 12700),
      String(5 * 12700),
    ]);
  });

  it('does not create empty paragraph placeholders between ordinary sections', async () => {
    const input = createFullExample(imagePath);
    const section = input.sections[0];
    input.sections = [
      { ...section, blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '第一节内容' }] }] },
      {
        ...section,
        startType: 'nextPage',
        blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '第二节内容' }] }],
      },
    ];
    const result = await JSZip.loadAsync(await renderDocModel(input));
    const doc = await xml(result, 'word/document.xml');
    const body = first(doc, 'body')!;
    const paragraphs = Array.from(body.children).filter((el) => el.localName === 'p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs.map((p) => p.textContent)).toEqual(['第一节内容', '第二节内容']);
    expect(nodes(doc, 'sectPr')).toHaveLength(2);
  });
});

describe('declared page breaks', () => {
  it('break on the following paragraph so a page-filling table cannot leave a blank page', async () => {
    const input = createFullExample(imagePath);
    const numbered = input.sections[0].blocks.find(
      (block) => block.type === 'p' && block.numbering
    )!;
    const table = input.sections[0].blocks.find((block) => block.type === 'table')!;
    input.sections = [
      {
        ...input.sections[0],
        blocks: [
          table,
          { type: 'pageBreak' },
          { type: 'p', styleId: 'Normal', runs: [{ text: '下一页标题' }] },
          { type: 'pageBreak' },
          numbered,
          { type: 'pageBreak' },
          table,
        ],
      },
    ];
    const doc = await xml(await JSZip.loadAsync(await renderDocModel(input)), 'word/document.xml');
    const body = Array.from(first(doc, 'body')!.children);
    const breakBefore = body.filter((el) => first(el, 'pageBreakBefore'));
    expect(breakBefore.map((p) => p.textContent)).toEqual([
      '下一页标题',
      (numbered as { runs: { text: string }[] }).runs.map((run) => run.text).join(''),
    ]);
    const pPr = Array.from(breakBefore[1].children).find((el) => el.localName === 'pPr')!;
    expect(Array.from(pPr.children).map((el) => el.localName)).toEqual([
      'pStyle',
      'pageBreakBefore',
      'numPr',
    ]);
    // Only the break before a table still needs its own paragraph.
    expect(nodes(doc, 'br').filter((br) => attr(br, 'type') === 'page')).toHaveLength(1);
  });
});
