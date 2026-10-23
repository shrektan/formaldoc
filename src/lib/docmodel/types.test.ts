import { describe, expect, it } from 'bun:test';
import { parseDocModel, type DocModel, type ParagraphBlock } from './types.js';

function model(): DocModel {
  return {
    version: 1,
    styles: [
      {
        id: 'Normal',
        name: 'Normal',
        builtIn: true,
        font: { eastAsia: '宋体', ascii: 'Times New Roman' },
        sizePt: 12,
        align: 'left',
        lineSpacing: { rule: 'exact', pt: 24 },
      },
    ],
    numbering: [
      {
        id: 'articles',
        levels: [
          { level: 0, format: 'chineseCounting', text: '第%1条', start: 1, suffix: 'space' },
        ],
      },
    ],
    numberingInstances: [{ id: 'first', numberingId: 'articles' }],
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
            type: 'p',
            styleId: 'Normal',
            runs: [{ text: '正文' }],
            numbering: { instanceId: 'first', level: 0 },
          },
        ],
      },
    ],
  };
}

function paragraph(value: DocModel): ParagraphBlock {
  return value.sections[0].blocks[0] as ParagraphBlock;
}

describe('DocModel parsing', () => {
  it('accepts both decoded values and JSON strings without mutating input', () => {
    const value = model();
    expect(parseDocModel(value)).toEqual(value);
    expect(parseDocModel(JSON.stringify(value))).toEqual(value);
    expect(parseDocModel(value)).not.toBe(value);
  });

  it('rejects malformed JSON with an explicit diagnostic', () => {
    expect(() => parseDocModel('{')).toThrow('Invalid DocModel JSON');
  });

  it('rejects direct formatting and unknown keys instead of dropping them', () => {
    const value = model();
    Object.assign(paragraph(value), { align: 'center' });
    expect(() => parseDocModel(value)).toThrow('sections[0].blocks[0]');
    expect(() => parseDocModel(value)).toThrow('align');
  });

  it('reports nested field paths and invalid scalar values', () => {
    const value = model();
    value.styles[0].font.eastAsia = 42 as unknown as string;
    expect(() => parseDocModel(value)).toThrow('styles[0].font.eastAsia');
    value.styles[0].font.eastAsia = '宋体';
    value.styles[0].sizePt = Number.POSITIVE_INFINITY;
    expect(() => parseDocModel(value)).toThrow('styles[0].sizePt');
  });

  it('rejects unknown paragraph styles and numbering references', () => {
    const value = model();
    paragraph(value).styleId = 'missing';
    paragraph(value).numbering = { instanceId: 'unknown', level: 0 };
    expect(() => parseDocModel(value)).toThrow('sections[0].blocks[0].styleId');
    expect(() => parseDocModel(value)).toThrow('numbering.instanceId');
    paragraph(value).numbering = { instanceId: 'first', level: 1 };
    expect(() => parseDocModel(value)).toThrow('numbering.level');
  });

  it('rejects duplicate IDs, duplicate numbering levels, and cycles', () => {
    const value = model();
    value.styles.push({ ...value.styles[0] });
    expect(() => parseDocModel(value)).toThrow('Duplicate id');
    value.styles.pop();
    value.styles[0].basedOn = 'Normal';
    expect(() => parseDocModel(value)).toThrow('Cyclic style inheritance');
    delete value.styles[0].basedOn;
    value.numbering[0].levels.push({ ...value.numbering[0].levels[0] });
    expect(() => parseDocModel(value)).toThrow('Duplicate numbering level');
  });

  it('requires explicit numbering indentation to match its linked style', () => {
    const value = model();
    value.styles[0].indent = { firstLineChars: 2 };
    value.numbering[0].levels[0].styleId = 'Normal';
    value.numbering[0].levels[0].indent = { firstLineChars: 1 };
    expect(() => parseDocModel(value)).toThrow('numbering[0].levels[0].indent.firstLineChars');
    value.numbering[0].levels[0].indent = { firstLineChars: 2 };
    expect(parseDocModel(value)).toEqual(value);
  });

  it('requires outline metadata for heading styles', () => {
    const value = model();
    value.styles.push({ ...value.styles[0], id: 'Heading1', name: 'heading 1' });
    expect(() => parseDocModel(value)).toThrow('styles[1].outlineLevel');
  });

  it('resolves explicit and automatically generated heading bookmarks', () => {
    const value = model();
    value.styles.push({ ...value.styles[0], id: 'Heading1', name: 'heading 1', outlineLevel: 0 });
    const title: ParagraphBlock = { type: 'p', styleId: 'Heading1', runs: [{ text: '第一章' }] };
    value.sections[0].blocks.unshift(title);
    value.sections[0].blocks.push({
      type: 'toc',
      levels: [1, 2],
      entries: [{ text: '第一章', level: 1, page: 1, bookmark: '_heading_1' }],
    });
    expect(parseDocModel(value)).toEqual(value);
    title.bookmark = 'chapter';
    expect(() => parseDocModel(value)).toThrow('Unknown bookmark: _heading_1');
    const toc = value.sections[0].blocks.at(-1);
    if (toc?.type === 'toc') toc.entries[0].bookmark = 'chapter';
    expect(parseDocModel(value)).toEqual(value);
    paragraph(value).bookmark = 'chapter';
    value.sections[0].blocks.push({ type: 'p', styleId: 'Normal', bookmark: 'chapter', runs: [] });
    expect(() => parseDocModel(value)).toThrow('Duplicate bookmark');
  });

  it('checks merged table coverage, collisions, and row bounds', () => {
    const value = model();
    const table = {
      type: 'table' as const,
      columnsPt: [80, 80],
      borders: {},
      rows: [{ cells: [{ blocks: [], rowSpan: 2 }, { blocks: [] }] }, { cells: [{ blocks: [] }] }],
    };
    value.sections[0].blocks.push(table);
    expect(parseDocModel(value)).toEqual(value);
    table.rows[1].cells = [];
    expect(() => parseDocModel(value)).toThrow('Cells do not cover');
    table.rows[1].cells = [{ blocks: [], rowSpan: 2 }];
    expect(() => parseDocModel(value)).toThrow('Cell exceeds the table row count');
  });

  it('rejects relative image paths and image dimension errors', () => {
    const value = model();
    value.sections[0].blocks.push({ type: 'image', path: 'seal.png', widthPt: 0, heightPt: 20 });
    expect(() => parseDocModel(value)).toThrow('Image path must be absolute');
    expect(() => parseDocModel(value)).toThrow('widthPt');
  });
});
