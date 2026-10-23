import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Document, LevelFormat, Packer, Paragraph } from 'docx';
import { renderDocModel } from './render.js';
import type { DocModel, NumberingDef } from './types.js';

const formats = ['chineseCounting', 'chineseCountingThousand'] as const;
const timeoutMs = 120_000;

async function command(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${executable} timed out after ${timeoutMs}ms\n${output}`));
    }, timeoutMs);
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

export async function numberingToolsAvailable(): Promise<boolean> {
  for (const executable of ['soffice', 'pdftotext']) {
    try {
      await command(executable, executable === 'soffice' ? ['--version'] : ['-v']);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }
  return true;
}

/** Chinese regulation numbering deliberately omits the initial 一 in 十 / 十一. */
export function chineseArticleNumber(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 120) throw new Error('Expected 1..120');
  const digits = '零一二三四五六七八九';
  if (value < 10) return digits[value];
  if (value < 20) return `十${value % 10 ? digits[value % 10] : ''}`;
  if (value < 100)
    return `${digits[Math.floor(value / 10)]}十${value % 10 ? digits[value % 10] : ''}`;
  if (value === 100) return '一百';
  if (value < 110) return `一百零${digits[value % 10]}`;
  return `一百${digits[Math.floor((value % 100) / 10)]}十${value % 10 ? digits[value % 10] : ''}`;
}

function acceptance(text: string): void {
  const compact = text.replace(/\s/g, '');
  for (let index = 1; index <= 120; index++) {
    const expected = `第${chineseArticleNumber(index)}条`;
    if (!compact.includes(`${expected}正文序号${index}结束`)) {
      throw new Error(`Missing correctly rendered article ${index}: ${expected}`);
    }
  }
  if (!compact.includes('第一条重新起算标记'))
    throw new Error('Second numbering instance did not restart at 1');
  if (compact.includes('第一十一条') || compact.includes('第一十条')) {
    throw new Error('Chinese regulation numbering incorrectly starts ten with 一十');
  }
}

function createNumberingModel(format: NumberingDef['levels'][number]['format']): DocModel {
  return {
    version: 1,
    styles: [
      {
        id: 'Normal',
        name: 'Normal',
        builtIn: true,
        font: { eastAsia: 'Songti SC', ascii: 'Times New Roman' },
        sizePt: 12,
        align: 'left',
        lineSpacing: { rule: 'exact', pt: 18 },
      },
    ],
    numbering: [
      { id: 'articles', levels: [{ level: 0, format, text: '第%1条', start: 1, suffix: 'space' }] },
    ],
    numberingInstances: [
      { id: 'first', numberingId: 'articles' },
      { id: 'second', numberingId: 'articles', restartAt: 1 },
    ],
    sections: [
      {
        page: {
          widthPt: 595.3,
          heightPt: 841.9,
          orientation: 'portrait',
          margins: { topPt: 40, bottomPt: 40, leftPt: 40, rightPt: 40, headerPt: 15, footerPt: 15 },
        },
        blocks: [
          ...Array.from({ length: 120 }, (_, index) => ({
            type: 'p' as const,
            styleId: 'Normal',
            runs: [{ text: `正文序号${index + 1}结束` }],
            numbering: { instanceId: 'first', level: 0 },
          })),
          {
            type: 'p',
            styleId: 'Normal',
            runs: [{ text: '重新起算标记' }],
            numbering: { instanceId: 'second', level: 0 },
          },
        ],
      },
    ],
  };
}

export interface NumberingRenderResult {
  directory: string;
  probes: Array<{ requestedFormat: string; passed: boolean; error?: string }>;
  rendered: Array<{ requestedFormat: string; passed: boolean; error?: string }>;
}

/** Keeps DOCX, PDF, extracted text and command logs under TMPDIR for inspection. */
export async function checkNumberingRendering(): Promise<NumberingRenderResult> {
  const root = process.env.TMPDIR ?? tmpdir();
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'formaldoc-numbering-'));
  const profile = join(root, 'lo-profile');
  await mkdir(profile, { recursive: true });
  const result: NumberingRenderResult = { directory, probes: [], rendered: [] };
  async function convert(name: string, buffer: Buffer): Promise<string> {
    const input = join(directory, `${name}.docx`);
    await writeFile(input, buffer);
    try {
      const output = await command('soffice', [
        '--headless',
        `-env:UserInstallation=${pathToFileURL(profile).href}`,
        '--convert-to',
        'pdf',
        '--outdir',
        directory,
        input,
      ]);
      await writeFile(join(directory, `${name}.soffice.log`), output);
      const extraction = await command('pdftotext', [
        join(directory, `${name}.pdf`),
        join(directory, `${name}.txt`),
      ]);
      await writeFile(join(directory, `${name}.pdftotext.log`), extraction);
      return await readFile(join(directory, `${name}.txt`), 'utf8');
    } catch (error) {
      await writeFile(join(directory, `${name}.failure.log`), String(error));
      throw error;
    }
  }
  for (const format of formats) {
    // Raw library documents establish LibreOffice's interpretation independently of renderer remapping.
    const probe = new Document({
      numbering: {
        config: [
          {
            reference: 'articles',
            levels: [
              {
                level: 0,
                format:
                  format === 'chineseCounting'
                    ? LevelFormat.CHINESE_COUNTING
                    : LevelFormat.CHINESE_COUNTING_THOUSAND,
                text: '第%1条',
                start: 1,
              },
            ],
          },
        ],
      },
      sections: [
        {
          children: [
            ...Array.from(
              { length: 120 },
              (_, index) =>
                new Paragraph({
                  text: `正文序号${index + 1}结束`,
                  numbering: { reference: 'articles', level: 0, instance: 0 },
                })
            ),
            new Paragraph({
              text: '重新起算标记',
              numbering: { reference: 'articles', level: 0, instance: 1 },
            }),
          ],
        },
      ],
    });
    try {
      acceptance(await convert(`probe-${format}`, await Packer.toBuffer(probe)));
      result.probes.push({ requestedFormat: format, passed: true });
    } catch (error) {
      result.probes.push({ requestedFormat: format, passed: false, error: String(error) });
    }
    try {
      acceptance(
        await convert(`docmodel-${format}`, await renderDocModel(createNumberingModel(format)))
      );
      result.rendered.push({ requestedFormat: format, passed: true });
    } catch (error) {
      result.rendered.push({ requestedFormat: format, passed: false, error: String(error) });
    }
  }
  await writeFile(join(directory, 'result.json'), JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!(await numberingToolsAvailable())) {
    console.log('SKIP: soffice or pdftotext is unavailable.');
  } else {
    const result = await checkNumberingRendering();
    console.log(JSON.stringify(result, null, 2));
    if (result.rendered.some((entry) => !entry.passed)) process.exitCode = 1;
  }
}
