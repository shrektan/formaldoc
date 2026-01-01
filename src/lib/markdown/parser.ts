import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root } from 'mdast';

/**
 * Parses markdown text into an mdast (Markdown Abstract Syntax Tree)
 * @param markdown - The markdown text to parse
 * @returns The parsed AST
 */
export function parseMarkdown(markdown: string): Root {
  const processor = unified().use(remarkParse);
  return processor.parse(markdown);
}
