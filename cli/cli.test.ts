import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = join(__dirname, 'index.ts');

function runCli(args: string): string {
  try {
    // Redirect stderr to stdout to capture warnings
    return execSync(`bun run ${CLI_PATH} ${args} 2>&1`, {
      encoding: 'utf-8',
      cwd: join(__dirname, '..'),
    });
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string };
    return execError.stdout || execError.stderr || '';
  }
}

describe('CLI', () => {
  describe('help and version', () => {
    it('should show help with --help', () => {
      const output = runCli('--help');

      expect(output).toContain('FormalDoc CLI');
      expect(output).toContain('USAGE:');
      expect(output).toContain('OPTIONS:');
    });

    it('should show help with -h', () => {
      const output = runCli('-h');

      expect(output).toContain('FormalDoc CLI');
    });

    it('should show version with --version', () => {
      const output = runCli('--version');

      expect(output).toContain('formaldoc v');
    });

    it('should show version with -v', () => {
      const output = runCli('-v');

      expect(output).toContain('formaldoc v');
    });
  });

  describe('file conversion', () => {
    const testDir = tmpdir();
    const inputFile = join(testDir, 'test-input.md');
    const outputFile = join(testDir, 'test-output.docx');

    beforeEach(() => {
      // Create test input file
      writeFileSync(inputFile, '# Test Document\n\nThis is a test.');
    });

    afterEach(() => {
      // Clean up test files
      if (existsSync(inputFile)) unlinkSync(inputFile);
      if (existsSync(outputFile)) unlinkSync(outputFile);
    });

    it('should convert markdown file to docx', () => {
      const output = runCli(`${inputFile} -o ${outputFile}`);

      expect(output).toContain('Successfully created');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should create valid docx file', () => {
      runCli(`${inputFile} -o ${outputFile}`);

      const buffer = readFileSync(outputFile);
      // DOCX files are ZIP archives starting with PK signature
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    });

    it('should handle Chinese content', () => {
      writeFileSync(inputFile, '# 中文标题\n\n这是中文内容。');
      const output = runCli(`${inputFile} -o ${outputFile}`);

      expect(output).toContain('Successfully created');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should handle markdown with formulas', () => {
      writeFileSync(inputFile, '# Math Test\n\n$$E = mc^2$$');
      const output = runCli(`${inputFile} -o ${outputFile}`);

      expect(output).toContain('Successfully created');
    });

    it('should handle complex markdown', () => {
      const markdown = `# 工作报告

## 一、背景

这是正文。

- 要点一
- 要点二

| 列A | 列B |
|-----|-----|
| 1 | 2 |
`;
      writeFileSync(inputFile, markdown);
      const output = runCli(`${inputFile} -o ${outputFile}`);

      expect(output).toContain('Successfully created');
    });
  });

  describe('custom styles', () => {
    const testDir = tmpdir();
    const inputFile = join(testDir, 'test-styles-input.md');
    const outputFile = join(testDir, 'test-styles-output.docx');
    const stylesFile = join(testDir, 'custom-styles.json');

    beforeEach(() => {
      writeFileSync(inputFile, '# Custom Style Test');
    });

    afterEach(() => {
      if (existsSync(inputFile)) unlinkSync(inputFile);
      if (existsSync(outputFile)) unlinkSync(outputFile);
      if (existsSync(stylesFile)) unlinkSync(stylesFile);
    });

    it('should accept custom styles file', () => {
      const customStyles = {
        title: { font: '黑体', size: 24, bold: true, center: true },
      };
      writeFileSync(stylesFile, JSON.stringify(customStyles));

      const output = runCli(`${inputFile} -o ${outputFile} -s ${stylesFile}`);

      expect(output).toContain('Successfully created');
    });
  });

  describe('error handling', () => {
    it('should error on missing input file', () => {
      const output = runCli('/nonexistent/file.md -o /tmp/out.docx');

      expect(output).toContain('Error');
    });

    it('should error when --stdin used without -o', () => {
      const output = runCli('--stdin');

      expect(output).toContain('Error');
      expect(output).toContain('--stdin requires -o');
    });

    it('should show error for no input', () => {
      const output = runCli('');

      expect(output).toContain('Error');
    });
  });

  describe('template selection', () => {
    const testDir = tmpdir();
    const inputFile = join(testDir, 'test-template-input.md');
    const outputFile = join(testDir, 'test-template-output.docx');
    const stylesFile = join(testDir, 'template-styles.json');

    beforeEach(() => {
      writeFileSync(inputFile, '# Test Document\n\nThis is a test.');
    });

    afterEach(() => {
      if (existsSync(inputFile)) unlinkSync(inputFile);
      if (existsSync(outputFile)) unlinkSync(outputFile);
      if (existsSync(stylesFile)) unlinkSync(stylesFile);
    });

    it('should show template info in help', () => {
      const output = runCli('--help');

      expect(output).toContain('TEMPLATES:');
      expect(output).toContain('cn-gov');
      expect(output).toContain('en-standard');
      expect(output).toContain('-t, --template');
    });

    it('should convert with en-standard template', () => {
      const output = runCli(`${inputFile} -o ${outputFile} -t en-standard`);

      expect(output).toContain('Successfully created');
      expect(output).toContain('en-standard');
      expect(existsSync(outputFile)).toBe(true);

      // Verify it's a valid DOCX
      const buffer = readFileSync(outputFile);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('should convert with cn-gov template explicitly', () => {
      const output = runCli(`${inputFile} -o ${outputFile} -t cn-gov`);

      expect(output).toContain('Successfully created');
      expect(output).toContain('cn-gov');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should use --template long form', () => {
      const output = runCli(`${inputFile} -o ${outputFile} --template en-standard`);

      expect(output).toContain('Successfully created');
      expect(output).toContain('en-standard');
    });

    it('should warn on invalid template and use default', () => {
      const output = runCli(`${inputFile} -o ${outputFile} -t invalid-template`);

      expect(output).toContain('Warning');
      expect(output).toContain('invalid-template');
      expect(output).toContain('cn-gov');
      expect(output).toContain('Successfully created');
    });

    it('should use default template when -t not specified', () => {
      const output = runCli(`${inputFile} -o ${outputFile}`);

      expect(output).toContain('cn-gov');
      expect(output).toContain('Successfully created');
    });

    it('should combine template with custom styles', () => {
      // Create custom styles that override some settings
      const customStyles = {
        title: { font: 'Georgia', size: 28, bold: true, center: true },
      };
      writeFileSync(stylesFile, JSON.stringify(customStyles));

      const output = runCli(`${inputFile} -o ${outputFile} -t en-standard -s ${stylesFile}`);

      expect(output).toContain('Successfully created');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should handle English content with English template', () => {
      const englishContent = `# Project Report

## Executive Summary

This document outlines our quarterly performance.

### Key Metrics

1. Revenue increased by 15%
2. Customer satisfaction at 92%

| Quarter | Revenue | Growth |
|---------|---------|--------|
| Q1 | $1.2M | 12% |
| Q2 | $1.4M | 15% |
`;
      writeFileSync(inputFile, englishContent);
      const output = runCli(`${inputFile} -o ${outputFile} -t en-standard`);

      expect(output).toContain('Successfully created');
      expect(existsSync(outputFile)).toBe(true);
    });
  });
});
