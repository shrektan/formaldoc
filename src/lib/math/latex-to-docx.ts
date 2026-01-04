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
  type MathComponent,
} from 'docx';

/**
 * Converts LaTeX to a docx Math object
 * Pipeline: LaTeX → KaTeX (MathML) → mathml2omml (OMML) → docx Math
 */
export function latexToDocxMath(latex: string, displayMode = true): DocxMath {
  try {
    // Step 1: LaTeX → MathML using KaTeX
    const mathml = katex.renderToString(latex, {
      output: 'mathml',
      displayMode,
      throwOnError: false,
    });

    // Step 2: MathML → OMML
    const omml = mml2omml(mathml);

    // Step 3: OMML → docx Math objects
    const children = parseOmml(omml);

    return new DocxMath({ children });
  } catch (error) {
    console.warn('Formula conversion failed, using fallback:', error);
    // Fallback: render as plain text
    return new DocxMath({
      children: [new MathRun(latex)],
    });
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
