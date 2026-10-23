import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fixture from './fixtures/round7-single-level.json';
import { numberingToolsAvailable } from './numbering-check.js';
import { renderDocModel } from './render.js';
import { parseDocModel } from './types.js';

export const createSingleLevelRegulationModel = () => parseDocModel(fixture.model);
const compact = (text: string) => text.normalize('NFKC').replace(/\s/gu, '');

/** Real paragraph openings identify labels in reading order without relying on lvlRestart. */
export function assertSingleLevelNumberingText(text: string): void {
  const rendered = compact(text);
  let position = 0;
  for (const paragraph of fixture.expected) {
    const marker = compact(paragraph.label + paragraph.body.slice(0, 4));
    const found = rendered.indexOf(marker, position);
    if (found < 0)
      throw new Error(
        `Missing rendered label ${paragraph.label} before ${paragraph.body.slice(0, 12)}`
      );
    position = found + marker.length;
  }
  const secondChapter = rendered.indexOf(compact('第二章机构的设立'));
  const sixthArticle = rendered.indexOf(compact('第六条设立信托公司'), secondChapter);
  if (secondChapter < 0 || sixthArticle < secondChapter)
    throw new Error('The first article in chapter 2 must be 第六条');
  const twelfthArticle = rendered.indexOf(compact('第十二条信托公司有下列'));
  const restartedItem = rendered.indexOf(compact('（一）变更名称'), twelfthArticle);
  if (twelfthArticle < 0 || restartedItem < twelfthArticle)
    throw new Error('Items under article 12 must restart at （一）');
}

async function command(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${executable} timed out after 120000ms\n${output}`));
    }, 120_000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else reject(new Error(`${executable} exited ${code ?? signal}\n${output}`));
    });
  });
}

export async function checkSingleLevelNumberingRendering(): Promise<{
  directory: string;
  passed: boolean;
  error?: string;
}> {
  const root = process.env.TMPDIR ?? tmpdir();
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'formaldoc-single-level-'));
  const input = join(directory, 'single-level.docx');
  await writeFile(input, await renderDocModel(createSingleLevelRegulationModel()));
  const profile = join(directory, 'lo-profile');
  await mkdir(profile);
  let result: { directory: string; passed: boolean; error?: string };
  try {
    const conversion = await command('soffice', [
      '--headless',
      `-env:UserInstallation=${pathToFileURL(profile).href}`,
      '--convert-to',
      'pdf',
      '--outdir',
      directory,
      input,
    ]);
    await writeFile(join(directory, 'soffice.log'), conversion);
    const extraction = await command('pdftotext', [
      '-layout',
      join(directory, 'single-level.pdf'),
      join(directory, 'single-level.txt'),
    ]);
    await writeFile(join(directory, 'pdftotext.log'), extraction);
    assertSingleLevelNumberingText(await readFile(join(directory, 'single-level.txt'), 'utf8'));
    result = { directory, passed: true };
  } catch (error) {
    result = { directory, passed: false, error: String(error) };
    await writeFile(join(directory, 'failure.log'), String(error));
  }
  await writeFile(join(directory, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!(await numberingToolsAvailable()))
    throw new Error('Unverified: soffice or pdftotext is unavailable');
  const result = await checkSingleLevelNumberingRendering();
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
