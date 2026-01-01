interface ToolbarProps {
  onPreview: () => void;
  onDownload: () => void;
  isGenerating: boolean;
  hasPreview: boolean;
  disabled?: boolean;
}

export function Toolbar({
  onPreview,
  onDownload,
  isGenerating,
  hasPreview,
  disabled,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">FormalDoc</h1>
        <span className="app-subtitle">Markdown to Word</span>
      </div>
      <div className="toolbar-right">
        <button className="preview-button" onClick={onPreview} disabled={disabled || isGenerating}>
          {isGenerating ? 'Generating...' : 'Preview'}
        </button>
        <button className="download-button" onClick={onDownload} disabled={disabled || !hasPreview}>
          Download DOCX
        </button>
      </div>
    </div>
  );
}
