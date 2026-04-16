import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root, RootContent, PhrasingContent } from 'mdast';

const ZWS = '\u200B';

/**
 * CommonMark emphasis flanking rules break when CJK punctuation (《》「」etc.)
 * is adjacent to * or ** delimiters. For example, `使用**《制度》**——` fails
 * because `用` (non-punct) before `**` + `《` (punct) after `**` makes the
 * delimiter non-left-flanking.
 *
 * Fix: insert Zero-Width Space between emphasis delimiters and adjacent Unicode
 * punctuation. ZWS is Unicode category Cf (not punct, not whitespace), so it
 * makes the flanking rules pass without affecting visual output.
 */
function fixCjkEmphasisFlanking(markdown: string): string {
  // Insert ZWS after emphasis delimiter when followed by Unicode punctuation (excluding *)
  // e.g. **《 → **\u200B《   **" → **\u200B"
  markdown = markdown.replace(/(\*{1,3})(\p{P})/gu, (_, stars: string, punct: string) =>
    punct === '*' ? `${stars}${punct}` : `${stars}${ZWS}${punct}`
  );
  // Insert ZWS before emphasis delimiter when preceded by Unicode punctuation (excluding *)
  // e.g. 》** → 》\u200B**   "** → "\u200B**
  markdown = markdown.replace(/(\p{P})(\*{1,3})/gu, (_, punct: string, stars: string) =>
    punct === '*' ? `${punct}${stars}` : `${punct}${ZWS}${stars}`
  );
  return markdown;
}

/**
 * Recursively strip ZWS characters from all text nodes in the AST
 */
function stripZws(node: Root): void {
  function walk(children: (RootContent | PhrasingContent)[]): void {
    for (const child of children) {
      if ('value' in child && typeof child.value === 'string') {
        child.value = child.value.replace(/\u200B/g, '');
      }
      if ('url' in child && typeof child.url === 'string') {
        child.url = child.url.replace(/\u200B/g, '');
      }
      if ('children' in child && Array.isArray(child.children)) {
        walk(child.children as (RootContent | PhrasingContent)[]);
      }
    }
  }
  walk(node.children);
}

/**
 * Parses markdown text into an mdast (Markdown Abstract Syntax Tree)
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 * Supports LaTeX math: $...$ for inline, $$...$$ for block formulas
 * @param markdown - The markdown text to parse
 * @returns The parsed AST
 */
export function parseMarkdown(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
  const tree = processor.parse(fixCjkEmphasisFlanking(markdown));
  stripZws(tree);
  return tree;
}
