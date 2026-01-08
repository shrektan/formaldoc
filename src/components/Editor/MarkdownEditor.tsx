interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (html: string) => string | null;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, onPaste, placeholder }: MarkdownEditorProps) {
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPaste) return;

    const html = e.clipboardData.getData('text/html');
    if (html) {
      const markdown = onPaste(html);
      if (markdown !== null) {
        e.preventDefault();
        onChange(markdown);
      }
    }
  };

  return (
    <div className="editor-container">
      {!value && placeholder && <div className="custom-placeholder">{placeholder}</div>}
      <textarea
        className="content-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
      />
    </div>
  );
}
