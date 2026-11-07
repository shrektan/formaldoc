import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { renderDocModel } from './render.js';
import { parseDocModel, type DocModel } from './types.js';

function model(characterSpacingPt?: number): DocModel {
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
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        font: { eastAsia: '黑体', ascii: 'Arial' },
        sizePt: 22,
        color: '1F3864',
        align: 'center',
        lineSpacing: { rule: 'multiple', value: 1 },
        ...(characterSpacingPt === undefined ? {} : { characterSpacingPt }),
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
        blocks: [{ type: 'p', styleId: 'Title', runs: [{ text: '员工手册' }] }],
      },
    ],
  };
}

const titleStyle = async (value: DocModel) => {
  const zip = await JSZip.loadAsync(await renderDocModel(parseDocModel(value)));
  const styles = await zip.file('word/styles.xml')!.async('string');
  return /<w:style\b[^>]*w:styleId="Title"[\s\S]*?<\/w:style>/.exec(styles)![0];
};

test('style characterSpacingPt is written as w:spacing in schema order (after color, before sz)', async () => {
  const style = await titleStyle(model(13.5));
  expect(style).toContain('<w:color w:val="1F3864"/><w:spacing w:val="270"/><w:sz w:val="44"/>');
});

test('omitting characterSpacingPt writes no run spacing', async () => {
  expect(await titleStyle(model())).not.toContain('<w:spacing w:val');
});
