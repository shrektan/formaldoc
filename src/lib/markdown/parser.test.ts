import { describe, it, expect } from 'vitest';
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
