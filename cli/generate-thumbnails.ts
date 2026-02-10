#!/usr/bin/env bun
/**
 * Generate template thumbnails using LibreOffice + pdftoppm.
 *
 * Requirements:
 * - LibreOffice (soffice)
 * - poppler-utils (pdftoppm)
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { initDomPolyfill } from './dom-polyfill';
import { generateDocxBuffer } from '../src/lib/docx/generator';
import { getTemplateNames, getTemplate } from '../src/lib/styles/templates';
import { examples } from '../src/i18n/examples';

initDomPolyfill();
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const [first] = args;
  if (typeof first === 'string' && /^Type not supported: (span|annotation)$/.test(first)) {
    return;
  }
  originalWarn(...args);
};

const OUTPUT_DIR = join(process.cwd(), 'public', 'thumbnails');
const TEMP_DIR = join(tmpdir(), 'formaldoc-thumbnails');
const SOFFICE_PROFILE_DIR = join(TEMP_DIR, 'soffice-profile');
const THUMB_WIDTH = Number(process.env.THUMB_WIDTH ?? 960);
const THUMB_DPI = Number(process.env.THUMB_DPI ?? 220);

if (!Number.isFinite(THUMB_WIDTH) || THUMB_WIDTH < 320) {
  console.error('Invalid THUMB_WIDTH. Use an integer >= 320.');
  process.exit(1);
}
if (!Number.isFinite(THUMB_DPI) || THUMB_DPI < 72) {
  console.error('Invalid THUMB_DPI. Use an integer >= 72.');
  process.exit(1);
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureCommand(command: string, args: string[], help: string) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  if (result.status !== 0) {
    console.error(help);
    process.exit(1);
  }
}

ensureCommand(
  'soffice',
  ['--version'],
  'Missing LibreOffice. Install and ensure `soffice` is in PATH.'
);
ensureCommand(
  'pdftoppm',
  ['-h'],
  'Missing poppler-utils. Install `pdftoppm` and ensure it is in PATH.'
);

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(TEMP_DIR, { recursive: true });
mkdirSync(SOFFICE_PROFILE_DIR, { recursive: true });

for (const templateId of getTemplateNames()) {
  const template = getTemplate(templateId);
  const markdown = template.category === 'chinese' ? examples.cn : examples.en;

  const docxPath = join(TEMP_DIR, `${templateId}.docx`);
  const pdfPath = join(TEMP_DIR, `${templateId}.pdf`);
  const outputPrefix = join(OUTPUT_DIR, templateId);

  const buffer = await generateDocxBuffer(markdown, template.styles, template.documentSettings);
  writeFileSync(docxPath, buffer);

  run('soffice', [
    '--headless',
    '--nologo',
    '--nofirststartwizard',
    `-env:UserInstallation=file://${SOFFICE_PROFILE_DIR}`,
    '--convert-to',
    'pdf',
    '--outdir',
    TEMP_DIR,
    docxPath,
  ]);
  run('pdftoppm', [
    '-png',
    '-singlefile',
    '-f',
    '1',
    '-l',
    '1',
    '-r',
    String(THUMB_DPI),
    '-scale-to-x',
    String(THUMB_WIDTH),
    '-scale-to-y',
    '-1',
    pdfPath,
    outputPrefix,
  ]);

  if (existsSync(docxPath)) {
    rmSync(docxPath, { force: true });
  }
  if (existsSync(pdfPath)) {
    rmSync(pdfPath, { force: true });
  }
}

console.log(`Thumbnails generated in ${OUTPUT_DIR}`);
