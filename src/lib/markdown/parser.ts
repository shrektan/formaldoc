import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';

/**
 * Parses markdown text into an mdast (Markdown Abstract Syntax Tree)
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 * Supports LaTeX math: $...$ for inline, $$...$$ for block formulas
 * @param markdown - The markdown text to parse
 * @returns The parsed AST
 */
export function parseMarkdown(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
  return processor.parse(markdown);
}
