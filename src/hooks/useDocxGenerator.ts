import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateDocx } from '../lib/docx/generator';
import type { StyleSettings, DocumentSettings } from '../types/styles';

interface UseDocxGeneratorResult {
  generate: (
    markdown: string,
    styles: StyleSettings,
    documentSettings?: DocumentSettings
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
 * 4. First non-empty line if it looks like a title
 */
function extractTitle(markdown: string): string | null {
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
    async (markdown: string, styles: StyleSettings, documentSettings?: DocumentSettings) => {
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

        // Generate filename from title or fallback to timestamp
        const title = extractTitle(trimmedMarkdown);
        const filename = title
          ? `${title}.docx`
          : `document-${new Date().toISOString().slice(0, 10)}.docx`;

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
