interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (html: string, plainText: string) => string | null;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, onPaste, placeholder }: MarkdownEditorProps) {
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPaste) return;

    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    if (html) {
      const markdown = onPaste(html, plainText);
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
