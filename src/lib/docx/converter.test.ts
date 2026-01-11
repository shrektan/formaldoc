// Suppress mathml2omml library warnings about unsupported MathML elements (span, annotation)
const originalLog = console.log;
const originalWarn = console.warn;
const filter = (...args: unknown[]) => !String(args[0]).includes('Type not supported');
console.log = (...args: unknown[]) => filter(...args) && originalLog(...args);
console.warn = (...args: unknown[]) => filter(...args) && originalWarn(...args);

import { describe, it, expect } from 'bun:test';
import { initDomPolyfill } from '../../../cli/dom-polyfill';
import { convertMdastToDocx } from './converter';
import { parseMarkdown } from '../markdown/parser';
import { Paragraph, Table } from 'docx';

// Initialize DOM polyfill for DOMParser support in math conversion tests
initDomPolyfill();

describe('convertMdastToDocx', () => {
  describe('headings', () => {
    it('should convert # to Paragraph', () => {
      const mdast = parseMarkdown('# 文档标题');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert ## to Paragraph', () => {
      const mdast = parseMarkdown('## 一、第一部分');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert ### to Paragraph', () => {
      const mdast = parseMarkdown('### （一）子标题');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert #### to Paragraph', () => {
      const mdast = parseMarkdown('#### 1. 详细内容');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert ##### to Paragraph', () => {
      const mdast = parseMarkdown('##### （1）更多内容');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });
  });

  describe('paragraphs', () => {
    it('should convert paragraph to Paragraph', () => {
      const mdast = parseMarkdown('这是正文内容。');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should handle bold text', () => {
      const mdast = parseMarkdown('这是**粗体**文字');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should handle bold text with ASCII quotes', () => {
      // This tests the bold-preprocessor fix for **"text"** pattern
      const mdast = parseMarkdown('这是**"功能性"**的安排');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      // Verify that 'strong' node was created (bold was recognized)
      const para = mdast.children[0];
      expect(para.type).toBe('paragraph');
      if (para.type === 'paragraph') {
        const hasStrong = para.children.some((c) => c.type === 'strong');
        expect(hasStrong).toBe(true);
      }
    });

    it('should handle bold text with Chinese quotes', () => {
      // Chinese curly quotes: " (U+201C) and " (U+201D)
      const mdast = parseMarkdown('这是**\u201C功能性\u201D**的安排');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      const para = mdast.children[0];
      expect(para.type).toBe('paragraph');
      if (para.type === 'paragraph') {
        const hasStrong = para.children.some((c) => c.type === 'strong');
        expect(hasStrong).toBe(true);
      }
    });

    it('should handle bold text with parentheses', () => {
      const mdast = parseMarkdown('这是**(括号内容)**的安排');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      const para = mdast.children[0];
      expect(para.type).toBe('paragraph');
      if (para.type === 'paragraph') {
        const hasStrong = para.children.some((c) => c.type === 'strong');
        expect(hasStrong).toBe(true);
      }
    });

    it('should handle italic text', () => {
      const mdast = parseMarkdown('这是*斜体*文字');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });
  });

  describe('lists', () => {
    it('should convert unordered list to Paragraphs', () => {
      const mdast = parseMarkdown('- 项目一\n- 项目二\n- 项目三');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(3);
      elements.forEach((el) => {
        expect(el).toBeInstanceOf(Paragraph);
      });
    });

    it('should convert ordered list to Paragraphs', () => {
      const mdast = parseMarkdown('1. 第一项\n2. 第二项\n3. 第三项');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(3);
      elements.forEach((el) => {
        expect(el).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle nested lists', () => {
      const mdast = parseMarkdown('- 外层\n  - 内层一\n  - 内层二');
      const elements = convertMdastToDocx(mdast);

      expect(elements.length).toBeGreaterThanOrEqual(3);
      elements.forEach((el) => {
        expect(el).toBeInstanceOf(Paragraph);
      });
    });
  });

  describe('tables', () => {
    it('should convert markdown table to Table', () => {
      const mdast = parseMarkdown(`| 列A | 列B |
|-----|-----|
| 值1 | 值2 |`);
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Table);
    });

    it('should handle tables with multiple rows', () => {
      const mdast = parseMarkdown(`| 姓名 | 年龄 | 职位 |
|------|------|------|
| 张三 | 30 | 经理 |
| 李四 | 25 | 员工 |`);
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Table);
    });
  });

  describe('math formulas', () => {
    it('should convert block math to Paragraph', () => {
      const mdast = parseMarkdown('$$\nE = mc^2\n$$');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should handle inline math within paragraphs', () => {
      const mdast = parseMarkdown('公式 $a^2 + b^2 = c^2$ 是勾股定理');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });
  });

  describe('mixed content', () => {
    it('should handle document with multiple element types', () => {
      const markdown = `# 报告标题

## 一、背景介绍

这是正文内容。

- 要点一
- 要点二

| 数据 | 值 |
|------|-----|
| A | 100 |
`;
      const mdast = parseMarkdown(markdown);
      const elements = convertMdastToDocx(mdast);

      // Should have: title, heading, paragraph, 2 list items, table
      expect(elements.length).toBeGreaterThanOrEqual(6);

      // Check element types
      const tables = elements.filter((el) => el instanceof Table);
      const paragraphs = elements.filter((el) => el instanceof Paragraph);

      expect(tables).toHaveLength(1);
      expect(paragraphs.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('empty content', () => {
    it('should handle empty markdown', () => {
      const mdast = parseMarkdown('');
      const elements = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(0);
    });
  });
});
