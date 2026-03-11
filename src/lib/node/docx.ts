import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
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
  markdown: string;
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

  const exportDirectory =
    process.env.FORMALDOC_EXPORT_DIR ?? resolve(workingDirectory, 'formaldoc-exports');
  const { fileName, title } = resolveDefaultFileName(markdown, options.fileName);

  return {
    outputPath: resolve(exportDirectory, fileName),
    title,
  };
}

export async function convertMarkdownToDocxFile(
  options: ConvertMarkdownToDocxOptions
): Promise<ConvertMarkdownToDocxResult> {
  const markdown = options.markdown.trim();
  if (!markdown) {
    throw new Error('Markdown content is required.');
  }

  const templateName = resolveTemplateName(options.templateName);
  const template = getTemplate(templateName);
  const { outputPath, title } = resolveOutputPath(markdown, options);
  const styles = options.styleOverrides
    ? { ...template.styles, ...options.styleOverrides }
    : template.styles;

  const buffer = await generateDocxBuffer(markdown, styles, template.documentSettings);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return {
    outputPath,
    templateName,
    title,
    fileSize: buffer.length,
  };
}

export function ensureDocxExtension(path: string): string {
  return extname(path).toLowerCase() === '.docx' ? path : `${path}.docx`;
}
