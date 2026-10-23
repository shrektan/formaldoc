import type { DocModel, StyleDef } from '../types.js';

// A two-by-two PNG with transparent and translucent RGBA pixels; it is deliberately retained byte for byte.
export const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP4z8DA8B+EgEQDkM0AADJiBH2WbOtLAAAAAElFTkSuQmCC',
  'base64'
);

export function createFullExample(imagePath: string): DocModel {
  const font = { eastAsia: '仿宋_GB2312', ascii: 'Times New Roman' };
  const style = (id: string, name: string, extra: Partial<StyleDef> = {}): StyleDef => ({
    id,
    name,
    font,
    sizePt: 16,
    align: 'justify',
    lineSpacing: { rule: 'exact', pt: 28 },
    ...extra,
  });
  const page = {
    widthPt: 595.3,
    heightPt: 841.9,
    orientation: 'portrait' as const,
    margins: { topPt: 37, bottomPt: 35, leftPt: 28, rightPt: 26, headerPt: 14, footerPt: 18 },
  };
  return {
    version: 1,
    styles: [
      style('Normal', 'Normal', { builtIn: true, indent: { firstLineChars: 2 } }),
      ...[1, 2, 3, 4].map((level) =>
        style(`Heading${level}`, `heading ${level}`, {
          builtIn: true,
          outlineLevel: (level - 1) as 0 | 1 | 2 | 3,
          bold: true,
          keepNext: true,
          basedOn: 'Normal',
          next: 'Normal',
          ...(level === 1 ? { indent: { firstLineChars: 2, leftChars: 1 } } : {}),
        })
      ),
      style('Title', 'Title', { builtIn: true, align: 'center', sizePt: 22 }),
      ...[1, 2, 3].map((level) => style(`TOC${level}`, `TOC ${level}`, { builtIn: true })),
      style('Signature', '落款', {
        align: 'right',
        indent: { firstLineChars: 1.5, hangingChars: 0.5, leftChars: 2, rightChars: 1 },
        lineSpacing: { rule: 'multiple', value: 1.5 },
        spaceBeforePt: 6,
        spaceAfterPt: 3,
        color: '123456',
        pageBreakBefore: true,
        snapToGrid: true,
      }),
      style('TableText', '表格正文', { sizePt: 12, lineSpacing: { rule: 'exact', pt: 18 } }),
    ],
    numbering: [
      {
        id: 'regulation',
        levels: [
          {
            level: 0,
            format: 'chineseCountingThousand',
            text: '第%1条',
            start: 1,
            suffix: 'nothing',
            styleId: 'Heading1',
            run: { bold: true, font: { eastAsia: '黑体', ascii: 'Arial' } },
            indent: { firstLineChars: 2, leftChars: 1 },
          },
          {
            level: 1,
            format: 'chineseCounting',
            text: '（%2）',
            start: 1,
            suffix: 'space',
            indent: { hangingChars: 1, leftChars: 2 },
          },
          { level: 2, format: 'decimal', text: '%3.', start: 1, suffix: 'tab' },
        ],
      },
    ],
    numberingInstances: [
      { id: 'articles', numberingId: 'regulation' },
      { id: 'restart', numberingId: 'regulation', restartAt: 7 },
    ],
    sections: [
      {
        page,
        pageNumber: {
          format: '— %PAGE% —',
          font,
          sizePt: 14,
          placement: 'outside',
          outsideIndentChars: 1,
          restart: 1,
          hideOnFirstPage: true,
        },
        header: [{ type: 'p', styleId: 'Normal', runs: [{ text: '页眉内容' }] }],
        footer: [{ type: 'p', styleId: 'Signature', runs: [{ text: '附加页脚' }] }],
        blocks: [
          { type: 'p', styleId: 'Title', runs: [{ text: '规章示例' }] },
          {
            type: 'toc',
            title: { text: '目录', styleId: 'Title' },
            levels: [1, 2],
            entries: [
              { text: '总则', level: 1, page: 1, bookmark: 'general' },
              { text: '适用范围', level: 2, page: 2, bookmark: 'scope' },
            ],
          },
          {
            type: 'p',
            styleId: 'Heading1',
            bookmark: 'general',
            runs: [{ text: '总则' }],
            numbering: { instanceId: 'articles', level: 0 },
          },
          {
            type: 'p',
            styleId: 'Heading2',
            bookmark: 'scope',
            runs: [{ text: '适用范围' }],
            numbering: { instanceId: 'articles', level: 1 },
          },
          {
            type: 'p',
            styleId: 'Normal',
            runs: [
              { text: '三级条款', bold: true, italic: true, underline: true, color: 'AA1122' },
            ],
            numbering: { instanceId: 'articles', level: 2 },
            anchors: [
              {
                type: 'image',
                path: imagePath,
                widthPt: 60,
                heightPt: 40,
                floating: { xPt: 120, yPt: 200, relativeTo: 'page', wrap: 'none', inFront: true },
              },
            ],
          },
          {
            type: 'table',
            columnsPt: [80, 100, 120],
            align: 'center',
            borders: {},
            rows: [
              {
                header: true,
                heightPt: 30,
                cells: [
                  {
                    rowSpan: 2,
                    vAlign: 'center',
                    borders: { bottom: { sizePt: 1, color: '225588', style: 'double' } },
                    blocks: [{ type: 'p', styleId: 'TableText', runs: [{ text: '纵向合并' }] }],
                  },
                  {
                    colSpan: 2,
                    vAlign: 'bottom',
                    blocks: [{ type: 'p', styleId: 'TableText', runs: [{ text: '横向合并' }] }],
                  },
                ],
              },
              {
                cells: [
                  { blocks: [{ type: 'p', styleId: 'TableText', runs: [{ text: '第二列' }] }] },
                  { blocks: [{ type: 'p', styleId: 'TableText', runs: [{ text: '第三列' }] }] },
                ],
              },
            ],
          },
          { type: 'image', path: imagePath, widthPt: 24, heightPt: 18 },
          { type: 'pageBreak' },
          { type: 'p', styleId: 'Heading3', runs: [{ text: '自动书签标题' }] },
          { type: 'p', styleId: 'Heading4', runs: [{ text: '四级标题' }] },
          { type: 'p', styleId: 'Signature', runs: [{ text: '签署单位' }] },
        ],
      },
      {
        page: { ...page, widthPt: 841.9, heightPt: 595.3, orientation: 'landscape' },
        startType: 'oddPage',
        pageNumber: {
          format: '- %PAGE% -',
          font,
          sizePt: 12,
          placement: 'outside',
          outsideIndentChars: 1,
          restart: 3,
        },
        blocks: [
          {
            type: 'p',
            styleId: 'Heading1',
            runs: [{ text: '重新起算章节' }],
            numbering: { instanceId: 'restart', level: 0 },
          },
        ],
      },
    ],
  };
}
