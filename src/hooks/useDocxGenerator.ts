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

function extractTitle(markdown: string): string | null {
  // Match first # heading (title)
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) {
    // Clean up the title: remove markdown formatting and trim
    return match[1]
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .trim();
  }
  return null;
}

export function useDocxGenerator(): UseDocxGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (markdown: string, styles: StyleSettings, documentSettings?: DocumentSettings) => {
      if (!markdown.trim()) {
        setError('请输入 Markdown 内容');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const blob = await generateDocx(markdown, styles, documentSettings);

        // Generate filename from title or fallback to timestamp
        const title = extractTitle(markdown);
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
