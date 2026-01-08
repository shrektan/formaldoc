import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateDocx } from '../lib/docx/generator';
import type { StyleSettings, DocumentSettings } from '../types/styles';

interface UseDocxGeneratorResult {
  generate: (
    markdown: string,
    styles: StyleSettings,
    documentSettings?: DocumentSettings,
    customFilename?: string
  ) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

/**
 * Clean markdown formatting from a string
 */
function cleanMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .trim();
}

/**
 * Sanitize a string for use as a filename
 * Replaces invalid characters and truncates if too long
 */
export function sanitizeFilename(name: string): string {
  // Remove newlines first (replace with space)
  let safe = name.replace(/[\n\r]/g, ' ');

  // Replace invalid filename characters with underscore
  // Invalid on Windows/Mac/Linux: / \ : * ? " < > |
  safe = safe.replace(/[/\\:*?"<>|]/g, '_');

  // Remove leading/trailing dots and spaces
  safe = safe.replace(/^[\s.]+|[\s.]+$/g, '');

  // Collapse multiple spaces into one
  safe = safe.replace(/\s+/g, ' ');

  // Truncate to 200 chars (leave room for .docx extension)
  if (safe.length > 200) {
    safe = safe.slice(0, 200);
  }

  // Handle Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reserved.test(safe)) {
    safe = `${safe}_file`;
  }

  // Fallback if empty after sanitization
  return safe || 'document';
}

/**
 * Check if text is suitable as a title (not too long, not a full sentence)
 */
function isSuitableTitle(text: string): boolean {
  const cleaned = cleanMarkdownFormatting(text);
  // Title should be reasonably short (under 50 chars is ideal, under 80 is acceptable)
  if (cleaned.length > 80) return false;
  // Title shouldn't end with sentence-ending punctuation (likely a full sentence)
  if (/[。！？.!?]$/.test(cleaned)) return false;
  return true;
}

/**
 * Extract title from markdown with smart fallback logic:
 * 1. First H1 heading (#)
 * 2. First H2 heading (##)
 * 3. First H3 heading (###)
 * 4. First line that is entirely bold (**text**)
 * 5. First line that is entirely italic (*text*)
 * 6. First non-empty line if it looks like a title
 */
export function extractTitle(markdown: string): string | null {
  // Try H1 first
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const title = cleanMarkdownFormatting(h1Match[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Try H2
  const h2Match = markdown.match(/^##\s+(.+)$/m);
  if (h2Match) {
    const title = cleanMarkdownFormatting(h2Match[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Try H3
  const h3Match = markdown.match(/^###\s+(.+)$/m);
  if (h3Match) {
    const title = cleanMarkdownFormatting(h3Match[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Try first line with bold formatting (entire line is bold)
  // Match: **text** or __text__ at the start of a line
  const boldMatch = markdown.match(/^\*\*(.+?)\*\*\s*$/m);
  if (boldMatch) {
    const title = cleanMarkdownFormatting(boldMatch[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Also try underscores for bold: __text__
  const boldMatch2 = markdown.match(/^__(.+?)__\s*$/m);
  if (boldMatch2) {
    const title = cleanMarkdownFormatting(boldMatch2[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Try first line with italic formatting (entire line is italic)
  // Match: *text* or _text_ at the start of a line (but not ** or __)
  const italicMatch = markdown.match(/^(?<!\*)\*([^*]+?)\*(?!\*)\s*$/m);
  if (italicMatch) {
    const title = cleanMarkdownFormatting(italicMatch[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Also try underscore for italic: _text_
  const italicMatch2 = markdown.match(/^(?<!_)_([^_]+?)_(?!_)\s*$/m);
  if (italicMatch2) {
    const title = cleanMarkdownFormatting(italicMatch2[1]);
    if (isSuitableTitle(title)) return title;
  }

  // Fallback: use first non-empty line if it looks like a title
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines, horizontal rules, and lines starting with special chars
    if (!trimmed || /^[-=*_]{3,}$/.test(trimmed) || /^[>|`]/.test(trimmed)) {
      continue;
    }
    // Remove any leading # symbols (already tried headings above)
    const content = trimmed.replace(/^#+\s*/, '');
    const cleaned = cleanMarkdownFormatting(content);
    if (cleaned && isSuitableTitle(cleaned)) {
      return cleaned;
    }
    // Only check the first meaningful line
    break;
  }

  return null;
}

export function useDocxGenerator(): UseDocxGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      markdown: string,
      styles: StyleSettings,
      documentSettings?: DocumentSettings,
      customFilename?: string
    ) => {
      // Auto-trim leading/trailing whitespace and empty lines
      const trimmedMarkdown = markdown.trim();

      if (!trimmedMarkdown) {
        setError('请输入 Markdown 内容');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const blob = await generateDocx(trimmedMarkdown, styles, documentSettings);

        // Use custom filename if provided, otherwise auto-detect from title
        let filename: string;
        if (customFilename && customFilename.trim()) {
          filename = `${sanitizeFilename(customFilename)}.docx`;
        } else {
          const title = extractTitle(trimmedMarkdown);
          filename = title
            ? `${sanitizeFilename(title)}.docx`
            : `document-${new Date().toISOString().slice(0, 10)}.docx`;
        }

        saveAs(blob, filename);
      } catch (err) {
        console.error('Error generating document:', err);
        setError(err instanceof Error ? err.message : '生成文档失败');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generate, isGenerating, error };
}
