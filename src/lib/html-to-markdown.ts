import TurndownService from 'turndown';
// @ts-expect-error turndown-plugin-gfm has no type definitions
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx', // Use # ## ### format
  bulletListMarker: '-',
});

// Add GFM plugin for table support
turndown.use(gfm);

/**
 * Converts HTML to Markdown
 * Used when pasting from AI chatbots (豆包, ChatGPT, etc.) that render markdown visually
 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}
