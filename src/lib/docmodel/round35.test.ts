import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { renderDocModel } from './render.js';
import { parseDocModel, type DocModel, type TableBlock } from './types.js';

function model(): DocModel {
  return {
    version: 1,
    styles: [
      {
        id: 'Normal',
        name: 'Normal',
        font: { eastAsia: '宋体', ascii: 'Times New Roman' },
        sizePt: 8,
        align: 'left',
        lineSpacing: { rule: 'exact', pt: 10 },
      },
    ],
    numbering: [],
    numberingInstances: [],
    sections: [
      {
        page: {
          widthPt: 595,
          heightPt: 842,
          orientation: 'portrait',
          margins: { topPt: 50, bottomPt: 50, leftPt: 50, rightPt: 50, headerPt: 20, footerPt: 20 },
        },
        blocks: [
          {
            type: 'table',
            columnsPt: [30],
            borders: {},
            rows: [
              {
                cells: [{ blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '–0.50' }] }] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

const table = (value: DocModel): TableBlock => value.sections[0]!.blocks[0] as TableBlock;
const documentXml = async (value: DocModel) => {
  const zip = await JSZip.loadAsync(await renderDocModel(parseDocModel(value)));
  return zip.file('word/document.xml')!.async('string');
};

describe('DocModel source-measured table cell margins', () => {
  it('accepts optional finite nonnegative horizontal margins, including zero', () => {
    for (const margins of [{ leftPt: 0, rightPt: 1.25 }, { leftPt: 2 }, { rightPt: 0 }, {}]) {
      const value = model();
      Object.assign(table(value), { cellMargins: margins });
      expect(parseDocModel(value)).toEqual(value);
    }
  });

  it('rejects negative, nonfinite, nonnumeric and unknown margin fields', () => {
    for (const margins of [
      { leftPt: -1 },
      { rightPt: Infinity },
      { leftPt: NaN },
      { rightPt: '1' },
      { topPt: 1 },
    ]) {
      const value = model();
      Object.assign(table(value), { cellMargins: margins });
      expect(() => parseDocModel(value)).toThrow('cellMargins');
    }
  });

  it('writes horizontal twips on table properties and retains an explicit zero', async () => {
    const value = model();
    Object.assign(table(value), { cellMargins: { leftPt: 0, rightPt: 1.25 } });
    const xml = await documentXml(value);
    const properties = xml.match(/<w:tblPr>.*?<\/w:tblPr>/s)?.[0];
    expect(properties).toContain('<w:tblCellMar>');
    expect(properties).toContain('<w:left w:type="dxa" w:w="0"/>');
    expect(properties).toContain('<w:right w:type="dxa" w:w="25"/>');
    expect(xml).not.toContain('<w:tcMar');
    expect(xml).toContain('–0.50');
  });

  it('preserves Word defaults for an undeclared side or table', async () => {
    const value = model();
    expect(await documentXml(value)).not.toContain('<w:tblCellMar');
    Object.assign(table(value), { cellMargins: { leftPt: 1.5 } });
    const xml = await documentXml(value);
    const margins = xml.match(/<w:tblCellMar>.*?<\/w:tblCellMar>/s)?.[0];
    expect(margins).toContain('<w:left w:type="dxa" w:w="30"/>');
    expect(margins).not.toContain('<w:right');
    expect(margins).not.toContain('<w:top');
    expect(margins).not.toContain('<w:bottom');
    expect(xml).not.toContain('<w:tcMar');
  });
});
