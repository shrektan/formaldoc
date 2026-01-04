import { describe, it, expect } from 'vitest';
import { preprocessLatex } from './latex-preprocessor';

describe('preprocessLatex', () => {
  describe('multi-line formula blocks', () => {
    it('should not double-wrap formulas already in $$ blocks', () => {
      const input = `Some text

$$
dX_t = -\\nabla U(X_t)\\,dt + \\sqrt{2D}\\,dW_t
$$

More text`;

      const result = preprocessLatex(input);

      // Should remain unchanged - no double wrapping
      expect(result).toBe(input);
    });

    it('should handle multiple $$ blocks correctly', () => {
      const input = `Formula 1:
$$
E = mc^2
$$

Formula 2:
$$
F = ma
$$`;

      const result = preprocessLatex(input);

      // Should remain unchanged
      expect(result).toBe(input);
    });

    it('should not wrap content inside $$ blocks', () => {
      const input = `$$
\\frac{a}{b} + \\sqrt{c}
$$`;

      const result = preprocessLatex(input);

      // Content inside $$ should not be wrapped again
      expect(result).toBe(input);
      expect(result.match(/\$\$/g)?.length).toBe(2); // Only 2 $$ markers
    });
  });

  describe('inline math', () => {
    it('should not wrap inline math ($...$)', () => {
      const input = 'The formula $E = mc^2$ is famous.';
      const result = preprocessLatex(input);

      expect(result).toBe(input);
    });

    it('should not wrap single-line $$ formula', () => {
      const input = '$$E = mc^2$$';
      const result = preprocessLatex(input);

      expect(result).toBe(input);
    });
  });

  describe('bare LaTeX detection', () => {
    it('should wrap bare LaTeX formulas with $$', () => {
      const input = '\\frac{a}{b} = c';
      const result = preprocessLatex(input);

      expect(result).toBe('$$\n\\frac{a}{b} = c\n$$');
    });

    it('should wrap formulas with multiple LaTeX commands', () => {
      const input = '\\alpha + \\beta = \\gamma';
      const result = preprocessLatex(input);

      expect(result).toBe('$$\n\\alpha + \\beta = \\gamma\n$$');
    });

    it('should wrap formulas with subscript/superscript and LaTeX', () => {
      const input = 'X_t = \\nabla f(x)';
      const result = preprocessLatex(input);

      expect(result).toBe('$$\nX_t = \\nabla f(x)\n$$');
    });

    it('should not wrap plain text', () => {
      const input = 'This is just regular text.';
      const result = preprocessLatex(input);

      expect(result).toBe(input);
    });

    it('should not wrap Chinese text with some math-like notation', () => {
      const input = '这是一段包含一些符号的中文文本，比如 a + b = c';
      const result = preprocessLatex(input);

      expect(result).toBe(input);
    });

    it('should not wrap markdown headings', () => {
      const input = '# Title with \\frac{a}{b}';
      const result = preprocessLatex(input);

      expect(result).toBe(input);
    });

    it('should not wrap list items', () => {
      const input = '- Item with \\alpha';
      const result = preprocessLatex(input);

      expect(result).toBe(input);
    });
  });

  describe('mixed content', () => {
    it('should handle mixed content correctly', () => {
      const input = `# Title

This is a paragraph with inline math $x^2$.

$$
y = mx + b
$$

A bare formula:
\\frac{d}{dx}f(x) = f'(x)

Regular text here.`;

      const result = preprocessLatex(input);

      // The bare formula should be wrapped, others unchanged
      expect(result).toContain('# Title');
      expect(result).toContain('$x^2$');
      expect(result).toContain('$$\ny = mx + b\n$$');
      expect(result).toContain("$$\n\\frac{d}{dx}f(x) = f'(x)\n$$");
    });
  });
});
