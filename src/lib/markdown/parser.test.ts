import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './parser';

describe('parseMarkdown', () => {
  describe('autoRecognizeLatex option', () => {
    it('should auto-recognize LaTeX by default', () => {
      const input = '\\frac{a}{b} = c';
      const result = parseMarkdown(input);

      // Should have a math node from the auto-wrapped formula
      const hasMath = result.children.some((node) => node.type === 'math');
      expect(hasMath).toBe(true);
    });

    it('should auto-recognize LaTeX when option is true', () => {
      const input = '\\frac{a}{b} = c';
      const result = parseMarkdown(input, { autoRecognizeLatex: true });

      const hasMath = result.children.some((node) => node.type === 'math');
      expect(hasMath).toBe(true);
    });

    it('should not auto-recognize LaTeX when option is false', () => {
      const input = '\\frac{a}{b} = c';
      const result = parseMarkdown(input, { autoRecognizeLatex: false });

      // Should be a paragraph, not a math node
      const hasMath = result.children.some((node) => node.type === 'math');
      expect(hasMath).toBe(false);
      expect(result.children[0].type).toBe('paragraph');
    });

    it('should parse explicit $$ blocks regardless of option', () => {
      const input = '$$\nE = mc^2\n$$';

      const resultOn = parseMarkdown(input, { autoRecognizeLatex: true });
      const resultOff = parseMarkdown(input, { autoRecognizeLatex: false });

      expect(resultOn.children.some((node) => node.type === 'math')).toBe(true);
      expect(resultOff.children.some((node) => node.type === 'math')).toBe(true);
    });
  });

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
      const result = parseMarkdown(input, { autoRecognizeLatex: false });

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
      const result = parseMarkdown(input, { autoRecognizeLatex: false });

      expect(result.children.some((node) => node.type === 'table')).toBe(true);
    });
  });
});
