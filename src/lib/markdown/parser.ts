import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';

/**
 * Parses markdown text into an mdast (Markdown Abstract Syntax Tree)
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 * @param markdown - The markdown text to parse
 * @returns The parsed AST
 */
export function parseMarkdown(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkGfm);
  return processor.parse(markdown);
}
