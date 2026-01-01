import { useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';

interface DocxPreviewProps {
  docxBlob: Blob | null;
}

export function DocxPreview({ docxBlob }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!docxBlob || !containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Render the docx
    renderAsync(docxBlob, containerRef.current, undefined, {
      className: 'docx-preview-content',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: false,
      trimXmlDeclaration: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    }).catch((error) => {
      console.error('Error rendering docx preview:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<p class="preview-error">Preview failed to render</p>';
      }
    });
  }, [docxBlob]);

  if (!docxBlob) {
    return (
      <div className="preview-placeholder">
        <p>Click "Preview" to see the generated document</p>
      </div>
    );
  }

  return <div ref={containerRef} className="docx-preview" />;
}
