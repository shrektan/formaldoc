import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateDocx } from '../lib/docx/generator';

interface UseDocxGeneratorResult {
  generate: (markdown: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function useDocxGenerator(): UseDocxGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (markdown: string) => {
    if (!markdown.trim()) {
      setError('Please enter some markdown content');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const blob = await generateDocx(markdown);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `document-${timestamp}.docx`;

      saveAs(blob, filename);
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating, error };
}
