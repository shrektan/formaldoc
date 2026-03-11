/**
 * Clean markdown formatting from a string.
 */
function cleanMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/**
 * Sanitize a string for use as a filename.
 */
export function sanitizeFilename(name: string): string {
  let safe = name.replace(/[\n\r]/g, ' ');
  safe = safe.replace(/[/\\:*?"<>|]/g, '_');
  safe = safe.replace(/^[\s.]+|[\s.]+$/g, '');
  safe = safe.replace(/\s+/g, ' ');

  if (safe.length > 200) {
    safe = safe.slice(0, 200);
  }

  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reserved.test(safe)) {
    safe = `${safe}_file`;
  }

  return safe || 'document';
}

function isSuitableTitle(text: string): boolean {
  const cleaned = cleanMarkdownFormatting(text);
  if (cleaned.length > 80) return false;
  if (/[。！？.!?]$/.test(cleaned)) return false;
  return true;
}

/**
 * Extract a title from markdown for default file naming.
 */
export function extractTitle(markdown: string): string | null {
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const title = cleanMarkdownFormatting(h1Match[1]);
    if (isSuitableTitle(title)) return title;
  }

  const h2Match = markdown.match(/^##\s+(.+)$/m);
  if (h2Match) {
    const title = cleanMarkdownFormatting(h2Match[1]);
    if (isSuitableTitle(title)) return title;
  }

  const h3Match = markdown.match(/^###\s+(.+)$/m);
  if (h3Match) {
    const title = cleanMarkdownFormatting(h3Match[1]);
    if (isSuitableTitle(title)) return title;
  }

  const boldMatch = markdown.match(/^\*\*(.+?)\*\*\s*$/m);
  if (boldMatch) {
    const title = cleanMarkdownFormatting(boldMatch[1]);
    if (isSuitableTitle(title)) return title;
  }

  const boldMatch2 = markdown.match(/^__(.+?)__\s*$/m);
  if (boldMatch2) {
    const title = cleanMarkdownFormatting(boldMatch2[1]);
    if (isSuitableTitle(title)) return title;
  }

  const italicMatch = markdown.match(/^(?<!\*)\*([^*]+?)\*(?!\*)\s*$/m);
  if (italicMatch) {
    const title = cleanMarkdownFormatting(italicMatch[1]);
    if (isSuitableTitle(title)) return title;
  }

  const italicMatch2 = markdown.match(/^(?<!_)_([^_]+?)_(?!_)\s*$/m);
  if (italicMatch2) {
    const title = cleanMarkdownFormatting(italicMatch2[1]);
    if (isSuitableTitle(title)) return title;
  }

  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^[-=*_]{3,}$/.test(trimmed) || /^[>|`]/.test(trimmed)) {
      continue;
    }

    const content = trimmed.replace(/^#+\s*/, '');
    const cleaned = cleanMarkdownFormatting(content);
    if (cleaned && isSuitableTitle(cleaned)) {
      return cleaned;
    }

    break;
  }

  return null;
}
