interface ToolbarProps {
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function Toolbar({ onGenerate, isGenerating, disabled }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">FormalDoc</h1>
        <span className="app-subtitle">Markdown to Word</span>
      </div>
      <div className="toolbar-right">
        <button
          className="generate-button"
          onClick={onGenerate}
          disabled={disabled || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate DOCX'}
        </button>
      </div>
    </div>
  );
}
