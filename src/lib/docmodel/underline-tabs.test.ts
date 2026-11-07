import { expect, test } from 'bun:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { renderDocModel, renderDocModelToFile } from './render.js';
import { createFullExample } from './fixtures/full-example.js';
import { parseDocModel } from './types.js';

test('native underscore leaders use tab elements in both writers and a standard ZIP package', async () => {
  const value = createFullExample('/unused.png');
  value.styles[0]!.tabs = [{ type: 'left', posPt: 150, leader: 'underscore' }];
  value.sections[0]!.blocks = [
    {
      type: 'p',
      styleId: value.styles[0]!.id,
      runs: [{ text: '联系人：' }, { text: '\t', underline: true }, { text: '后续' }],
    },
  ];
  value.sections = value.sections.slice(0, 1);
  const parsed = parseDocModel(value);
  const dir = await mkdtemp(join(tmpdir(), 'leader-'));
  const path = join(dir, 'out.docx');
  await renderDocModelToFile(parsed, path);
  const buffer = await renderDocModel(parsed);
  for (const bytes of [buffer, await readFile(path)]) {
    const z = await JSZip.loadAsync(bytes);
    const doc = await z.file('word/document.xml')!.async('string');
    const styles = await z.file('word/styles.xml')!.async('string');
    expect(doc).toContain('<w:tab/>');
    expect(doc).not.toContain('<w:t xml:space="preserve">\t</w:t>');
    expect(styles).toContain('w:leader="underscore" w:pos="3000"');
  }
  expect(spawnSync('unzip', ['-t', path], { encoding: 'utf8' }).status).toBe(0);
});
