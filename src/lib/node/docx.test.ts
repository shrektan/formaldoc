import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  convertMarkdownToDocxFile,
  getAvailableTemplateSummaries,
  resolveTemplateName,
} from './docx';

const createdPaths = new Set<string>();

afterEach(async () => {
  await Promise.all(
    Array.from(createdPaths).map(async (path) => {
      if (existsSync(path)) {
        await unlink(path);
      }
    })
  );

  const exportDir = join(tmpdir(), 'formaldoc-node-test-exports');
  if (existsSync(exportDir)) {
    await rm(exportDir, { recursive: true, force: true });
  }

  createdPaths.clear();
});

describe('node docx helpers', () => {
  it('should convert markdown into a docx file', async () => {
    const outputPath = join(tmpdir(), 'formaldoc-node-test.docx');
    createdPaths.add(outputPath);

    const result = await convertMarkdownToDocxFile({
      markdown: '# Test Document\n\nThis is a test.',
      outputPath,
    });

    expect(result.outputPath).toBe(outputPath);
    expect(result.templateName).toBe('cn-gov');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('should create a default export path when outputPath is omitted', async () => {
    const workingDirectory = tmpdir();
    const result = await convertMarkdownToDocxFile({
      markdown: '# 自动命名文档\n\n正文内容。',
      workingDirectory,
      fileName: 'formal-result',
    });

    createdPaths.add(result.outputPath);
    expect(result.outputPath).toContain('formaldoc-exports');
    expect(result.outputPath.endsWith('formal-result.docx')).toBe(true);
  });

  it('should expose template summaries for MCP clients', () => {
    const templates = getAvailableTemplateSummaries();

    expect(templates.some((template) => template.id === 'cn-gov')).toBe(true);
    expect(templates.some((template) => template.id === 'en-standard')).toBe(true);
  });

  it('should reject invalid template names', () => {
    expect(() => resolveTemplateName('unknown-template')).toThrow('Unknown template');
  });
});
