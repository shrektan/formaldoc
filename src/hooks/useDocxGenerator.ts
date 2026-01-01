import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { generateDocx } from '../lib/docx/generator';

interface UseDocxGeneratorResult {
  preview: (markdown: string) => Promise<void>;
  download: () => void;
  previewBlob: Blob | null;
  isGenerating: boolean;
  error: string | null;
}

export function useDocxGenerator(): UseDocxGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const preview = useCallback(async (markdown: string) => {
    if (!markdown.trim()) {
      setError('Please enter some markdown content');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const blob = await generateDocx(markdown);
      setPreviewBlob(blob);
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate document');
      setPreviewBlob(null);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const download = useCallback(() => {
    if (!previewBlob) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `document-${timestamp}.docx`;
    saveAs(previewBlob, filename);
  }, [previewBlob]);

  return { preview, download, previewBlob, isGenerating, error };
}
