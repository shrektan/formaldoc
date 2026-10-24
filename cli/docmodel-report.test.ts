import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fixture from '../src/lib/docmodel/fixtures/round8-xml-characters.json';
import { createFullExample } from '../src/lib/docmodel/fixtures/full-example.js';

const cli = join(import.meta.dir, 'index.ts');
let directory: string;
let input: string;
const run = (...args: string[]) =>
  spawnSync(process.execPath, ['run', cli, ...args], { encoding: 'utf8' });
beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'formaldoc-report-'));
  input = join(directory, 'document.json');
  const m = createFullExample('/unused.png');
  m.styles = [m.styles[0]];
  m.numbering = [];
  m.numberingInstances = [];
  m.sections = [
    {
      page: m.sections[0].page,
      blocks: fixture.lines.map((l) => ({
        type: 'p',
        styleId: 'Normal',
        runs: [{ text: l.text }],
      })),
    },
  ];
  writeFileSync(input, JSON.stringify(m));
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));

test('DocModel CLI writes this render filter report alongside the DOCX', () => {
  const output = join(directory, 'safe.docx');
  const report = join(directory, 'writer-report.json');
  const result = run('--docmodel', input, '-o', output, '--docmodel-report', report);
  expect(result.status, result.stderr).toBe(0);
  expect(existsSync(report)).toBe(true);
  expect(JSON.parse(readFileSync(report, 'utf8'))).toEqual({
    xmlCharactersFiltered: 5,
    sourceXmlCharactersFiltered: 5,
    xmlPartsCharactersFiltered: {},
  });
  expect(readFileSync(output).subarray(0, 2).toString()).toBe('PK');
});

test('DocModel CLI report flag needs DocModel and exactly one output path', () => {
  const report = join(directory, 'unexpected-report.json');
  for (const args of [
    ['--docmodel-report', report],
    ['--docmodel', input, '--docmodel-report'],
    ['--docmodel', input, '--docmodel-report', report, '--docmodel-report', report],
  ]) {
    const result = run(...args);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--docmodel-report');
  }
  expect(existsSync(report)).toBe(false);
});

test('DocModel report cannot overwrite its input JSON or output DOCX', () => {
  const before = readFileSync(input, 'utf8');
  const output = join(directory, 'protected.docx');
  for (const report of [input, output]) {
    const result = run('--docmodel', input, '-o', output, '--docmodel-report', report);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('must differ');
  }
  expect(readFileSync(input, 'utf8')).toBe(before);
  expect(existsSync(output)).toBe(false);
});
