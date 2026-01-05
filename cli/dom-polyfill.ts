/**
 * DOM Polyfill for Node.js
 * Provides DOMParser for parsing OMML XML in latex-to-docx conversion
 */

import { JSDOM } from 'jsdom';

/**
 * Initialize DOM globals for Node.js environment
 * Must be called before any code that uses DOMParser
 */
export function initDomPolyfill(): void {
  if (typeof globalThis.DOMParser === 'undefined') {
    const dom = new JSDOM('');
    // @ts-expect-error - Setting global DOMParser for Node.js compatibility
    globalThis.DOMParser = dom.window.DOMParser;
  }
}
