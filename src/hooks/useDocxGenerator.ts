import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateDocx } from '../lib/docx/generator';
import type { StyleSettings } from '../types/styles';

interface UseDocxGeneratorResult {
  generate: (markdown: string, styles: StyleSettings) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function useDocxGenerator(): UseDocxGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (markdown: string, styles: StyleSettings) => {
    if (!markdown.trim()) {
      setError('请输入 Markdown 内容');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const blob = await generateDocx(markdown, styles);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `document-${timestamp}.docx`;

      saveAs(blob, filename);
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err instanceof Error ? err.message : '生成文档失败');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating, error };
}
