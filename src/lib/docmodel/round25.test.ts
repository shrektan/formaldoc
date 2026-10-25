import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { renderDocModel } from './render.js';
import { parseDocModel, type DocModel, type StyleDef } from './types.js';

const normal: StyleDef = {
  id: 'Normal',
  name: 'Normal',
  builtIn: true,
  next: 'Normal',
  font: { eastAsia: '宋体', ascii: 'Times New Roman' },
  sizePt: 10.5,
  align: 'justify',
  lineSpacing: { rule: 'exact', pt: 16 },
  spaceBeforePt: 0,
  spaceAfterPt: 0,
  snapToGrid: false,
};
const pageNumber = {
  format: '%PAGE%',
  font: { eastAsia: '宋体', ascii: 'Times New Roman' },
  sizePt: 9,
  placement: 'outside' as const,
  outsideIndentChars: 1,
};
const legacy = (): DocModel => ({
  version: 1,
  styles: [normal],
  numbering: [],
  numberingInstances: [],
  sections: [
    {
      page: {
        widthPt: 595,
        heightPt: 842,
        orientation: 'portrait',
        margins: { topPt: 72, bottomPt: 72, leftPt: 90, rightPt: 90, headerPt: 28, footerPt: 28 },
      },
      pageNumber,
      blocks: [
        { type: 'p', styleId: 'Normal', runs: [{ text: '正文' }] },
        { type: 'math', latex: 'a+b', numberText: '(1)' },
        {
          type: 'table',
          columnsPt: [200],
          borders: {},
          rows: [
            {
              header: true,
              cells: [{ blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '表头' }] }] }],
            },
            { cells: [{ blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '内容' }] }] }] },
          ],
        },
      ],
    },
  ],
  settings: { evenAndOddHeaders: true },
});
const parts = async (model: DocModel) => {
  const zip = await JSZip.loadAsync(await renderDocModel(parseDocModel(model)));
  const names = Object.keys(zip.files).filter((name) =>
    /^word\/(document|styles|footer\d+|header\d+)\.xml$/.test(name)
  );
  return Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await zip.file(name)!.async('string')]))
  );
};

describe('DocModel declared writer styles and final table rows', () => {
  it('writes declared page-number and equation styles exactly as it would generate them', async () => {
    const declared = legacy();
    const pageNumberStyle = (id: string, align: 'left' | 'right'): StyleDef => ({
      ...normal,
      id,
      name: id,
      builtIn: false,
      next: undefined,
      font: pageNumber.font,
      sizePt: pageNumber.sizePt,
      align,
      keepNext: false,
      pageBreakBefore: false,
      indent: align === 'right' ? { rightChars: 1 } : { leftChars: 1 },
    });
    const contentWidth = 595 - 180;
    declared.styles.push(
      ...[1, 2, 3].map((level) => ({
        ...normal,
        id: `TOC${level}`,
        name: `toc ${level}`,
        builtIn: true,
      })),
      pageNumberStyle('DocModelPageNumber1', 'right'),
      pageNumberStyle('DocModelPageNumber2', 'left'),
      {
        ...normal,
        id: 'DocModelEquation3',
        name: '公式',
        builtIn: false,
        align: 'left',
        lineSpacing: { rule: 'atLeast', pt: normal.sizePt * 1.2 },
        indent: { firstLineChars: 0, leftChars: 0, rightChars: 0 },
        keepNext: false,
        pageBreakBefore: false,
        tabs: [
          { type: 'center', posPt: contentWidth / 2 },
          { type: 'right', posPt: contentWidth },
        ],
      }
    );
    const section = declared.sections[0]!;
    section.pageNumber = {
      ...pageNumber,
      styleIds: { default: 'DocModelPageNumber1', even: 'DocModelPageNumber2' },
    };
    const math = section.blocks[1]!;
    if (math.type !== 'math') throw new Error('Expected math');
    math.paragraphStyleId = 'DocModelEquation3';
    expect(await parts(declared)).toEqual(await parts(legacy()));
  });

  it('writes final row flags as declared instead of recomputing them', async () => {
    const rows = (model: DocModel) => {
      const table = model.sections[0]!.blocks[2]!;
      if (table.type !== 'table') throw new Error('Expected table');
      // A 300pt repeating header exceeds a third of the 698pt body area.
      table.rows[0]!.heightPt = 300;
      return model;
    };
    const written = async (model: DocModel) => {
      const document = (await parts(model))['word/document.xml']!;
      return {
        header: (document.match(/<w:tblHeader\b/g) ?? []).length,
        cantSplit: (document.match(/<w:cantSplit\b/g) ?? []).length,
      };
    };
    // Legacy callers: the writer drops the unsafe header and defaults cantSplit on.
    expect(await written(rows(legacy()))).toEqual({ header: 0, cantSplit: 2 });
    const final = rows(legacy());
    final.settings = { ...final.settings, tableRowsFinal: true };
    expect(await written(final)).toEqual({ header: 1, cantSplit: 0 });
    const table = final.sections[0]!.blocks[2]!;
    if (table.type !== 'table') throw new Error('Expected table');
    table.rows[1]!.cantSplit = true;
    expect(await written(final)).toEqual({ header: 1, cantSplit: 1 });
  });
});
