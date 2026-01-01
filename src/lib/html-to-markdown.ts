import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx', // Use # ## ### format
  bulletListMarker: '-',
});

/**
 * Converts HTML to Markdown
 * Used when pasting from AI chatbots (豆包, ChatGPT, etc.) that render markdown visually
 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}
