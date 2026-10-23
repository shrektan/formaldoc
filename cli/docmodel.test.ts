import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = join(import.meta.dir, 'index.ts');
let directory: string;
let input: string;
const run = (...args: string[]) =>
  spawnSync(process.execPath, ['run', cli, ...args], { encoding: 'utf8' });

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'formaldoc-docmodel-cli-'));
  input = join(directory, 'document.json');
  writeFileSync(
    input,
    JSON.stringify({
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
      numbering: [],
      numberingInstances: [],
      sections: [
        {
          page: {
            widthPt: 595,
            heightPt: 842,
            orientation: 'portrait',
            margins: {
              topPt: 40,
              bottomPt: 40,
              leftPt: 40,
              rightPt: 40,
              headerPt: 20,
              footerPt: 20,
            },
          },
          blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: 'DocModel CLI 正文' }] }],
        },
      ],
    })
  );
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('DocModel CLI', () => {
  it('writes a DOCX from a JSON file with explicit output', () => {
    const output = join(directory, 'explicit.docx');
    const result = run('--docmodel', input, '-o', output);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Successfully created');
    expect(readFileSync(output).subarray(0, 2).toString()).toBe('PK');
  });

  it('defaults output to the JSON filename with a DOCX extension', () => {
    const result = run('--docmodel', input);
    expect(result.status).toBe(0);
    expect(existsSync(join(directory, 'document.docx'))).toBe(true);
  });

  it('rejects Markdown file input and stdin in either argument order', () => {
    for (const args of [
      [input, '--docmodel', input],
      ['--docmodel', input, 'input.md'],
      ['--docmodel', input, '--stdin'],
    ]) {
      const result = run(...args);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('mutually exclusive');
    }
  });

  it('rejects missing arguments and repeated DocModel inputs', () => {
    for (const args of [
      ['--docmodel'],
      ['--docmodel', '-o', 'out.docx'],
      ['--docmodel', input, '--docmodel', input],
    ]) {
      const result = run(...args);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('--docmodel requires exactly one JSON file');
    }
  });

  it('reports schema paths and does not produce a file on validation failure', () => {
    const invalid = join(directory, 'invalid.json');
    const output = join(directory, 'invalid.docx');
    writeFileSync(invalid, JSON.stringify({ version: 2 }));
    const result = run('--docmodel', invalid, '-o', output);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('version');
    expect(existsSync(output)).toBe(false);
  });

  it('lists the DocModel option in help', () => {
    expect(run('--help').stdout).toContain('--docmodel');
  });
});
