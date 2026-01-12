import katex from 'katex';
import { mml2omml } from 'mathml2omml';
import {
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathSuperScript,
  MathSubScript,
  MathSubSuperScript,
  MathRadical,
  MathRoundBrackets,
  MathSquareBrackets,
  MathCurlyBrackets,
  MathSum,
  MathIntegral,
  BuilderElement,
  type MathComponent,
  type XmlComponent,
} from 'docx';

/**
 * Unescapes double-escaped LaTeX that often comes from copy-pasted AI content.
 * When markdown is copied from ChatGPT/Claude, backslashes are often escaped.
 * Example: \\frac → \frac, \\left → \left, \\_ → _
 *
 * NOTE: This function is kept for potential future use as an explicit
 * "fix escaped LaTeX" feature. It's not used automatically because silent
 * fallback can produce garbled output without warning.
 */
export function unescapeLatex(latex: string): string {
  return latex
    .replace(/\\\\/g, '\\') // \\\\ → \\ (double backslash → single)
    .replace(/\\_/g, '_') // \\_ → _ (escaped underscore)
    .replace(/\\{/g, '{') // \\{ → { (escaped brace)
    .replace(/\\}/g, '}'); // \\} → } (escaped brace)
}

/**
 * Fixes OMML output from mathml2omml by escaping < and > characters in text content.
 * The mathml2omml library has a bug where it doesn't escape these characters
 * inside <m:t> elements, causing XML parsing errors.
 *
 * Strategy: Process the string to find <m:t> content and escape < and > there.
 */
function fixOmmlEscaping(omml: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < omml.length) {
    // Look for <m:t> or <m:t  (with space for attributes)
    // Must not match <m:type or other tags starting with <m:t
    let mtStart = -1;
    let searchPos = i;
    while (searchPos < omml.length) {
      const pos = omml.indexOf('<m:t', searchPos);
      if (pos === -1) break;
      // Check next char is > or space (not a letter like 'y' in <m:type)
      const nextChar = omml[pos + 4];
      if (nextChar === '>' || nextChar === ' ') {
        mtStart = pos;
        break;
      }
      searchPos = pos + 1;
    }

    if (mtStart === -1) {
      // No more <m:t> tags, copy rest
      result.push(omml.slice(i));
      break;
    }

    // Copy everything up to <m:t
    result.push(omml.slice(i, mtStart));

    // Find the end of opening tag >
    const tagEnd = omml.indexOf('>', mtStart);
    if (tagEnd === -1) {
      result.push(omml.slice(mtStart));
      break;
    }

    // Copy the opening tag including >
    result.push(omml.slice(mtStart, tagEnd + 1));

    // Find closing </m:t>
    const closeTag = omml.indexOf('</m:t>', tagEnd + 1);
    if (closeTag === -1) {
      result.push(omml.slice(tagEnd + 1));
      break;
    }

    // Get content between tags and escape < and >
    const content = omml.slice(tagEnd + 1, closeTag);
    const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    result.push(escaped);

    // Copy closing tag
    result.push('</m:t>');
    i = closeTag + 6; // length of '</m:t>'
  }

  return result.join('');
}

/**
 * Tries to render LaTeX with KaTeX. Throws if parsing fails.
 */
function tryRenderLatex(latex: string, displayMode: boolean): string {
  return katex.renderToString(latex, {
    output: 'mathml',
    displayMode,
    throwOnError: true, // Throw on error to detect failure
  });
}

/**
 * Converts LaTeX to OMML XML string (for testing purposes)
 * Pipeline: LaTeX → KaTeX (MathML) → mathml2omml (OMML)
 */
export function latexToOmml(latex: string, displayMode = true): string {
  const mathml = katex.renderToString(latex, {
    output: 'mathml',
    displayMode,
    throwOnError: true,
  });
  return fixOmmlEscaping(mml2omml(mathml));
}

/**
 * Converts LaTeX to a docx Math object
 * Pipeline: LaTeX → KaTeX (MathML) → mathml2omml (OMML) → docx Math
 *
 * If parsing fails, falls back to plain text display of the original LaTeX.
 */
export function latexToDocxMath(latex: string, displayMode = true): DocxMath {
  let mathml: string;

  // Try rendering LaTeX to MathML
  try {
    mathml = tryRenderLatex(latex, displayMode);
  } catch (error) {
    console.warn('LaTeX conversion failed for:', latex, error);
    return new DocxMath({ children: [new MathRun(latex)] });
  }

  // Convert MathML → OMML → docx Math objects
  try {
    const rawOmml = mml2omml(mathml);
    // Fix unescaped < and > in text content (mathml2omml bug)
    const omml = fixOmmlEscaping(rawOmml);
    const children = parseOmml(omml);
    return new DocxMath({ children });
  } catch (error) {
    console.warn('OMML conversion failed, using fallback:', error);
    return new DocxMath({ children: [new MathRun(latex)] });
  }
}

/**
 * Parses OMML XML string and returns array of MathComponent
 */
function parseOmml(omml: string): MathComponent[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(omml, 'application/xml');

  // Find the oMath element (may be wrapped in oMathPara)
  const oMath =
    doc.querySelector('oMath') ||
    doc.getElementsByTagNameNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/math',
      'oMath'
    )[0];

  if (!oMath) {
    // If no oMath found, try to parse the root element's children
    return parseOmmlChildren(doc.documentElement);
  }

  return parseOmmlChildren(oMath);
}

/**
 * Recursively parses OMML element children into MathComponent array
 */
function parseOmmlChildren(element: Element): MathComponent[] {
  const children: MathComponent[] = [];

  for (const child of Array.from(element.children)) {
    const component = parseOmmlElement(child);
    if (component) {
      if (Array.isArray(component)) {
        children.push(...component);
      } else {
        children.push(component);
      }
    }
  }

  return children;
}

/**
 * Parses a single OMML element into a MathComponent
 */
function parseOmmlElement(element: Element): MathComponent | MathComponent[] | null {
  const localName = element.localName;

  switch (localName) {
    case 'r': // Math run (text)
      return parseMathRun(element);

    case 'f': // Fraction
      return parseMathFraction(element);

    case 'sSup': // Superscript
      return parseMathSuperScript(element);

    case 'sSub': // Subscript
      return parseMathSubScript(element);

    case 'sSubSup': // Subscript and Superscript
      return parseMathSubSuperScript(element);

    case 'rad': // Radical (square root)
      return parseMathRadical(element);

    case 'd': // Delimiter (brackets)
      return parseMathDelimiter(element);

    case 'nary': // N-ary operators (sum, integral, product)
      return parseMathNary(element);

    case 'acc': // Accents (hat, vec, overline, dot)
      return parseMathAccent(element);

    case 'm': // Matrix (for \begin{cases}, \begin{pmatrix}, etc.)
      return parseMathMatrix(element);

    case 'oMath': // Nested oMath
      return parseOmmlChildren(element);

    case 'oMathPara': // Math paragraph wrapper
      return parseOmmlChildren(element);

    case 't': // Text content (should be handled by parent 'r')
      return new MathRun(element.textContent || '');

    default:
      // For unknown elements, try to parse children
      if (element.children.length > 0) {
        return parseOmmlChildren(element);
      }
      // If it has text content, render as MathRun
      if (element.textContent?.trim()) {
        return new MathRun(element.textContent.trim());
      }
      return null;
  }
}

/**
 * Parses m:r (math run) element
 */
function parseMathRun(element: Element): MathRun | null {
  const textElement = element.querySelector('t') || element.getElementsByTagNameNS('*', 't')[0];
  const text = textElement?.textContent || element.textContent || '';
  if (!text.trim()) return null;
  return new MathRun(text);
}

/**
 * Parses m:f (fraction) element
 */
function parseMathFraction(element: Element): MathFraction {
  const num = element.querySelector('num') || element.getElementsByTagNameNS('*', 'num')[0];
  const den = element.querySelector('den') || element.getElementsByTagNameNS('*', 'den')[0];

  const numerator = num ? parseOmmlChildren(num) : [new MathRun('')];
  const denominator = den ? parseOmmlChildren(den) : [new MathRun('')];

  return new MathFraction({
    numerator,
    denominator,
  });
}

/**
 * Parses m:sSup (superscript) element
 */
function parseMathSuperScript(element: Element): MathSuperScript {
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];
  const sup = element.querySelector('sup') || element.getElementsByTagNameNS('*', 'sup')[0];

  const base = e ? parseOmmlChildren(e) : [new MathRun('')];
  const superScript = sup ? parseOmmlChildren(sup) : [new MathRun('')];

  return new MathSuperScript({
    children: base,
    superScript,
  });
}

/**
 * Parses m:sSub (subscript) element
 */
function parseMathSubScript(element: Element): MathSubScript {
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];
  const sub = element.querySelector('sub') || element.getElementsByTagNameNS('*', 'sub')[0];

  const base = e ? parseOmmlChildren(e) : [new MathRun('')];
  const subScript = sub ? parseOmmlChildren(sub) : [new MathRun('')];

  return new MathSubScript({
    children: base,
    subScript,
  });
}

/**
 * Parses m:sSubSup (subscript and superscript) element
 */
function parseMathSubSuperScript(element: Element): MathSubSuperScript {
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];
  const sub = element.querySelector('sub') || element.getElementsByTagNameNS('*', 'sub')[0];
  const sup = element.querySelector('sup') || element.getElementsByTagNameNS('*', 'sup')[0];

  const base = e ? parseOmmlChildren(e) : [new MathRun('')];
  const subScript = sub ? parseOmmlChildren(sub) : [new MathRun('')];
  const superScript = sup ? parseOmmlChildren(sup) : [new MathRun('')];

  return new MathSubSuperScript({
    children: base,
    subScript,
    superScript,
  });
}

/**
 * Parses m:rad (radical/square root) element
 */
function parseMathRadical(element: Element): MathRadical {
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];
  const deg = element.querySelector('deg') || element.getElementsByTagNameNS('*', 'deg')[0];

  const base = e ? parseOmmlChildren(e) : [new MathRun('')];
  const degree = deg ? parseOmmlChildren(deg) : undefined;

  return new MathRadical({
    children: base,
    degree,
  });
}

/**
 * Parses m:d (delimiter/brackets) element
 */
function parseMathDelimiter(element: Element): MathComponent {
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];
  const children = e ? parseOmmlChildren(e) : [new MathRun('')];

  // Check delimiter properties for bracket type
  const dPr = element.querySelector('dPr') || element.getElementsByTagNameNS('*', 'dPr')[0];
  const begChr = dPr?.querySelector('begChr') || dPr?.getElementsByTagNameNS('*', 'begChr')[0];
  const endChr = dPr?.querySelector('endChr') || dPr?.getElementsByTagNameNS('*', 'endChr')[0];

  const beginChar = begChr?.getAttribute('m:val') || begChr?.getAttribute('val') || '(';
  const endChar = endChr?.getAttribute('m:val') || endChr?.getAttribute('val') || ')';

  // Determine bracket type based on characters
  if (beginChar === '[' || endChar === ']') {
    return new MathSquareBrackets({ children });
  } else if (beginChar === '{' || endChar === '}') {
    return new MathCurlyBrackets({ children });
  } else {
    // Default to round brackets
    return new MathRoundBrackets({ children });
  }
}

/**
 * Parses m:nary (n-ary operator) element for sum, integral, product, etc.
 */
function parseMathNary(element: Element): MathComponent[] {
  const result: MathComponent[] = [];

  // Get the operator character (∑, ∫, ∏, etc.)
  const naryPr =
    element.querySelector('naryPr') || element.getElementsByTagNameNS('*', 'naryPr')[0];
  const chr = naryPr?.querySelector('chr') || naryPr?.getElementsByTagNameNS('*', 'chr')[0];
  const operator = chr?.getAttribute('m:val') || chr?.getAttribute('val') || '∑';

  // Get sub (lower limit) and sup (upper limit)
  const sub = element.querySelector('sub') || element.getElementsByTagNameNS('*', 'sub')[0];
  const sup = element.querySelector('sup') || element.getElementsByTagNameNS('*', 'sup')[0];

  // Get the expression being operated on
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];

  const subScript = sub ? parseOmmlChildren(sub) : undefined;
  const superScript = sup ? parseOmmlChildren(sup) : undefined;
  const children = e ? parseOmmlChildren(e) : [new MathRun('')];

  // Use appropriate docx class based on operator
  if (operator === '∑') {
    result.push(
      new MathSum({
        children,
        subScript,
        superScript,
      })
    );
  } else if (operator === '∫') {
    result.push(
      new MathIntegral({
        children,
        subScript,
        superScript,
      })
    );
  } else {
    // For other operators (∏, etc.), use MathSubSuperScript with the operator symbol
    if (subScript && superScript) {
      result.push(
        new MathSubSuperScript({
          children: [new MathRun(operator)],
          subScript,
          superScript,
        })
      );
    } else if (subScript) {
      result.push(
        new MathSubScript({
          children: [new MathRun(operator)],
          subScript,
        })
      );
    } else if (superScript) {
      result.push(
        new MathSuperScript({
          children: [new MathRun(operator)],
          superScript,
        })
      );
    } else {
      result.push(new MathRun(operator));
    }
    // Add the expression after the operator
    result.push(...children);
  }

  return result;
}

/**
 * Parses m:acc (accent) element for hat, vec, overline, dot, etc.
 * Since docx doesn't have a direct accent class, we render base with accent as superscript.
 */
function parseMathAccent(element: Element): MathComponent[] {
  // Get the accent character
  const accPr = element.querySelector('accPr') || element.getElementsByTagNameNS('*', 'accPr')[0];
  const chr = accPr?.querySelector('chr') || accPr?.getElementsByTagNameNS('*', 'chr')[0];
  const accent = chr?.getAttribute('m:val') || chr?.getAttribute('val') || '^';

  // Get the base expression
  const e = element.querySelector('e') || element.getElementsByTagNameNS('*', 'e')[0];
  const base = e ? parseOmmlChildren(e) : [new MathRun('')];

  // Map common accent characters to combining Unicode characters for better rendering
  const combiningAccents: Record<string, string> = {
    '^': '\u0302', // combining circumflex (for \hat)
    '̂': '\u0302', // combining circumflex
    '~': '\u0303', // combining tilde (for \tilde)
    '̃': '\u0303', // combining tilde
    '→': '\u20D7', // combining right arrow (for \vec)
    '¯': '\u0304', // combining macron (for \overline)
    '̄': '\u0304', // combining macron
    '˙': '\u0307', // combining dot above (for \dot)
    '̇': '\u0307', // combining dot
    '¨': '\u0308', // combining diaeresis (for \ddot)
  };

  // Try to get base text for combining character approach
  const eText = e?.querySelector('t') || e?.getElementsByTagNameNS('*', 't')[0];
  const baseText = eText?.textContent || '';

  // If we have a simple single-character base, try using combining character
  const combiningChar = combiningAccents[accent];
  if (combiningChar && baseText && baseText.length <= 2) {
    return [new MathRun(baseText + combiningChar)];
  }

  // Fallback: render as base with accent as superscript
  return [
    new MathSuperScript({
      children: base,
      superScript: [new MathRun(accent)],
    }),
  ];
}

/**
 * Parses m:m (matrix) element for \begin{cases}, \begin{pmatrix}, etc.
 * Uses BuilderElement to create proper OMML matrix structure.
 */
function parseMathMatrix(element: Element): MathComponent {
  const children: XmlComponent[] = [];

  // Parse matrix properties (m:mPr) if present
  const mPr = element.querySelector('mPr') || element.getElementsByTagNameNS('*', 'mPr')[0];
  if (mPr) {
    children.push(parseOmmlElementGeneric(mPr));
  }

  // Get all matrix rows (m:mr elements) - direct children only
  const allMr = element.querySelectorAll('mr');
  const rowElements = allMr.length > 0 ? allMr : element.getElementsByTagNameNS('*', 'mr');

  // Filter to direct children only (not nested matrices)
  const directRows = Array.from(rowElements).filter(
    (row) => row.parentElement === element || row.parentNode === element
  );

  for (const row of directRows) {
    const rowChildren: XmlComponent[] = [];

    // Get all cells in this row (m:e elements) - direct children only
    const allCells = row.querySelectorAll('e');
    const cellElements = allCells.length > 0 ? allCells : row.getElementsByTagNameNS('*', 'e');

    const directCells = Array.from(cellElements).filter(
      (cell) => cell.parentElement === row || cell.parentNode === row
    );

    for (const cell of directCells) {
      // Parse cell content recursively
      const cellContent = parseOmmlChildren(cell);
      rowChildren.push(
        new BuilderElement({
          name: 'm:e',
          children: cellContent as XmlComponent[],
        })
      );
    }

    children.push(
      new BuilderElement({
        name: 'm:mr',
        children: rowChildren,
      })
    );
  }

  return new BuilderElement({
    name: 'm:m',
    children,
  }) as unknown as MathComponent;
}

/**
 * Generic OMML element parser that preserves structure using BuilderElement.
 * Used for matrix properties and other elements that need to be passed through.
 */
function parseOmmlElementGeneric(element: Element): XmlComponent {
  const children: XmlComponent[] = [];

  for (const child of Array.from(element.children)) {
    if (child.children.length > 0) {
      // Recursively parse nested elements
      children.push(parseOmmlElementGeneric(child));
    } else {
      // Leaf element - check for text content or attributes
      const text = child.textContent?.trim();
      if (text) {
        children.push(
          new BuilderElement({
            name: `m:${child.localName}`,
            children: [new MathRun(text) as unknown as XmlComponent],
          })
        );
      } else {
        // Element with attributes but no text (like <m:ctrlPr/>)
        children.push(
          new BuilderElement({
            name: `m:${child.localName}`,
            children: [],
          })
        );
      }
    }
  }

  return new BuilderElement({
    name: `m:${element.localName}`,
    children,
  });
}
