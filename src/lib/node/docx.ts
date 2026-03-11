import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractTitle, sanitizeFilename } from '../filename.js';
import { generateDocxBuffer } from '../docx/generator.js';
import {
  DEFAULT_TEMPLATE,
  getTemplate,
  getTemplateNames,
  isValidTemplateName,
} from '../styles/templates.js';
import { initDomPolyfill } from './dom-polyfill.js';
import type { StyleSettings, TemplateName } from '../../types/styles.js';

initDomPolyfill();

export interface ConvertMarkdownToDocxOptions {
  markdown?: string;
  inputPath?: string;
  templateName?: string;
  outputPath?: string;
  fileName?: string;
  workingDirectory?: string;
  styleOverrides?: Partial<StyleSettings>;
}

export interface ConvertMarkdownToDocxResult {
  outputPath: string;
  templateName: TemplateName;
  title: string | null;
  fileSize: number;
  buffer: Buffer;
  sourcePath: string | null;
}

export interface ConvertMarkdownToDocxBufferResult {
  templateName: TemplateName;
  title: string | null;
  fileSize: number;
  buffer: Buffer;
  sourcePath: string | null;
}

export interface TemplateSummary {
  id: TemplateName;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: 'chinese' | 'english';
}

export function resolveTemplateName(templateName?: string): TemplateName {
  if (!templateName) {
    return DEFAULT_TEMPLATE;
  }

  if (!isValidTemplateName(templateName)) {
    const available = getTemplateNames().join(', ');
    throw new Error(`Unknown template "${templateName}". Available templates: ${available}`);
  }

  return templateName;
}

export function getAvailableTemplateSummaries(): TemplateSummary[] {
  return getTemplateNames().map((templateName) => {
    const template = getTemplate(templateName);

    return {
      id: template.id,
      name: template.name,
      nameEn: template.nameEn,
      description: template.description,
      descriptionEn: template.descriptionEn,
      category: template.category,
    };
  });
}

function resolveDefaultFileName(
  markdown: string,
  fileName?: string
): { fileName: string; title: string | null } {
  if (fileName && fileName.trim()) {
    const normalized = fileName.trim().endsWith('.docx')
      ? fileName.trim()
      : `${fileName.trim()}.docx`;

    return {
      fileName: sanitizeFilename(normalized.replace(/\.docx$/i, '')) + '.docx',
      title: null,
    };
  }

  const title = extractTitle(markdown.trim());
  const baseName = title
    ? sanitizeFilename(title)
    : `document-${new Date().toISOString().slice(0, 10)}`;

  return {
    fileName: `${baseName}.docx`,
    title,
  };
}

function resolveOutputPath(
  markdown: string,
  options: ConvertMarkdownToDocxOptions
): {
  outputPath: string;
  title: string | null;
} {
  const workingDirectory = options.workingDirectory ?? process.cwd();

  if (options.outputPath?.trim()) {
    return {
      outputPath: resolve(workingDirectory, options.outputPath.trim()),
      title: extractTitle(markdown.trim()),
    };
  }

  const configuredExportDirectory = process.env.FORMALDOC_EXPORT_DIR?.trim();
  const exportDirectory =
    configuredExportDirectory || resolve(homedir(), 'Documents', 'FormalDoc Exports');
  const { fileName, title } = resolveDefaultFileName(markdown, options.fileName);

  return {
    outputPath: resolve(exportDirectory, fileName),
    title,
  };
}

async function resolveMarkdownInput(
  options: ConvertMarkdownToDocxOptions
): Promise<{ markdown: string; sourcePath: string | null }> {
  const workingDirectory = options.workingDirectory ?? process.cwd();

  if (options.inputPath?.trim()) {
    const sourcePath = resolve(workingDirectory, options.inputPath.trim());
    const markdown = (await readFile(sourcePath, 'utf-8')).trim();

    if (!markdown) {
      throw new Error(`Input file is empty: ${sourcePath}`);
    }

    return {
      markdown,
      sourcePath,
    };
  }

  const markdown = options.markdown?.trim();
  if (!markdown) {
    throw new Error('Markdown content or inputPath is required.');
  }

  return {
    markdown,
    sourcePath: null,
  };
}

export async function convertMarkdownToDocx(
  options: ConvertMarkdownToDocxOptions
): Promise<ConvertMarkdownToDocxBufferResult> {
  const { markdown, sourcePath } = await resolveMarkdownInput(options);

  const templateName = resolveTemplateName(options.templateName);
  const template = getTemplate(templateName);
  const { title } = resolveOutputPath(markdown, options);
  const styles = options.styleOverrides
    ? { ...template.styles, ...options.styleOverrides }
    : template.styles;

  const buffer = await generateDocxBuffer(markdown, styles, template.documentSettings);

  return {
    templateName,
    title,
    fileSize: buffer.length,
    buffer,
    sourcePath,
  };
}

export async function convertMarkdownToDocxFile(
  options: ConvertMarkdownToDocxOptions
): Promise<ConvertMarkdownToDocxResult> {
  const conversion = await convertMarkdownToDocx(options);
  const sourceMarkdown =
    options.markdown?.trim() ??
    (conversion.sourcePath ? await readFile(conversion.sourcePath, 'utf-8') : '');
  const { outputPath } = resolveOutputPath(sourceMarkdown, options);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, conversion.buffer);

  return {
    outputPath,
    ...conversion,
  };
}

export function ensureDocxExtension(path: string): string {
  return extname(path).toLowerCase() === '.docx' ? path : `${path}.docx`;
}

export function toFileUri(path: string): string {
  return pathToFileURL(path).toString();
}
