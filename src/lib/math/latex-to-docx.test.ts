// Suppress mathml2omml library warnings about unsupported MathML elements (span, annotation)
// These warnings are expected and don't affect the conversion output
const originalLog = console.log;
const originalWarn = console.warn;
const filter = (...args: unknown[]) => !String(args[0]).includes('Type not supported');
console.log = (...args: unknown[]) => filter(...args) && originalLog(...args);
console.warn = (...args: unknown[]) => filter(...args) && originalWarn(...args);

import { describe, it, expect } from 'bun:test';
import { initDomPolyfill } from '../../../cli/dom-polyfill';
import { latexToDocxMath, latexToOmml } from './latex-to-docx';
import { Math as DocxMath } from 'docx';

// Initialize DOM polyfill for DOMParser support in tests
initDomPolyfill();

describe('latexToDocxMath', () => {
  describe('basic conversion', () => {
    it('should return a DocxMath object', () => {
      const result = latexToDocxMath('x^2', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should handle simple variables', () => {
      const result = latexToDocxMath('x', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should handle display mode', () => {
      const result = latexToDocxMath('E = mc^2', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should handle inline mode', () => {
      const result = latexToDocxMath('x + y', false);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('superscript and subscript', () => {
    it('should convert superscript', () => {
      const result = latexToDocxMath('x^2', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert subscript', () => {
      const result = latexToDocxMath('x_1', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert combined subscript and superscript', () => {
      const result = latexToDocxMath('x_1^2', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('fractions', () => {
    it('should convert simple fractions', () => {
      const result = latexToDocxMath('\\frac{a}{b}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert nested fractions', () => {
      const result = latexToDocxMath('\\frac{\\frac{1}{2}}{3}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('radicals', () => {
    it('should convert square root', () => {
      const result = latexToDocxMath('\\sqrt{x}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert nth root', () => {
      const result = latexToDocxMath('\\sqrt[3]{x}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('Greek letters', () => {
    it('should convert Greek letters', () => {
      const result = latexToDocxMath('\\alpha + \\beta = \\gamma', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert uppercase Greek letters', () => {
      const result = latexToDocxMath('\\Sigma + \\Delta', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('operators and symbols', () => {
    it('should convert sum notation', () => {
      const result = latexToDocxMath('\\sum_{i=1}^{n} x_i', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert integral', () => {
      const result = latexToDocxMath('\\int_0^1 f(x) dx', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert product notation', () => {
      const result = latexToDocxMath('\\prod_{i=1}^{n} x_i', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('brackets and delimiters', () => {
    it('should convert parentheses', () => {
      const result = latexToDocxMath('\\left( x + y \\right)', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert square brackets', () => {
      const result = latexToDocxMath('\\left[ x + y \\right]', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert curly braces', () => {
      const result = latexToDocxMath('\\left\\{ x + y \\right\\}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('complex formulas', () => {
    it('should convert quadratic formula', () => {
      const result = latexToDocxMath('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert Euler formula', () => {
      const result = latexToDocxMath('e^{i\\pi} + 1 = 0', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should convert matrix', () => {
      const result = latexToDocxMath('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });

  describe('error handling', () => {
    it('should handle invalid LaTeX gracefully', () => {
      // Should not throw, should return fallback
      const result = latexToDocxMath('\\invalid{command}', true);

      expect(result).toBeInstanceOf(DocxMath);
    });

    it('should handle empty input', () => {
      const result = latexToDocxMath('', true);

      expect(result).toBeInstanceOf(DocxMath);
    });
  });
});

describe('OMML structure verification', () => {
  describe('nary operators', () => {
    it('should generate m:nary for sum', () => {
      const omml = latexToOmml('\\sum_{i=1}^{n} x_i', true);
      expect(omml).toContain('<m:nary>');
      expect(omml).toMatch(/<m:chr[^>]*val="∑"/);
      expect(omml).toContain('<m:sub>');
      expect(omml).toContain('<m:sup>');
      expect(omml).toContain('<m:e>');
    });

    it('should generate m:nary for integral', () => {
      const omml = latexToOmml('\\int_0^1 f(x)', true);
      expect(omml).toContain('<m:nary>');
      expect(omml).toMatch(/<m:chr[^>]*val="∫"/);
    });

    it('should generate m:nary for product', () => {
      const omml = latexToOmml('\\prod_{i=1}^{n} a_i', true);
      expect(omml).toContain('<m:nary>');
      expect(omml).toMatch(/<m:chr[^>]*val="∏"/);
    });

    it('should render sum without limits as text symbol', () => {
      // When sum has no subscript/superscript, it's rendered as simple text
      const omml = latexToOmml('\\sum x', true);
      expect(omml).toContain('∑');
    });
  });

  describe('accents', () => {
    it('should generate m:acc for hat', () => {
      const omml = latexToOmml('\\hat{x}', true);
      expect(omml).toContain('<m:acc>');
      expect(omml).toContain('<m:accPr>');
      expect(omml).toContain('<m:e>');
    });

    it('should generate m:acc for vec', () => {
      const omml = latexToOmml('\\vec{v}', true);
      expect(omml).toContain('<m:acc>');
    });

    it('should generate m:acc for overline', () => {
      const omml = latexToOmml('\\overline{AB}', true);
      expect(omml).toContain('<m:acc>');
    });

    it('should generate m:acc for dot', () => {
      const omml = latexToOmml('\\dot{a}', true);
      expect(omml).toContain('<m:acc>');
    });

    it('should generate m:acc for tilde', () => {
      const omml = latexToOmml('\\tilde{x}', true);
      expect(omml).toContain('<m:acc>');
    });
  });

  describe('fixOmmlEscaping', () => {
    it('should escape < in m:t content', () => {
      const omml = latexToOmml('P < Q', true);
      expect(omml).toContain('&lt;');
    });

    it('should escape > in m:t content', () => {
      const omml = latexToOmml('A > B', true);
      expect(omml).toContain('&gt;');
    });

    it('should escape both < and > in comparison chain', () => {
      const omml = latexToOmml('a < b < c', true);
      expect(omml).toContain('&lt;');
      // Should not have unescaped < inside m:t (except for tags)
      expect(omml).not.toMatch(/<m:t>[^<]*[<>][^<]*<\/m:t>/);
    });

    it('should not break fractions when escaping', () => {
      // This tests that m:type is not incorrectly matched as m:t
      const omml = latexToOmml('\\frac{a}{b}', true);
      expect(omml).toContain('<m:f>');
      expect(omml).toContain('<m:num>');
      expect(omml).toContain('<m:den>');
    });
  });
});
