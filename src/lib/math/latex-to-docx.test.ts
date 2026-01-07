// Suppress mathml2omml library warnings about unsupported MathML elements (span, annotation)
// These warnings are expected and don't affect the conversion output
const originalLog = console.log;
const originalWarn = console.warn;
const filter = (...args: unknown[]) => !String(args[0]).includes('Type not supported');
console.log = (...args: unknown[]) => filter(...args) && originalLog(...args);
console.warn = (...args: unknown[]) => filter(...args) && originalWarn(...args);

import { describe, it, expect } from 'bun:test';
import { initDomPolyfill } from '../../../cli/dom-polyfill';
import { latexToDocxMath } from './latex-to-docx';
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
