import { describe, expect, it } from 'bun:test';
import {
  checkNumberingRendering,
  chineseArticleNumber,
  numberingToolsAvailable,
} from './numbering-check.js';

const available = await numberingToolsAvailable();

describe('Chinese article numbering rendered by LibreOffice', () => {
  it('uses the Chinese regulation forms at ten, hundreds and intervening zero', () => {
    expect([1, 10, 11, 20, 21, 100, 101, 110, 111, 120].map(chineseArticleNumber)).toEqual([
      '一',
      '十',
      '十一',
      '二十',
      '二十一',
      '一百',
      '一百零一',
      '一百一十',
      '一百一十一',
      '一百二十',
    ]);
  });

  it.skipIf(!available)(
    'renders all 120 articles and a restarted instance for both requested Chinese formats',
    async () => {
      const result = await checkNumberingRendering();
      expect(result.rendered, `Numbering evidence: ${result.directory}`).toHaveLength(2);
      for (const rendered of result.rendered) {
        expect(
          rendered.passed,
          `${rendered.requestedFormat}: ${rendered.error ?? result.directory}`
        ).toBe(true);
      }
    },
    600_000
  );
});
