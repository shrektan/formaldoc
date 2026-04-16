import { describe, it, expect } from 'bun:test';
import { parseMarkdown } from './parser';

describe('parseMarkdown', () => {
  describe('math parsing', () => {
    it('should parse block math ($$...$$)', () => {
      const input = '$$\nE = mc^2\n$$';
      const result = parseMarkdown(input);

      const mathNode = result.children.find((node) => node.type === 'math');
      expect(mathNode).toBeDefined();
      expect((mathNode as { value: string }).value.trim()).toBe('E = mc^2');
    });

    it('should parse inline math ($...$)', () => {
      const input = 'The formula $E = mc^2$ is famous.';
      const result = parseMarkdown(input);

      const paragraph = result.children[0];
      expect(paragraph.type).toBe('paragraph');

      // Check that inlineMath exists in the paragraph's children
      const hasInlineMath = (paragraph as { children: { type: string }[] }).children.some(
        (child) => child.type === 'inlineMath'
      );
      expect(hasInlineMath).toBe(true);
    });
  });

  // Regression: CJK punctuation adjacent to ** breaks CommonMark emphasis flanking
  // Root cause: 《》 etc. are Unicode punctuation, making ** non-left-flanking
  // Found by /eng-debug on 2026-04-16
  describe('CJK emphasis flanking fix', () => {
    it('should bold text wrapped in CJK brackets like **《制度》**', () => {
      const input = '使用**《公平交易管理制度》**——公司内规目录下**无此名称文件**';
      const result = parseMarkdown(input);
      const para = result.children[0] as {
        children: { type: string; value?: string; children?: { value: string }[] }[];
      };

      // Should produce: text, strong, text, strong
      expect(para.children).toHaveLength(4);
      expect(para.children[0].type).toBe('text');
      expect(para.children[0].value).toBe('使用');
      expect(para.children[1].type).toBe('strong');
      expect(para.children[1].children?.[0].value).toBe('《公平交易管理制度》');
      expect(para.children[2].type).toBe('text');
      expect(para.children[2].value).toBe('——公司内规目录下');
      expect(para.children[3].type).toBe('strong');
      expect(para.children[3].children?.[0].value).toBe('无此名称文件');
    });

    it('should bold text wrapped in quotes like **"text"**', () => {
      const input = '这是**"重要内容"**结尾';
      const result = parseMarkdown(input);
      const para = result.children[0] as {
        children: { type: string; value?: string; children?: { value: string }[] }[];
      };

      expect(para.children[1].type).toBe('strong');
      expect(para.children[1].children?.[0].value).toBe('"重要内容"');
    });

    it('should not break normal bold without CJK punctuation', () => {
      const input = '这是**粗体**文字';
      const result = parseMarkdown(input);
      const para = result.children[0] as {
        children: { type: string; value?: string; children?: { value: string }[] }[];
      };

      expect(para.children).toHaveLength(3);
      expect(para.children[1].type).toBe('strong');
      expect(para.children[1].children?.[0].value).toBe('粗体');
    });

    it('should handle multiple bold segments with CJK punctuation', () => {
      const input =
        '正式名称为**《安联保险资产管理有限公司公平交易管理办法》2.0 版**（风险管理部）';
      const result = parseMarkdown(input);
      const para = result.children[0] as {
        children: { type: string; value?: string; children?: { value: string }[] }[];
      };

      expect(para.children[1].type).toBe('strong');
    });
  });

  describe('GFM support', () => {
    it('should parse tables', () => {
      const input = `| A | B |
|---|---|
| 1 | 2 |`;
      const result = parseMarkdown(input);

      expect(result.children.some((node) => node.type === 'table')).toBe(true);
    });
  });
});
