import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';
import { preprocessLatex } from './latex-preprocessor';

/**
 * Parses markdown text into an mdast (Markdown Abstract Syntax Tree)
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 * Automatically detects and wraps bare LaTeX formulas from ChatGPT
 * @param markdown - The markdown text to parse
 * @returns The parsed AST
 */
export function parseMarkdown(markdown: string): Root {
  // Preprocess to wrap bare LaTeX formulas in $$...$$
  const preprocessed = preprocessLatex(markdown);
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
  return processor.parse(preprocessed);
}
