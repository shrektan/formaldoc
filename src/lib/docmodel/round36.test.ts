import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { renderDocModel } from './render.js';
import { paragraphBlockSchema, parseDocModel, type DocModel } from './types.js';

const model = (): DocModel => ({
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
        {
          type: 'table',
          columnsPt: [200],
          borders: {},
          rows: [
            { cells: [{ blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '父项' }] }] }] },
            {
              cells: [
                {
                  blocks: [
                    {
                      type: 'p',
                      styleId: 'Normal',
                      runs: [{ text: '子项' }],
                      indent: { leftChars: 3 },
                    },
                  ],
                },
              ],
            },
            {
              cells: [
                {
                  blocks: [
                    {
                      type: 'p',
                      styleId: 'Normal',
                      runs: [{ text: '123' }],
                      indent: { rightChars: 1.5 },
                    },
                  ],
                },
              ],
            },
            {
              cells: [
                { blocks: [{ type: 'p', styleId: 'Normal', runs: [], indent: { leftChars: 0 } }] },
              ],
            },
          ],
        },
      ],
    },
  ],
});

test('R36 paragraph insets accept only finite nonnegative left/right character values', () => {
  const p = { type: 'p', styleId: 'Normal', runs: [] };
  expect(
    paragraphBlockSchema.safeParse({ ...p, indent: { leftChars: 3, rightChars: 0 } }).success
  ).toBe(true);
  for (const indent of [
    { leftChars: -1 },
    { rightChars: Infinity },
    { leftChars: NaN },
    { leftChars: '3' },
    { firstLineChars: 1 },
  ])
    expect(paragraphBlockSchema.safeParse({ ...p, indent }).success).toBe(false);
});

test('R36 writes direct character and twip insets at the owning style size without new styles', async () => {
  const source = model();
  const zip = await JSZip.loadAsync(await renderDocModel(parseDocModel(source)));
  const xml = await zip.file('word/document.xml')!.async('string');
  const ps = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  expect(ps.find((p) => p.includes('父项'))).not.toContain('<w:ind');
  expect(ps.find((p) => p.includes('子项'))).toContain('<w:ind w:leftChars="300" w:left="660"/>');
  expect(ps.find((p) => p.includes('123'))).toContain('<w:ind w:rightChars="150" w:right="330"/>');
  expect(xml).toContain('<w:ind w:leftChars="0" w:left="0"/>');
  const styles = await zip.file('word/styles.xml')!.async('string');
  expect(styles).not.toContain('leftChars="300"');
  expect(source.styles).toHaveLength(1);
});
