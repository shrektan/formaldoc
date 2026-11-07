import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
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
        font: { eastAsia: '宋体', ascii: 'Arial' },
        sizePt: 11,
        align: 'left',
        lineSpacing: { rule: 'exact', pt: 14 },
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
          { type: 'p', styleId: 'Normal', runs: [{ text: '表前正文' }] },
          {
            type: 'table',
            columnsPt: [80, 80, 80],
            borders: {},
            rows: [
              {
                cells: [
                  { blocks: [], colSpan: 2, rowSpan: 2 },
                  { blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '无底色' }] }] },
                ],
              },
              { cells: [{ blocks: [] }] },
            ],
          },
          { type: 'p', styleId: 'Normal', runs: [{ text: '表后正文' }] },
        ],
      },
    ],
  };
}

const table = (value: DocModel) => value.sections[0].blocks[1] as TableBlock;
const documentXml = async (value: DocModel) => {
  const zip = await JSZip.loadAsync(await renderDocModel(value));
  return zip.file('word/document.xml')!.async('string');
};

test('cell backgroundColor accepts only six-digit RGB and preserves omission', () => {
  const value = model();
  expect(parseDocModel(value)).toEqual(value);
  expect(
    Object.prototype.hasOwnProperty.call(
      table(parseDocModel(value)).rows[0].cells[0],
      'backgroundColor'
    )
  ).toBe(false);
  for (const backgroundColor of ['DDEEDD', 'abcdef', '000000', 'FFFFFF']) {
    Object.assign(table(value).rows[0].cells[0], { backgroundColor });
    expect(parseDocModel(value)).toEqual(value);
  }
  for (const backgroundColor of [
    '',
    '#DDEEDD',
    'FFF',
    'DDEEDDFF',
    'GGGGGG',
    'DDEEDD\n',
    ' DDEEDD',
    null,
    123456,
  ]) {
    Object.assign(table(value).rows[0].cells[0], { backgroundColor });
    expect(() => parseDocModel(value)).toThrow(
      'sections[0].blocks[1].rows[0].cells[0].backgroundColor'
    );
  }
});

test('cell shading covers horizontal and vertical merges and stays local to its cell', async () => {
  const value = model();
  Object.assign(table(value).rows[0].cells[0], { backgroundColor: 'DDEEDD' });
  Object.assign(table(value).rows[1].cells[0], { backgroundColor: 'abcdef' });
  const xml = await documentXml(value);
  const cells = [...xml.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map(([cell]) => cell);
  expect(cells).toHaveLength(4);
  expect(cells[0]).toContain('<w:gridSpan w:val="2"/>');
  expect(cells[0]).toContain('<w:vMerge w:val="restart"/>');
  expect(cells[2]).toContain('<w:vMerge w:val="continue"/>');
  for (const index of [0, 2]) {
    expect(cells[index]).toMatch(
      /<w:tcPr>[\s\S]*<w:shd w:fill="DDEEDD" w:color="auto" w:val="clear"\/>[\s\S]*<\/w:tcPr>/
    );
  }
  expect(cells[1]).not.toContain('<w:shd');
  expect(cells[3]).toContain('<w:shd w:fill="abcdef" w:color="auto" w:val="clear"/>');
  const withoutShading = xml.replace(/<w:shd\b[^>]*\/>/g, '');
  expect(withoutShading).toBe(await documentXml(model()));
});

test('omitted cell background preserves the pre-shading document XML byte for byte', async () => {
  const xml = await documentXml(model());
  expect(xml).not.toContain('<w:shd');
  // Captured from the unmodified renderer, including merged cells and surrounding paragraphs.
  expect(createHash('sha256').update(xml).digest('hex')).toBe(
    '26e03e998d233fe5324edfd7e8beb0942da2b73ac85c17d61d7756a2ecf24060'
  );
});
