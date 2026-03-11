import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateDocx } from '../lib/docx/generator';
import { extractTitle, sanitizeFilename } from '../lib/filename';
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
