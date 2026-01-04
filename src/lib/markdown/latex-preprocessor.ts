/**
 * Preprocesses markdown to detect and wrap bare LaTeX formulas
 * ChatGPT often exports LaTeX without $$ delimiters
 */

// LaTeX commands that strongly indicate a formula
const LATEX_COMMANDS = [
  '\\frac',
  '\\nabla',
  '\\partial',
  '\\sqrt',
  '\\sum',
  '\\int',
  '\\prod',
  '\\lim',
  '\\infty',
  '\\cdot',
  '\\times',
  '\\div',
  '\\pm',
  '\\mp',
  '\\leq',
  '\\geq',
  '\\neq',
  '\\approx',
  '\\equiv',
  '\\propto',
  '\\rightarrow',
  '\\leftarrow',
  '\\Rightarrow',
  '\\Leftarrow',
  '\\leftrightarrow',
  '\\Leftrightarrow',
  '\\forall',
  '\\exists',
  '\\in',
  '\\notin',
  '\\subset',
  '\\supset',
  '\\cup',
  '\\cap',
  '\\alpha',
  '\\beta',
  '\\gamma',
  '\\delta',
  '\\epsilon',
  '\\theta',
  '\\lambda',
  '\\mu',
  '\\pi',
  '\\sigma',
  '\\phi',
  '\\psi',
  '\\omega',
  '\\Gamma',
  '\\Delta',
  '\\Theta',
  '\\Lambda',
  '\\Sigma',
  '\\Phi',
  '\\Psi',
  '\\Omega',
  '\\big(',
  '\\big)',
  '\\Big(',
  '\\Big)',
  '\\bigg(',
  '\\bigg)',
  '\\left(',
  '\\right)',
  '\\left[',
  '\\right]',
  '\\left\\{',
  '\\right\\}',
  '\\text{',
  '\\mathrm{',
  '\\mathbf{',
  '\\mathit{',
  '\\quad',
  '\\qquad',
  '\\log',
  '\\exp',
  '\\sin',
  '\\cos',
  '\\tan',
];

// Pattern to detect subscript/superscript notation: X_t, X^2, X_{ss}, etc.
const SUBSCRIPT_SUPERSCRIPT_PATTERN = /[A-Za-z]_\{?[A-Za-z0-9]+\}?|[A-Za-z]\^{?\d+}?/;

// Pattern to detect equation structure: something = something
const EQUATION_PATTERN = /^[^=]*=[^=]+$/;

/**
 * Checks if a line looks like a standalone LaTeX formula
 */
function isLikelyLatexFormula(line: string): boolean {
  const trimmed = line.trim();

  // Skip empty lines, markdown syntax, list items
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
    return false;
  }

  // Skip lines that are mostly Chinese/text with occasional math notation
  // A formula line should have significant LaTeX content
  const chineseChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
  if (chineseChars > 5) {
    return false;
  }

  // Check for LaTeX commands
  const hasLatexCommand = LATEX_COMMANDS.some((cmd) => trimmed.includes(cmd));

  // Check for subscript/superscript patterns
  const hasSubscriptSuperscript = SUBSCRIPT_SUPERSCRIPT_PATTERN.test(trimmed);

  // Check for equation structure
  const hasEquationStructure = EQUATION_PATTERN.test(trimmed);

  // A line is likely a formula if it has LaTeX commands and looks like an equation
  if (hasLatexCommand && hasEquationStructure) {
    return true;
  }

  // Or if it has multiple LaTeX commands (clearly a formula)
  const latexCommandCount = LATEX_COMMANDS.filter((cmd) => trimmed.includes(cmd)).length;
  if (latexCommandCount >= 2) {
    return true;
  }

  // Or if it has LaTeX commands and subscript/superscript
  if (hasLatexCommand && hasSubscriptSuperscript) {
    return true;
  }

  return false;
}

/**
 * Preprocesses markdown to wrap bare LaTeX formulas in $$...$$
 */
export function preprocessLatex(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let insideMathBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track $$ block boundaries (toggle on each $$ line)
    if (trimmed === '$$') {
      insideMathBlock = !insideMathBlock;
      result.push(line);
      continue;
    }

    // Skip processing if we're inside a $$ block
    if (insideMathBlock) {
      result.push(line);
      continue;
    }

    // Skip lines already wrapped in $$ on same line (e.g., $$E=mc^2$$)
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      result.push(line);
      continue;
    }

    // Skip inline math ($...$)
    if (trimmed.startsWith('$') && trimmed.endsWith('$') && !trimmed.startsWith('$$')) {
      result.push(line);
      continue;
    }

    // Check if this line looks like a LaTeX formula
    if (isLikelyLatexFormula(line)) {
      // Wrap in $$ for block display
      result.push('$$');
      result.push(trimmed);
      result.push('$$');
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}
