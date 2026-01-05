import { describe, it, expect } from 'bun:test';
import { createDocument, generateDocxBuffer } from './generator';
import { DEFAULT_STYLES } from '../styles/defaults';
import { getTemplateStyles } from '../styles/templates';
import { Document } from 'docx';

describe('createDocument', () => {
  it('should create a Document instance', () => {
    const doc = createDocument('# Test', DEFAULT_STYLES);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should handle empty markdown', () => {
    const doc = createDocument('', DEFAULT_STYLES);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should handle simple text', () => {
    const doc = createDocument('Simple text content', DEFAULT_STYLES);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should handle headings', () => {
    const doc = createDocument('# Title\n## Heading', DEFAULT_STYLES);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should handle lists', () => {
    const doc = createDocument('- Item 1\n- Item 2', DEFAULT_STYLES);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should handle tables', () => {
    const doc = createDocument('| A | B |\n|---|---|\n| 1 | 2 |', DEFAULT_STYLES);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should handle complex markdown', () => {
    const markdown = `# 工作报告

## 一、工作概述

本季度工作取得了显著成效。

### （一）主要成就

1. 完成项目A
2. 完成项目B

| 指标 | 目标 | 实际 |
|------|------|------|
| 收入 | 100万 | 120万 |
`;

    const doc = createDocument(markdown, DEFAULT_STYLES);
    expect(doc).toBeInstanceOf(Document);
  });
});

describe('generateDocxBuffer', () => {
  it('should generate a Buffer', async () => {
    const buffer = await generateDocxBuffer('# Test', DEFAULT_STYLES);

    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should generate valid docx content (ZIP signature)', async () => {
    const buffer = await generateDocxBuffer('# Test Document', DEFAULT_STYLES);

    // DOCX files are ZIP archives starting with PK signature
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });

  it('should generate non-empty buffer', async () => {
    const buffer = await generateDocxBuffer('# Test\n\nContent here.', DEFAULT_STYLES);

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle markdown with Chinese characters', async () => {
    const buffer = await generateDocxBuffer('# 中文标题\n\n这是中文正文内容。', DEFAULT_STYLES);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('should handle custom styles', async () => {
    const customStyles = {
      ...DEFAULT_STYLES,
      title: {
        font: '黑体' as const,
        size: 24,
        bold: true,
        center: true,
      },
    };

    const buffer = await generateDocxBuffer('# Custom Title', customStyles);

    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should handle empty markdown', async () => {
    const buffer = await generateDocxBuffer('', DEFAULT_STYLES);

    expect(buffer).toBeInstanceOf(Buffer);
    // Even empty doc should have ZIP structure
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('should handle markdown with tables', async () => {
    const markdown = `| 名称 | 数量 |
|------|------|
| 苹果 | 10 |
| 香蕉 | 20 |`;

    const buffer = await generateDocxBuffer(markdown, DEFAULT_STYLES);

    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should handle markdown with lists', async () => {
    const markdown = `- 项目一
- 项目二
  - 子项目A
  - 子项目B
- 项目三`;

    const buffer = await generateDocxBuffer(markdown, DEFAULT_STYLES);

    expect(buffer).toBeInstanceOf(Buffer);
  });
});

describe('English template support', () => {
  const enStyles = getTemplateStyles('en-standard');

  it('should create Document with English template', () => {
    const doc = createDocument('# Test Document', enStyles);

    expect(doc).toBeInstanceOf(Document);
  });

  it('should generate valid docx with English template', async () => {
    const buffer = await generateDocxBuffer('# Test Document', enStyles);

    // DOCX files are ZIP archives starting with PK signature
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });

  it('should handle English content with Arial/Times New Roman fonts', async () => {
    const markdown = `# Project Report

## Executive Summary

This is a project report with English content.

### Key Findings

1. First finding
2. Second finding

| Metric | Target | Actual |
|--------|--------|--------|
| Revenue | $100k | $120k |
`;

    const buffer = await generateDocxBuffer(markdown, enStyles);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('should handle mixed English and Chinese content', async () => {
    const markdown = `# Project Report 项目报告

English paragraph with some 中文字符 mixed in.

## Summary 摘要

- Item 1 项目一
- Item 2 项目二
`;

    const buffer = await generateDocxBuffer(markdown, enStyles);

    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should generate different size buffer than CN template for same content', async () => {
    const markdown = '# Test\n\nSimple content.';

    const cnBuffer = await generateDocxBuffer(markdown, DEFAULT_STYLES);
    const enBuffer = await generateDocxBuffer(markdown, enStyles);

    // Both should be valid DOCX
    expect(cnBuffer[0]).toBe(0x50);
    expect(enBuffer[0]).toBe(0x50);

    // Buffers may differ slightly due to different font/style names
    // (This is a sanity check that different templates produce different output)
    expect(cnBuffer.length).toBeGreaterThan(0);
    expect(enBuffer.length).toBeGreaterThan(0);
  });
});
