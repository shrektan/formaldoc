interface ToolbarProps {
  onGenerate: () => void;
  onOpenSettings: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function Toolbar({ onGenerate, onOpenSettings, isGenerating, disabled }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">公文排版</h1>
        <span className="app-subtitle">Markdown 转 Word</span>
      </div>
      <div className="toolbar-right">
        <button className="settings-button" onClick={onOpenSettings} aria-label="样式设置">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </button>
        <button
          className="generate-button"
          onClick={onGenerate}
          disabled={disabled || isGenerating}
        >
          {isGenerating ? '生成中...' : '生成 DOCX'}
        </button>
      </div>
    </div>
  );
}
