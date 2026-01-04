import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';
import { preprocessLatex } from './latex-preprocessor';

export interface ParseOptions {
  /** Whether to auto-recognize bare LaTeX formulas (default: true) */
  autoRecognizeLatex?: boolean;
}

/**
 * Parses markdown text into an mdast (Markdown Abstract Syntax Tree)
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 * Optionally auto-detects and wraps bare LaTeX formulas from ChatGPT
 * @param markdown - The markdown text to parse
 * @param options - Parse options
 * @returns The parsed AST
 */
export function parseMarkdown(markdown: string, options: ParseOptions = {}): Root {
  const { autoRecognizeLatex = true } = options;

  // Preprocess to wrap bare LaTeX formulas in $$...$$ if enabled
  const preprocessed = autoRecognizeLatex ? preprocessLatex(markdown) : markdown;
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
  return processor.parse(preprocessed);
}
