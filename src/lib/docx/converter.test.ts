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
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert ## to Paragraph', () => {
      const mdast = parseMarkdown('## 一、第一部分');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert ### to Paragraph', () => {
      const mdast = parseMarkdown('### （一）子标题');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert #### to Paragraph', () => {
      const mdast = parseMarkdown('#### 1. 详细内容');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert ##### to Paragraph', () => {
      const mdast = parseMarkdown('##### （1）更多内容');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });
  });

  describe('paragraphs', () => {
    it('should convert paragraph to Paragraph', () => {
      const mdast = parseMarkdown('这是正文内容。');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should handle bold text', () => {
      const mdast = parseMarkdown('这是**粗体**文字');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should handle italic text', () => {
      const mdast = parseMarkdown('这是*斜体*文字');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should preserve inline math inside bold text', () => {
      const mdast = parseMarkdown('**单位累计基准收益（$A_T$）**');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);

      let mathCount = 0;
      const visit = (node: unknown) => {
        if (node && typeof node === 'object') {
          if ((node as { rootKey?: string }).rootKey === 'm:oMath') {
            mathCount++;
          }
          const root = (node as { root?: unknown[] }).root;
          if (Array.isArray(root)) {
            for (const child of root) visit(child);
          }
        }
      };
      visit(elements[0]);

      expect(mathCount).toBe(1);
    });
  });

  describe('inline HTML', () => {
    // Count <w:br/> elements in a Paragraph by walking its docx internal tree.
    // docx represents <br> via a Break XmlComponent whose root XML element is
    // 'w:br'. We look at TextRun children (rootKey === 'w:r') and inspect their
    // content for Break instances.
    const countLineBreaks = (paragraph: Paragraph): number => {
      let count = 0;
      const visit = (node: unknown) => {
        if (node && typeof node === 'object') {
          const rootKey = (node as { rootKey?: string }).rootKey;
          if (rootKey === 'w:br') {
            count++;
          }
          const root = (node as { root?: unknown[] }).root;
          if (Array.isArray(root)) {
            for (const child of root) visit(child);
          }
        }
      };
      visit(paragraph);
      return count;
    };

    it('should convert <br> to a line break inside a paragraph', () => {
      const mdast = parseMarkdown('first<br>second');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      expect(countLineBreaks(elements[0] as Paragraph)).toBe(1);
    });

    it('should convert consecutive <br><br> to two line breaks', () => {
      const mdast = parseMarkdown('alpha<br><br>beta');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      expect(countLineBreaks(elements[0] as Paragraph)).toBe(2);
    });

    it('should support <br/> and <BR> variants', () => {
      const mdast = parseMarkdown('a<br/>b<BR>c<br />d');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(countLineBreaks(elements[0] as Paragraph)).toBe(3);
    });

    it('should honor <br> inside table cells', () => {
      const mdast = parseMarkdown(`| 列A | 列B |
|-----|-----|
| 行1<br><br>行2 | 单值 |`);
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Table);
      // Walk the Table to count w:br anywhere inside.
      let breakCount = 0;
      const visit = (node: unknown) => {
        if (node && typeof node === 'object') {
          if ((node as { rootKey?: string }).rootKey === 'w:br') breakCount++;
          const root = (node as { root?: unknown[] }).root;
          if (Array.isArray(root)) for (const c of root) visit(c);
        }
      };
      visit(elements[0]);
      expect(breakCount).toBe(2);
    });

    it('should honor <br> inside bold text', () => {
      const mdast = parseMarkdown('**第一行<br>第二行**');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      expect(countLineBreaks(elements[0] as Paragraph)).toBe(1);
    });

    it('should honor <br><br> inside italic text', () => {
      const mdast = parseMarkdown('*强调<br><br>注释*');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
      expect(countLineBreaks(elements[0] as Paragraph)).toBe(2);
    });

    it('should honor <br> inside bold table cells', () => {
      const mdast = parseMarkdown(`| 列A | 列B |
|-----|-----|
| **重要**<br>说明 | **核心**<br><br>细节 |`);
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Table);
      let breakCount = 0;
      const visit = (node: unknown) => {
        if (node && typeof node === 'object') {
          if ((node as { rootKey?: string }).rootKey === 'w:br') breakCount++;
          const root = (node as { root?: unknown[] }).root;
          if (Array.isArray(root)) for (const c of root) visit(c);
        }
      };
      visit(elements[0]);
      expect(breakCount).toBe(3);
    });
  });

  describe('lists', () => {
    it('should convert unordered list to Paragraphs', () => {
      const mdast = parseMarkdown('- 项目一\n- 项目二\n- 项目三');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(3);
      elements.forEach((el) => {
        expect(el).toBeInstanceOf(Paragraph);
      });
    });

    it('should convert ordered list to Paragraphs', () => {
      const mdast = parseMarkdown('1. 第一项\n2. 第二项\n3. 第三项');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(3);
      elements.forEach((el) => {
        expect(el).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle nested lists', () => {
      const mdast = parseMarkdown('- 外层\n  - 内层一\n  - 内层二');
      const { elements } = convertMdastToDocx(mdast);

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
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Table);
    });

    it('should handle tables with multiple rows', () => {
      const mdast = parseMarkdown(`| 姓名 | 年龄 | 职位 |
|------|------|------|
| 张三 | 30 | 经理 |
| 李四 | 25 | 员工 |`);
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Table);
    });
  });

  describe('math formulas', () => {
    it('should convert block math to Paragraph', () => {
      const mdast = parseMarkdown('$$\nE = mc^2\n$$');
      const { elements } = convertMdastToDocx(mdast);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBeInstanceOf(Paragraph);
    });

    it('should handle inline math within paragraphs', () => {
      const mdast = parseMarkdown('公式 $a^2 + b^2 = c^2$ 是勾股定理');
      const { elements } = convertMdastToDocx(mdast);

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
      const { elements } = convertMdastToDocx(mdast);

      // Should have: title, heading, paragraph, 2 list items, table
      expect(elements.length).toBeGreaterThanOrEqual(6);

      // Check element types
      const tables = elements.filter((el) => el instanceof Table);
      const paragraphs = elements.filter((el) => el instanceof Paragraph);

      expect(tables).toHaveLength(1);
      expect(paragraphs.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('titleLevel offset', () => {
    it('should map ## to Title when titleLevel is 2', () => {
      const mdast = parseMarkdown('## 文档标题\n\n### 一级标题\n\n#### 二级标题');
      const { elements } = convertMdastToDocx(mdast, 16, 2);

      // ## → Title, ### → Heading1, #### → Heading2
      expect(elements).toHaveLength(3);
      elements.forEach((el) => expect(el).toBeInstanceOf(Paragraph));
    });

    it('should default to titleLevel 1 (standard behavior)', () => {
      const mdast = parseMarkdown('# 标题\n\n## 一级');
      const { elements: elementsDefault } = convertMdastToDocx(mdast);
      const { elements: elementsExplicit } = convertMdastToDocx(mdast, 16, 1);

      expect(elementsDefault).toHaveLength(2);
      expect(elementsExplicit).toHaveLength(2);
    });

    it('should clamp headings above titleLevel to Title', () => {
      // titleLevel=3 but markdown has ## (depth 2, which is above titleLevel)
      const mdast = parseMarkdown('## 高级标题\n\n### 文档标题\n\n#### 一级标题');
      const { elements } = convertMdastToDocx(mdast, 16, 3);

      // ## (depth 2) → effectiveDepth max(1, 2-3+1)=max(1,0)=1 → Title (clamped)
      // ### (depth 3) → effectiveDepth max(1, 3-3+1)=1 → Title
      // #### (depth 4) → effectiveDepth max(1, 4-3+1)=2 → Heading1
      expect(elements).toHaveLength(3);
      elements.forEach((el) => expect(el).toBeInstanceOf(Paragraph));
    });
  });

  describe('footnotes', () => {
    it('should convert single footnote', () => {
      const mdast = parseMarkdown('Text with a note[^1].\n\n[^1]: The footnote content.');
      const result = convertMdastToDocx(mdast);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toBeInstanceOf(Paragraph);
      expect(Object.keys(result.footnotes)).toHaveLength(1);
      expect(result.footnotes['1']).toBeDefined();
      expect(result.footnotes['1'].children).toHaveLength(1);
      expect(result.footnotes['1'].children[0]).toBeInstanceOf(Paragraph);
    });

    it('should convert multiple footnotes with correct IDs', () => {
      const mdast = parseMarkdown('First[^a] and second[^b].\n\n[^a]: Note A.\n\n[^b]: Note B.');
      const result = convertMdastToDocx(mdast);

      expect(result.elements).toHaveLength(1);
      expect(Object.keys(result.footnotes)).toHaveLength(2);
      expect(result.footnotes['1']).toBeDefined();
      expect(result.footnotes['2']).toBeDefined();
    });

    it('should handle footnote with formatted content', () => {
      const mdast = parseMarkdown('Text[^1].\n\n[^1]: Note with **bold** and *italic*.');
      const result = convertMdastToDocx(mdast);

      expect(Object.keys(result.footnotes)).toHaveLength(1);
      expect(result.footnotes['1'].children[0]).toBeInstanceOf(Paragraph);
    });

    it('should return empty footnotes when none exist', () => {
      const mdast = parseMarkdown('Just a paragraph.');
      const result = convertMdastToDocx(mdast);

      expect(result.elements).toHaveLength(1);
      expect(Object.keys(result.footnotes)).toHaveLength(0);
    });
  });

  describe('empty content', () => {
    it('should handle empty markdown', () => {
      const mdast = parseMarkdown('');
      const result = convertMdastToDocx(mdast);

      expect(result.elements).toHaveLength(0);
    });
  });
});
