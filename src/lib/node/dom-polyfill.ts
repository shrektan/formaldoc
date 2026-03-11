/**
 * DOM Polyfill for Node.js.
 * Provides DOMParser and XMLSerializer for parsing/serializing OMML XML.
 */
import { JSDOM } from 'jsdom';

export function initDomPolyfill(): void {
  if (typeof globalThis.DOMParser === 'undefined') {
    const dom = new JSDOM('');
    globalThis.DOMParser = dom.window.DOMParser;
  }

  if (typeof globalThis.XMLSerializer === 'undefined') {
    const dom = new JSDOM('');
    globalThis.XMLSerializer = dom.window.XMLSerializer;
  }
}
