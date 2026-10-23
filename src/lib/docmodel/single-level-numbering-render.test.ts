import { expect, test } from 'bun:test';
import { numberingToolsAvailable } from './numbering-check.js';
import { checkSingleLevelNumberingRendering } from './single-level-numbering-check.js';

const available = await numberingToolsAvailable();
test.skipIf(!available)(
  'round7 LibreOffice renders article6 across chapter2 and restarts article12 items at one',
  async () => {
    const result = await checkSingleLevelNumberingRendering();
    expect(
      result.passed,
      `Unverified render evidence ${result.directory}: ${result.error ?? ''}`
    ).toBe(true);
  },
  180_000
);
