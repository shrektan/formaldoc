import { useRef } from 'react';

export interface PasteSelection {
  start: number;
  end: number;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (html: string, plainText: string, selection: PasteSelection) => string | null;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, onPaste, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPaste) return;

    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    if (html) {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? 0;
      const end = textarea?.selectionEnd ?? 0;

      const markdown = onPaste(html, plainText, { start, end });
      if (markdown !== null) {
        e.preventDefault();

        // Insert at cursor position instead of replacing everything
        const newValue = value.substring(0, start) + markdown + value.substring(end);
        onChange(newValue);

        // Restore cursor position after the inserted content
        if (textarea) {
          requestAnimationFrame(() => {
            const newCursorPos = start + markdown.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          });
        }
      }
    }
  };

  return (
    <div className="editor-container">
      {!value && placeholder && <div className="custom-placeholder">{placeholder}</div>}
      <textarea
        ref={textareaRef}
        className="content-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
      />
    </div>
  );
}
